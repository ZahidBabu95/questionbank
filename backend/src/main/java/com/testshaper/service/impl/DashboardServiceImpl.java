package com.testshaper.service.impl;

import com.testshaper.dto.DashboardStatsDTO;
import com.testshaper.entity.AcademicClass;
import com.testshaper.entity.Question;
import com.testshaper.entity.SourceBookMaster;
import com.testshaper.entity.User;
import com.testshaper.repository.ExamRepository;
import com.testshaper.repository.InstituteRepository;
import com.testshaper.repository.QuestionRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

        @org.springframework.beans.factory.annotation.Autowired
        @org.springframework.context.annotation.Lazy
        private UserRepository userRepository;

        @org.springframework.beans.factory.annotation.Autowired
        @org.springframework.context.annotation.Lazy
        private InstituteRepository instituteRepository;

        @org.springframework.beans.factory.annotation.Autowired
        @org.springframework.context.annotation.Lazy
        private QuestionRepository questionRepository;

        @org.springframework.beans.factory.annotation.Autowired
        @org.springframework.context.annotation.Lazy
        private ExamRepository examRepository;

        @org.springframework.beans.factory.annotation.Autowired
        @org.springframework.context.annotation.Lazy
        private com.testshaper.repository.SourceBookMasterRepository sourceBookMasterRepository;

        @org.springframework.beans.factory.annotation.Autowired
        @org.springframework.context.annotation.Lazy
        private com.testshaper.repository.AcademicClassRepository academicClassRepository;

        @org.springframework.beans.factory.annotation.Autowired
        @org.springframework.context.annotation.Lazy
        private com.testshaper.repository.ClassSubjectRepository classSubjectRepository;


        private long getApprovedQuestionsCountForUser(User currentUser) {
                if (currentUser == null) return 0;
                
                // Super Admin check
                boolean isSuperAdmin = currentUser.getRoles().stream()
                        .anyMatch(r -> r.getName().equals("SUPER_ADMIN") || r.getName().equals("ROLE_SUPER_ADMIN")) 
                        || "admin".equalsIgnoreCase(currentUser.getEmail());
                
                if (isSuperAdmin) {
                        return questionRepository.countApprovedQuestions();
                }
                
                if (currentUser.getInstitute() != null) {
                        java.util.Set<com.testshaper.entity.ClassSubject> assignedSubjects = currentUser.getInstitute().getAssignedSubjects();
                        if (assignedSubjects != null && !assignedSubjects.isEmpty()) {
                                java.util.List<UUID> subjectIds = assignedSubjects.stream()
                                                .map(com.testshaper.entity.ClassSubject::getId)
                                                .collect(Collectors.toList());
                                return questionRepository.countApprovedQuestionsForSubjects(subjectIds);
                        } else {
                                return questionRepository.countApprovedQuestionsForTenant(currentUser.getInstitute().getCode());
                        }
                }
                return 0;
        }

        @Override
        public DashboardStatsDTO getAdminDashboardStats() {
                User currentUser = getCurrentUser();
                long totalUsers = userRepository.count();
                long totalInstitutes = instituteRepository.count();
                long totalQuestions = questionRepository.count();
                long totalExams = examRepository.count();
                
                long approvedQuestionsCount = getApprovedQuestionsCountForUser(currentUser);
                long globalQuestionsCount = questionRepository.count();
                
                return buildFullStats(totalUsers, totalInstitutes, totalQuestions, totalExams, null, null, approvedQuestionsCount, globalQuestionsCount);
        }

        @Override
        public DashboardStatsDTO getInstituteDashboardStats() {
                User currentUser = getCurrentUser();
                if (currentUser == null || currentUser.getInstitute() == null) {
                        return getEmptyStats();
                }
                UUID instituteId = currentUser.getInstitute().getId();
                String tenantId = currentUser.getInstitute().getCode();

                long totalUsers = userRepository.countByInstituteId(instituteId);
                long totalQuestions = questionRepository.countByTenantId(tenantId);
                long totalExams = examRepository.countByTenantId(tenantId);

                long approvedQuestionsCount = getApprovedQuestionsCountForUser(currentUser);
                long globalQuestionsCount = questionRepository.count();

                return buildFullStats(totalUsers, 1, totalQuestions, totalExams, tenantId, null, approvedQuestionsCount, globalQuestionsCount);
        }

        @Override
        public DashboardStatsDTO getTeacherDashboardStats() {
                User currentUser = getCurrentUser();
                if (currentUser == null) {
                        return getEmptyStats();
                }
                String creatorEmail = currentUser.getEmail();
                String tenantId = (currentUser.getInstitute() != null) ? currentUser.getInstitute().getCode() : null;
                long myQuestions = questionRepository.countByCreatedBy(creatorEmail);
                long myExams = examRepository.countByCreatedBy(creatorEmail);

                long approvedQuestionsCount = getApprovedQuestionsCountForUser(currentUser);
                long globalQuestionsCount = questionRepository.count();

                return buildFullStats(0, 0, myQuestions, myExams, tenantId, creatorEmail, approvedQuestionsCount, globalQuestionsCount);
        }

        @Override
        public DashboardStatsDTO getStudentDashboardStats() {
                User currentUser = getCurrentUser();
                long approvedQuestionsCount = getApprovedQuestionsCountForUser(currentUser);
                long globalQuestionsCount = questionRepository.count();
                return buildFullStats(0, 0, 0, 0, null, null, approvedQuestionsCount, globalQuestionsCount);
        }

        private User getCurrentUser() {
                String email = SecurityContextHolder.getContext().getAuthentication().getName();
                return userRepository.findByEmail(email).orElse(null);
        }

        private DashboardStatsDTO getEmptyStats() {
                return DashboardStatsDTO.builder()
                                .questionTypes(new ArrayList<>())
                                .activityAnalytics(new ArrayList<>())
                                .recentActivities(new ArrayList<>())
                                .build();
        }

        private DashboardStatsDTO buildFullStats(long users, long institutes, long questions, long exams, String tenantId, String creatorEmail, long approvedQuestionsCount, long globalQuestionsCount) {
                // Map question types
                List<Object[]> typeCounts;
                if (creatorEmail != null) {
                        typeCounts = questionRepository.countQuestionsByTypeForCreator(creatorEmail);
                } else if (tenantId != null) {
                        typeCounts = questionRepository.countQuestionsByTypeForTenant(tenantId);
                } else {
                        typeCounts = questionRepository.countQuestionsByType();
                }
                long mcqCount = 0, cqCount = 0, shortCount = 0, otherCount = 0;

                for (Object[] result : typeCounts) {
                        String type = (String) result[0];
                        long count = ((Number) result[1]).longValue();
                        if (type.equals(Question.QuestionType.MCQ.name()))
                                mcqCount += count;
                        else if (type.equals(Question.QuestionType.CQ.name()))
                                cqCount += count;
                        else if (type.equals(Question.QuestionType.SHORT.name()))
                                shortCount += count;
                        else
                                otherCount += count;
                }

                List<DashboardStatsDTO.QuestionTypeStat> questionTypes = new ArrayList<>();
                if (questions > 0) {
                        questionTypes.add(DashboardStatsDTO.QuestionTypeStat.builder().name("MCQ")
                                        .value((mcqCount * 100) / questions).color("#3b82f6").build());
                        questionTypes.add(DashboardStatsDTO.QuestionTypeStat.builder().name("CQ")
                                        .value((cqCount * 100) / questions).color("#6366f1").build());
                        questionTypes.add(DashboardStatsDTO.QuestionTypeStat.builder().name("Short")
                                        .value((shortCount * 100) / questions).color("#8b5cf6").build());
                        questionTypes.add(DashboardStatsDTO.QuestionTypeStat.builder().name("Other")
                                        .value((otherCount * 100) / questions).color("#cbd5e1").build());
                }

                Page<Question> recentQuestions;
                if (creatorEmail != null) {
                        recentQuestions = questionRepository.findByCreatedByAndDeletedFalse(creatorEmail, PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")));
                } else if (tenantId != null) {
                        recentQuestions = questionRepository.findByTenantIdAndDeletedFalse(tenantId, PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")));
                } else {
                        recentQuestions = questionRepository.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")));
                }

                List<DashboardStatsDTO.RecentActivity> activities = recentQuestions.getContent().stream().map(q -> {
                        boolean hasSubject = q.getClassSubject() != null && q.getClassSubject().getSubject() != null;
                        String subjectName = hasSubject ? q.getClassSubject().getSubject().getName()
                                        : "Unknown Subject";
                        String userName = (q.getCreatedBy() != null) ? q.getCreatedBy() : "System";
                        String userInitials = userName.substring(0, Math.min(userName.length(), 2)).toUpperCase();

                        return DashboardStatsDTO.RecentActivity.builder()
                                        .id(q.getId().toString().substring(0, 8))
                                        .user(userName).avatar(userInitials)
                                        .action("Added " + q.getType() + " for " + subjectName)
                                        .status(q.getStatus() != null ? q.getStatus().name() : "PENDING")
                                        .time(q.getCreatedAt() != null ? q.getCreatedAt() : LocalDateTime.now())
                                        .build();
                }).collect(Collectors.toList());

                List<DashboardStatsDTO.ActivityStat> activityTrend = new ArrayList<>();
                for (int i = 5; i >= 0; i--) {
                        LocalDateTime start = LocalDateTime.now().minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
                        LocalDateTime end = start.plusMonths(1).minusSeconds(1);
                        String monthName = start.getMonth().name().substring(0, 3);
                        
                        long qCount = 0;
                        long eCount = 0;
                        
                        if (creatorEmail != null) {
                                qCount = questionRepository.countByCreatedByAndCreatedAtBetween(creatorEmail, start, end);
                                eCount = examRepository.countByCreatedByAndCreatedAtBetween(creatorEmail, start, end);
                        } else if (tenantId != null) {
                                qCount = questionRepository.countByTenantIdAndCreatedAtBetween(tenantId, start, end);
                                eCount = examRepository.countByTenantIdAndCreatedAtBetween(tenantId, start, end);
                        } else {
                                qCount = questionRepository.countByCreatedAtBetween(start, end);
                                eCount = examRepository.countByCreatedAtBetween(start, end);
                        }
                        
                        activityTrend.add(DashboardStatsDTO.ActivityStat.builder().name(monthName).questions((int) qCount).exams((int) eCount).build());
                }

                User currentUser = getCurrentUser();
                List<Object[]> subjectQueryResults = new ArrayList<>();
                if (currentUser != null) {
                        boolean isSuperAdmin = currentUser.getRoles().stream()
                                .anyMatch(r -> r.getName().equals("SUPER_ADMIN") || r.getName().equals("ROLE_SUPER_ADMIN")) 
                                || "admin".equalsIgnoreCase(currentUser.getEmail());
                        if (isSuperAdmin) {
                                subjectQueryResults = questionRepository.countApprovedQuestionsGroupedBySubject();
                        } else if (currentUser.getInstitute() != null) {
                                java.util.Set<com.testshaper.entity.ClassSubject> assignedSubjects = currentUser.getInstitute().getAssignedSubjects();
                                if (assignedSubjects != null && !assignedSubjects.isEmpty()) {
                                        java.util.List<UUID> subjectIds = assignedSubjects.stream()
                                                        .map(com.testshaper.entity.ClassSubject::getId)
                                                        .collect(Collectors.toList());
                                        subjectQueryResults = questionRepository.countApprovedQuestionsGroupedBySubjectForSubjectIds(subjectIds);
                                } else {
                                        subjectQueryResults = questionRepository.countApprovedQuestionsGroupedBySubjectForTenant(currentUser.getInstitute().getCode());
                                }
                        }
                }

                List<DashboardStatsDTO.SubjectQuestionStat> subjectQuestions = subjectQueryResults.stream().map(result -> {
                        String name = (result[0] != null) ? (String) result[0] : "Unassigned";
                        String className = (result[1] != null) ? (String) result[1] : "Unknown Class";
                        String levelName = (result[2] != null) ? (String) result[2] : "Unknown Level";
                        Boolean isEng = (result[3] != null) ? (Boolean) result[3] : false;
                        String version = isEng ? "English Version" : "Bangla Version";
                        long count = ((Number) result[4]).longValue();
                        return DashboardStatsDTO.SubjectQuestionStat.builder()
                                        .subjectName(name)
                                        .className(className)
                                        .levelName(levelName)
                                        .version(version)
                                        .count(count)
                                        .build();
                }).collect(Collectors.toList());

                // Class and Book stats calculations
                List<AcademicClass> allClasses = academicClassRepository.findAll();
                allClasses.sort(java.util.Comparator.comparing(AcademicClass::getOrder, java.util.Comparator.nullsLast(Integer::compareTo)));

                List<SourceBookMaster> allBooks = sourceBookMasterRepository.findAllWithIndicesAndClassSubject();

                java.util.Map<UUID, Long> classSubjectQuestionCounts = new java.util.HashMap<>();
                for (Object[] row : questionRepository.countApprovedQuestionsGroupedByClassSubjectId()) {
                        if (row[0] != null) {
                                classSubjectQuestionCounts.put((UUID) row[0], ((Number) row[1]).longValue());
                        }
                }

                java.util.Map<UUID, Long> chapterQuestionCounts = new java.util.HashMap<>();
                for (Object[] row : questionRepository.countApprovedQuestionsGroupedByChapterId()) {
                        if (row[0] != null) {
                                chapterQuestionCounts.put((UUID) row[0], ((Number) row[1]).longValue());
                        }
                }

                java.util.Set<UUID> allowedClassSubjectIds = null;
                boolean isSuperAdmin = false;
                if (currentUser != null) {
                        isSuperAdmin = currentUser.getRoles().stream()
                                        .anyMatch(r -> r.getName().equals("SUPER_ADMIN") || r.getName().equals("ROLE_SUPER_ADMIN"))
                                        || "admin".equalsIgnoreCase(currentUser.getEmail());
                        
                        if (!isSuperAdmin && currentUser.getInstitute() != null) {
                                java.util.Set<com.testshaper.entity.ClassSubject> assigned = currentUser.getInstitute().getAssignedSubjects();
                                if (assigned != null && !assigned.isEmpty()) {
                                        allowedClassSubjectIds = assigned.stream()
                                                        .map(com.testshaper.entity.ClassSubject::getId)
                                                        .collect(Collectors.toSet());
                                }
                        }
                }

                // Pre-calculate books count by ClassSubject ID to avoid O(N^2) inner loops
                java.util.Map<UUID, Long> booksCountByClassSubjectId = new java.util.HashMap<>();
                for (SourceBookMaster b : allBooks) {
                        if (b.getClassSubject() != null) {
                                UUID csId = b.getClassSubject().getId();
                                booksCountByClassSubjectId.put(csId, booksCountByClassSubjectId.getOrDefault(csId, 0L) + 1);
                        }
                }

                // Pre-group books by AcademicClass ID to avoid O(N^2) class-book loops
                java.util.Map<UUID, List<SourceBookMaster>> booksByClassId = new java.util.HashMap<>();
                for (SourceBookMaster book : allBooks) {
                        if (book.getClassSubject() != null && book.getClassSubject().getAcademicClass() != null) {
                                UUID classId = book.getClassSubject().getAcademicClass().getId();
                                booksByClassId.computeIfAbsent(classId, k -> new ArrayList<>()).add(book);
                        }
                }

                List<DashboardStatsDTO.ClassStats> classStatsList = new ArrayList<>();

                for (AcademicClass ac : allClasses) {
                        List<DashboardStatsDTO.BookStats> bookStatsList = new ArrayList<>();
                        long totalClassQuestions = 0;
                        long booksWithQuestions = 0;
                        long booksWithoutQuestions = 0;
                        long totalBooks = 0;

                        List<SourceBookMaster> classBooks = booksByClassId.getOrDefault(ac.getId(), java.util.Collections.emptyList());

                        for (SourceBookMaster book : classBooks) {
                                if (allowedClassSubjectIds != null && !allowedClassSubjectIds.contains(book.getClassSubject().getId())) {
                                        continue;
                                }

                                totalBooks++;

                                long bookQuestionCount = 0;
                                boolean hasSpecificChapters = false;
                                
                                if (book.getIndices() != null && !book.getIndices().isEmpty()) {
                                        for (com.testshaper.entity.SourceBookIndex idx : book.getIndices()) {
                                                if (idx.getMappedChapter() != null) {
                                                        hasSpecificChapters = true;
                                                        UUID chapId = idx.getMappedChapter().getId();
                                                        bookQuestionCount += chapterQuestionCounts.getOrDefault(chapId, 0L);
                                                }
                                        }
                                }

                                if (!hasSpecificChapters || bookQuestionCount == 0) {
                                        long classSubCount = classSubjectQuestionCounts.getOrDefault(book.getClassSubject().getId(), 0L);
                                        long booksInSubject = booksCountByClassSubjectId.getOrDefault(book.getClassSubject().getId(), 0L);
                                        if (booksInSubject <= 1) {
                                                bookQuestionCount = classSubCount;
                                        } else {
                                                bookQuestionCount = classSubCount / booksInSubject;
                                        }
                                }

                                totalClassQuestions += bookQuestionCount;

                                if (bookQuestionCount > 0) {
                                        booksWithQuestions++;
                                } else {
                                        booksWithoutQuestions++;
                                }

                                String subjectName = book.getClassSubject().getSubject() != null ? book.getClassSubject().getSubject().getName() : "Unassigned";
                                String bookTypeName = book.getBookType() != null ? book.getBookType().name() : "TEXTBOOK";

                                bookStatsList.add(DashboardStatsDTO.BookStats.builder()
                                                .bookId(book.getId().toString())
                                                .title(book.getTitle())
                                                .subjectName(subjectName)
                                                .bookType(bookTypeName)
                                                .questionCount(bookQuestionCount)
                                                .status(bookQuestionCount > 0 ? "ACTIVE" : "NOT_STARTED")
                                                .build());
                        }

                        if (totalBooks == 0 && allowedClassSubjectIds != null) {
                                continue;
                        }

                        String streamId = (ac.getStream() != null) ? ac.getStream().getId().toString() : "";
                        String streamName = (ac.getStream() != null) ? ac.getStream().getName() : "General";
                        String levelId = (ac.getStream() != null && ac.getStream().getLevel() != null) ? ac.getStream().getLevel().getId().toString() : "";
                        String levelName = (ac.getStream() != null && ac.getStream().getLevel() != null) ? ac.getStream().getLevel().getName() : "General";

                        classStatsList.add(DashboardStatsDTO.ClassStats.builder()
                                        .classId(ac.getId().toString())
                                        .className(ac.getName())
                                        .levelId(levelId)
                                        .levelName(levelName)
                                        .streamId(streamId)
                                        .streamName(streamName)
                                        .totalBooks(totalBooks)
                                        .booksWithQuestions(booksWithQuestions)
                                        .booksWithoutQuestions(booksWithoutQuestions)
                                        .totalQuestions(totalClassQuestions)
                                        .books(bookStatsList)
                                        .build());
                }

                return DashboardStatsDTO.builder()
                                .totalUsers(users).userTrend(5.0)
                                .activeInstitutes(institutes).instituteTrend(2.0)
                                .totalQuestions(questions).questionTrend(10.0)
                                .examsConducted(exams).examTrend(15.0)
                                .approvedQuestionsCount(approvedQuestionsCount)
                                .globalQuestionsCount(globalQuestionsCount)
                                .questionTypes(questionTypes)
                                .activityAnalytics(activityTrend)
                                .recentActivities(activities)
                                .subjectQuestions(subjectQuestions)
                                .classStats(classStatsList)
                                .build();

        }
}
