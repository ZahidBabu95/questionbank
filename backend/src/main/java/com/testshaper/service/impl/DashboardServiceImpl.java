package com.testshaper.service.impl;

import com.testshaper.dto.DashboardStatsDTO;
import com.testshaper.entity.Question;
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

        @Override
        public DashboardStatsDTO getAdminDashboardStats() {
                long totalUsers = userRepository.count();
                long totalInstitutes = instituteRepository.count();
                long totalQuestions = questionRepository.count();
                long totalExams = examRepository.count();
                return buildFullStats(totalUsers, totalInstitutes, totalQuestions, totalExams);
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

                return buildFullStats(totalUsers, 1, totalQuestions, totalExams);
        }

        @Override
        public DashboardStatsDTO getTeacherDashboardStats() {
                User currentUser = getCurrentUser();
                if (currentUser == null) {
                        return getEmptyStats();
                }
                String creatorEmail = currentUser.getEmail();
                long myQuestions = questionRepository.countByCreatedBy(creatorEmail);
                long myExams = examRepository.countByCreatedBy(creatorEmail);
                return buildFullStats(0, 0, myQuestions, myExams);
        }

        @Override
        public DashboardStatsDTO getStudentDashboardStats() {
                return buildFullStats(0, 0, 0, 0);
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

        private DashboardStatsDTO buildFullStats(long users, long institutes, long questions, long exams) {
                // Map question types
                List<Object[]> typeCounts = questionRepository.countQuestionsByType();
                long mcqCount = 0, cqCount = 0, shortCount = 0, otherCount = 0;

                for (Object[] result : typeCounts) {
                        Question.QuestionType type = (Question.QuestionType) result[0];
                        long count = ((Number) result[1]).longValue();
                        if (type == Question.QuestionType.MCQ)
                                mcqCount += count;
                        else if (type == Question.QuestionType.CQ)
                                cqCount += count;
                        else if (type == Question.QuestionType.SHORT)
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

                // Recent Activities
                Page<Question> recentQuestions = questionRepository
                                .findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")));
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
                activityTrend.add(DashboardStatsDTO.ActivityStat.builder().name("Jan").questions(10).exams(5).build());
                activityTrend.add(DashboardStatsDTO.ActivityStat.builder().name("Feb").questions(20).exams(8).build());
                activityTrend.add(DashboardStatsDTO.ActivityStat.builder().name("Mar").questions((int) questions)
                                .exams((int) exams).build());

                return DashboardStatsDTO.builder()
                                .totalUsers(users).userTrend(5.0)
                                .activeInstitutes(institutes).instituteTrend(2.0)
                                .totalQuestions(questions).questionTrend(10.0)
                                .examsConducted(exams).examTrend(15.0)
                                .questionTypes(questionTypes)
                                .activityAnalytics(activityTrend)
                                .recentActivities(activities)
                                .build();
        }
}
