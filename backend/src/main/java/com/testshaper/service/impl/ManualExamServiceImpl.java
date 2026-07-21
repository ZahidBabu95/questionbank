package com.testshaper.service.impl;

import com.testshaper.dto.*;
import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ManualExamServiceImpl {

    private final ExamRepository examRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final ExamSectionRepository examSectionRepository;
    private final QuestionRepository questionRepository;
    private final ClassSubjectRepository classSubjectRepository;
    private final QuestionFavoriteRepository favoriteRepository;
    private final UserRepository userRepository;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    // ── Create Manual Exam (draft, no questions yet) ──────────────────────────
    @Transactional
    public ExamDTO createExam(ManualExamRequest req, String createdBy) {
        ClassSubject classSubject = classSubjectRepository.findById(req.getClassSubjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ClassSubject not found"));

        Exam exam = new Exam();
        exam.setTitle(req.getTitle());
        exam.setExamType(req.getExamType());
        exam.setClassSubject(classSubject);
        exam.setDurationMinutes(req.getDurationMinutes());
        exam.setTotalMarks(req.getTotalMarks());
        exam.setTotalQuestions(0);
        exam.setLanguage(req.getLanguage());
        exam.setInstructions(req.getInstructions());
        exam.setInstituteName(req.getInstituteName());
        exam.setHeaderText(req.getHeaderText());
        exam.setShuffleQuestions(req.isShuffleQuestions());
        exam.setShuffleOptions(req.isShuffleOptions());
        exam.setStatus(Exam.ExamStatus.DRAFT);
        exam.setManual(true);
        exam.setCreatedBy(createdBy);

        if (req.getEditorMode() != null) {
            try {
                exam.setEditorMode(ExamEditorMode.valueOf(req.getEditorMode()));
            } catch (Exception ignored) {}
        }
        exam.setRawContent(req.getRawContent());
        exam.setDocSettingsJson(req.getDocSettingsJson());

        // Create sections
        int sectionOrder = 1;
        for (ManualExamRequest.SectionRequest sr : req.getSections()) {
            ExamSection section = new ExamSection();
            section.setExam(exam);
            section.setSectionName(sr.getSectionName());
            section.setSectionOrder(sr.getSectionOrder() != null ? sr.getSectionOrder() : sectionOrder++);
            section.setInstructions(sr.getInstructions());
            exam.getExamSections().add(section);
        }

        Exam saved = examRepository.save(exam);
        log.info("Manual exam created: id={} by={}", saved.getId(), createdBy);
        
        // Mark used questions as favorites
        saveFavoritesFromRawContent(req.getRawContent(), createdBy);
        
        return toDTO(saved);
    }

    // ── Update Exam Metadata ──────────────────────────────────────────────────
    @Transactional
    public ExamDTO updateExam(UUID examId, ManualExamRequest req) {
        Exam exam = getExamOrThrow(examId);

        exam.setTitle(req.getTitle());
        exam.setExamType(req.getExamType());
        exam.setDurationMinutes(req.getDurationMinutes());
        exam.setTotalMarks(req.getTotalMarks());
        exam.setLanguage(req.getLanguage());
        exam.setInstructions(req.getInstructions());
        exam.setInstituteName(req.getInstituteName());
        exam.setHeaderText(req.getHeaderText());
        exam.setShuffleQuestions(req.isShuffleQuestions());
        exam.setShuffleOptions(req.isShuffleOptions());

        if (req.getEditorMode() != null) {
            try {
                exam.setEditorMode(ExamEditorMode.valueOf(req.getEditorMode()));
            } catch (Exception ignored) {}
        }
        if (req.getRawContent() != null) {
            exam.setRawContent(req.getRawContent());
        }
        if (req.getDocSettingsJson() != null) {
            exam.setDocSettingsJson(req.getDocSettingsJson());
        }

        // Mark used questions as favorites for the currently authenticated user
        String currentUser = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        saveFavoritesFromRawContent(req.getRawContent(), currentUser);

        return toDTO(examRepository.save(exam));
    }

    // ── Add Question to Exam ──────────────────────────────────────────────────
    @Transactional
    public ExamDTO addQuestion(UUID examId, AddQuestionRequest req) {
        Exam exam = getExamOrThrow(examId);

        // Duplicate check
        if (examQuestionRepository.existsByExamIdAndQuestionId(examId, req.getQuestionId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Question already added to this exam");
        }

        // Fetch question (tenant-safe, approved-only)
        Question question = questionRepository.findById(req.getQuestionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        String currentTenant = TenantContext.getTenantId();
        if (question.getStatus() != Question.QuestionStatus.APPROVED &&
            !question.getTenantId().equals(currentTenant) && 
            !"DEFAULT".equals(currentTenant) && 
            !"DEFAULT".equals(question.getTenantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cross-tenant access denied");
        }
        if (question.getStatus() != Question.QuestionStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only APPROVED questions can be added");
        }

        // Get max order
        int nextOrder = examQuestionRepository.countByExamId(examId) + 1;

        ExamQuestion eq = new ExamQuestion();
        eq.setExam(exam);
        eq.setQuestion(question);
        eq.setMarks(req.getMarks());
        eq.setQuestionOrder(nextOrder);

        if (req.getSectionId() != null) {
            ExamSection section = examSectionRepository.findById(req.getSectionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Section not found"));
            if (!section.getExam().getId().equals(examId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Section does not belong to this exam");
            }
            eq.setSection(section);
        }

        examQuestionRepository.save(eq);

        // Update totalQuestions on exam
        exam.setTotalQuestions(examQuestionRepository.countByExamId(examId));
        examRepository.save(exam);

        // Mark as favorite for the currently authenticated user
        String currentUser = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByEmail(currentUser).ifPresent(user -> {
            if (!favoriteRepository.existsByQuestionAndUser(question, user)) {
                QuestionFavorite fav = new QuestionFavorite();
                fav.setQuestion(question);
                fav.setUser(user);
                favoriteRepository.save(fav);
            }
        });

        log.info("Question {} added to exam {}", question.getId(), examId);
        return toDTO(getExamOrThrow(examId));
    }

    // ── Remove Question from Exam ─────────────────────────────────────────────
    @Transactional
    public ExamDTO removeQuestion(UUID examId, UUID questionId) {
        Exam exam = getExamOrThrow(examId);

        if (!examQuestionRepository.existsByExamIdAndQuestionId(examId, questionId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not in this exam");
        }

        examQuestionRepository.deleteByExamIdAndQuestionId(examId, questionId);

        // Reorder remaining
        List<ExamQuestion> remaining = examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(examId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setQuestionOrder(i + 1);
        }
        examQuestionRepository.saveAll(remaining);

        exam.setTotalQuestions(remaining.size());
        examRepository.save(exam);

        log.info("Question {} removed from exam {}", questionId, examId);
        return toDTO(getExamOrThrow(examId));
    }

    // ── Reorder Questions ─────────────────────────────────────────────────────
    @Transactional
    public ExamDTO reorderQuestions(UUID examId, ReorderRequest req) {
        // Validate permissions first
        getExamOrThrow(examId);
        
        List<ExamQuestion> examQuestions = examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(examId);
        Map<UUID, ExamQuestion> byId = examQuestions.stream()
                .collect(Collectors.toMap(ExamQuestion::getId, e -> e));

        for (int i = 0; i < req.getOrderedQuestionIds().size(); i++) {
            UUID eqId = req.getOrderedQuestionIds().get(i);
            ExamQuestion eq = byId.get(eqId);
            if (eq != null)
                eq.setQuestionOrder(i + 1);
        }
        examQuestionRepository.saveAll(examQuestions);
        return toDTO(getExamOrThrow(examId));
    }

    // ── Publish Exam ──────────────────────────────────────────────────────────
    @Transactional
    public ExamDTO publishExam(UUID examId) {
        Exam exam = getExamOrThrow(examId);
        if (exam.getExamQuestions().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot publish an exam with no questions");
        }
        exam.setStatus(Exam.ExamStatus.PUBLISHED);
        return toDTO(examRepository.save(exam));
    }

    // ── Question Search (left panel browser) ─────────────────────────────────
    @Transactional(readOnly = true)
    public Page<ExamDTO.ExamQuestionDTO> searchQuestions(QuestionSearchParams params) {
        String tenantId = TenantContext.getTenantId();

        String type = null;
        if (params.getType() != null && !params.getType().isBlank()) {
            type = params.getType().trim().toUpperCase();
        }
        Question.DifficultyLevel difficulty = null;
        if (params.getDifficulty() != null && !params.getDifficulty().isBlank()) {
            try {
                difficulty = Question.DifficultyLevel.valueOf(params.getDifficulty());
            } catch (Exception ignored) {
            }
        }

        String[] sortParts = params.getSort().split(",");
        Sort sort = Sort.by(
                sortParts.length > 1 && "asc".equalsIgnoreCase(sortParts[1]) ? Sort.Direction.ASC : Sort.Direction.DESC,
                sortParts[0]);
        Pageable pageable = PageRequest.of(params.getPage(), params.getSize(), sort);

        String keyword = (params.getKeyword() != null && !params.getKeyword().isBlank()) ? params.getKeyword() : null;
        String language = (params.getLanguage() != null && !params.getLanguage().isBlank()) ? params.getLanguage()
                : null;

        // Base JPQL
        StringBuilder jpql = new StringBuilder("SELECT DISTINCT q FROM Question q ");

        // 1. Joins
        if ("FAVORITES".equalsIgnoreCase(params.getSourceMode())) {
            jpql.append("JOIN QuestionFavorite qf ON qf.question = q ");
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(params.getSourceMode()) && params.getLectureIds() != null && !params.getLectureIds().isEmpty()) {
            jpql.append("JOIN LectureQuestion lq ON lq.question = q ");
        }

        boolean hasBoard = params.getBoards() != null && !params.getBoards().isEmpty();
        boolean hasYear = params.getYears() != null && !params.getYears().isEmpty();
        boolean hasSchool = params.getSchools() != null && !params.getSchools().isEmpty();

        if (hasBoard || hasYear || hasSchool) {
            jpql.append("JOIN q.sources qs ");
        }

        // 2. Base conditions
        jpql.append("WHERE q.status = 'APPROVED' AND q.deleted = false ");
        if (params.getClassSubjectId() != null) {
            jpql.append("AND q.classSubject.id = :classSubjectId ");
        }
        if (params.getChapterId() != null) {
            jpql.append("AND q.chapter.id = :chapterId ");
            jpql.append("AND (q.chapter.isActive = true OR q.chapter.isActive IS NULL) ");
        }
        if (params.getTopicId() != null) {
            jpql.append("AND q.topic.id = :topicId ");
            jpql.append("AND (q.chapter.isActive = true OR q.chapter.isActive IS NULL) ");
        }
        if (type != null) {
            jpql.append("AND q.type = :type ");
        }
        if (difficulty != null) {
            jpql.append("AND q.difficulty = :difficulty ");
        }
        if (language != null) {
            jpql.append("AND (q.language = :language OR q.language = 'Bilingual' OR :language = 'Bilingual' OR q.language IS NULL OR q.language = '') ");
        }
        if (keyword != null) {
            jpql.append("AND LOWER(q.questionText) LIKE LOWER(:keyword) ");
        }

        // 3. Source Mode filters
        if ("FAVORITES".equalsIgnoreCase(params.getSourceMode())) {
            String currentUser = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            jpql.append("AND qf.user.email = :currentUser ");
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(params.getSourceMode()) && params.getLectureIds() != null && !params.getLectureIds().isEmpty()) {
            jpql.append("AND lq.lecture.id IN :lectureIds ");
        }

        // 4. Board/Year/School filters
        if (hasBoard) {
            jpql.append("AND qs.sourceType = :boardExamType AND LOWER(qs.organizationName) IN :boards ");
        }
        if (hasYear) {
            jpql.append("AND qs.examYear IN :years ");
        }
        if (hasSchool) {
            jpql.append("AND qs.sourceType = :institutionTestType AND LOWER(qs.organizationName) IN :schools ");
        }

        // Add sorting (always order by q.createdAt desc for consistency)
        jpql.append("ORDER BY q.createdAt DESC");

        // Count Query JPQL
        StringBuilder countJpql = new StringBuilder("SELECT COUNT(DISTINCT q) FROM Question q ");
        if ("FAVORITES".equalsIgnoreCase(params.getSourceMode())) {
            countJpql.append("JOIN QuestionFavorite qf ON qf.question = q ");
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(params.getSourceMode()) && params.getLectureIds() != null && !params.getLectureIds().isEmpty()) {
            countJpql.append("JOIN LectureQuestion lq ON lq.question = q ");
        }
        if (hasBoard || hasYear || hasSchool) {
            countJpql.append("JOIN q.sources qs ");
        }

        // Count conditions
        countJpql.append("WHERE q.status = 'APPROVED' AND q.deleted = false ");
        if (params.getClassSubjectId() != null) {
            countJpql.append("AND q.classSubject.id = :classSubjectId ");
        }
        if (params.getChapterId() != null) {
            countJpql.append("AND q.chapter.id = :chapterId ");
            countJpql.append("AND (q.chapter.isActive = true OR q.chapter.isActive IS NULL) ");
        }
        if (params.getTopicId() != null) {
            countJpql.append("AND q.topic.id = :topicId ");
            countJpql.append("AND (q.chapter.isActive = true OR q.chapter.isActive IS NULL) ");
        }
        if (type != null) {
            countJpql.append("AND q.type = :type ");
        }
        if (difficulty != null) {
            countJpql.append("AND q.difficulty = :difficulty ");
        }
        if (language != null) {
            countJpql.append("AND (q.language = :language OR q.language = 'Bilingual' OR :language = 'Bilingual' OR q.language IS NULL OR q.language = '') ");
        }
        if (keyword != null) {
            countJpql.append("AND LOWER(q.questionText) LIKE LOWER(:keyword) ");
        }
        if ("FAVORITES".equalsIgnoreCase(params.getSourceMode())) {
            String currentUser = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            countJpql.append("AND qf.user.email = :currentUser ");
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(params.getSourceMode()) && params.getLectureIds() != null && !params.getLectureIds().isEmpty()) {
            countJpql.append("AND lq.lecture.id IN :lectureIds ");
        }
        if (hasBoard) {
            countJpql.append("AND qs.sourceType = :boardExamType AND LOWER(qs.organizationName) IN :boards ");
        }
        if (hasYear) {
            countJpql.append("AND qs.examYear IN :years ");
        }
        if (hasSchool) {
            countJpql.append("AND qs.sourceType = :institutionTestType AND LOWER(qs.organizationName) IN :schools ");
        }

        // Build Queries
        jakarta.persistence.TypedQuery<Question> query = entityManager.createQuery(jpql.toString(), Question.class);
        jakarta.persistence.TypedQuery<Long> countQuery = entityManager.createQuery(countJpql.toString(), Long.class);

        // Bind parameters
        if (params.getClassSubjectId() != null) {
            query.setParameter("classSubjectId", params.getClassSubjectId());
            countQuery.setParameter("classSubjectId", params.getClassSubjectId());
        }
        if (params.getChapterId() != null) {
            query.setParameter("chapterId", params.getChapterId());
            countQuery.setParameter("chapterId", params.getChapterId());
        }
        if (params.getTopicId() != null) {
            query.setParameter("topicId", params.getTopicId());
            countQuery.setParameter("topicId", params.getTopicId());
        }
        if (type != null) {
            query.setParameter("type", type);
            countQuery.setParameter("type", type);
        }
        if (difficulty != null) {
            query.setParameter("difficulty", difficulty);
            countQuery.setParameter("difficulty", difficulty);
        }
        if (language != null) {
            query.setParameter("language", language);
            countQuery.setParameter("language", language);
        }
        if (keyword != null) {
            String likeKeyword = "%" + keyword.toLowerCase() + "%";
            query.setParameter("keyword", likeKeyword);
            countQuery.setParameter("keyword", likeKeyword);
        }
        if ("FAVORITES".equalsIgnoreCase(params.getSourceMode())) {
            String currentUser = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            query.setParameter("currentUser", currentUser);
            countQuery.setParameter("currentUser", currentUser);
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(params.getSourceMode()) && params.getLectureIds() != null && !params.getLectureIds().isEmpty()) {
            query.setParameter("lectureIds", params.getLectureIds());
            countQuery.setParameter("lectureIds", params.getLectureIds());
        }
        if (hasBoard) {
            List<String> lowerBoards = params.getBoards().stream().map(String::toLowerCase).collect(Collectors.toList());
            query.setParameter("boards", lowerBoards);
            countQuery.setParameter("boards", lowerBoards);
            query.setParameter("boardExamType", com.testshaper.entity.QuestionSource.SourceType.BOARD_EXAM);
            countQuery.setParameter("boardExamType", com.testshaper.entity.QuestionSource.SourceType.BOARD_EXAM);
        }
        if (hasYear) {
            query.setParameter("years", params.getYears());
            countQuery.setParameter("years", params.getYears());
        }
        if (hasSchool) {
            List<String> lowerSchools = params.getSchools().stream().map(String::toLowerCase).collect(Collectors.toList());
            query.setParameter("schools", lowerSchools);
            countQuery.setParameter("schools", lowerSchools);
            query.setParameter("institutionTestType", com.testshaper.entity.QuestionSource.SourceType.INSTITUTION_TEST);
            countQuery.setParameter("institutionTestType", com.testshaper.entity.QuestionSource.SourceType.INSTITUTION_TEST);
        }

        // Paginate
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<Question> questions = query.getResultList();
        long total = countQuery.getSingleResult();

        return new org.springframework.data.domain.PageImpl<>(questions, pageable, total).map(this::toQuestionDTO);
    }

    // ── Get Exam ──────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ExamDTO getExam(UUID examId) {
        Exam exam = examRepository.findByIdWithQuestions(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));
                
        String currentTenant = TenantContext.getTenantId();
        boolean isSuperAdmin = false;
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                isSuperAdmin = auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN") || a.getAuthority().equals("SUPER_ADMIN"));
            }
        } catch (Exception ignored) {}

        // If current user is DEFAULT tenant or SUPER_ADMIN, allow access.
        // If exam belongs to DEFAULT tenant, allow access (so others can view global templates).
        // Otherwise, current user must be in the same tenant as the exam.
        if (!isSuperAdmin && !"DEFAULT".equals(currentTenant) && !"DEFAULT".equals(exam.getTenantId()) && !exam.getTenantId().equals(currentTenant)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return toDTO(exam);
    }

    // ── Delete Exam ───────────────────────────────────────────────────────────
    @Transactional
    public void deleteExam(UUID examId) {
        Exam exam = getExamOrThrow(examId);
        exam.setDeleted(true);
        examRepository.save(exam);
    }

    private void saveFavoritesFromRawContent(String rawContent, String username) {
        if (rawContent == null || rawContent.isEmpty()) return;
        userRepository.findByEmail(username).ifPresent(user -> {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("questionid=\"([a-fA-F0-9\\-]{36})\"");
            java.util.regex.Matcher matcher = pattern.matcher(rawContent);
            while (matcher.find()) {
                try {
                    UUID qId = UUID.fromString(matcher.group(1));
                    questionRepository.findById(qId).ifPresent(q -> {
                        if (!favoriteRepository.existsByQuestionAndUser(q, user)) {
                            QuestionFavorite fav = new QuestionFavorite();
                            fav.setQuestion(q);
                            fav.setUser(user);
                            favoriteRepository.save(fav);
                        }
                    });
                } catch (Exception e) {
                    log.error("Failed to parse question UUID for favorites", e);
                }
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Exam getExamOrThrow(UUID examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));
                
        String currentTenant = TenantContext.getTenantId();
        boolean isSuperAdmin = false;
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                isSuperAdmin = auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN") || a.getAuthority().equals("SUPER_ADMIN"));
            }
        } catch (Exception ignored) {}

        // DEFAULT tenant and SUPER_ADMIN can edit anything. Normal tenants can only edit their own.
        if (!isSuperAdmin && !"DEFAULT".equals(currentTenant) && !exam.getTenantId().equals(currentTenant)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied. Cannot modify cross-tenant data.");
        }
        return exam;
    }

    private ExamDTO toDTO(Exam exam) {
        ExamDTO dto = new ExamDTO();
        dto.setId(exam.getId());
        dto.setTenantId(exam.getTenantId());
        dto.setTitle(exam.getTitle());
        dto.setExamType(exam.getExamType());
        dto.setStatus(exam.getStatus());
        dto.setLanguage(exam.getLanguage());
        dto.setDurationMinutes(exam.getDurationMinutes());
        dto.setTotalMarks(exam.getTotalMarks());
        dto.setTotalQuestions(exam.getTotalQuestions());
        dto.setShuffleQuestions(exam.isShuffleQuestions());
        dto.setShuffleOptions(exam.isShuffleOptions());
        dto.setInstituteName(exam.getInstituteName());
        dto.setHeaderText(exam.getHeaderText());
        dto.setAiGenerated(exam.isAiGenerated());
        dto.setCreatedBy(exam.getCreatedBy());
        dto.setCreatedAt(exam.getCreatedAt());

        dto.setEditorMode(exam.getEditorMode());
        dto.setRawContent(exam.getRawContent());
        dto.setDocSettingsJson(exam.getDocSettingsJson());
        if (exam.getExamTemplate() != null) {
            dto.setTemplateId(exam.getExamTemplate().getId());
        }

        if (exam.getClassSubject() != null) {
            dto.setClassSubjectId(exam.getClassSubject().getId());
            if (exam.getClassSubject().getSubject() != null) {
                dto.setSubjectId(exam.getClassSubject().getSubject().getId());
                dto.setSubjectName(exam.getClassSubject().getSubject().getName());
            }
            if (exam.getClassSubject().getAcademicClass() != null) {
                dto.setClassId(exam.getClassSubject().getAcademicClass().getId());
                dto.setClassName(exam.getClassSubject().getAcademicClass().getName());
            }
        }

        dto.setQuestions(exam.getExamQuestions().stream()
                .map(eq -> {
                    ExamDTO.ExamQuestionDTO qDto = new ExamDTO.ExamQuestionDTO();
                    qDto.setId(eq.getId());
                    qDto.setOrder(eq.getQuestionOrder());
                    qDto.setMarks(eq.getMarks());
                    qDto.setAlternativeToId(eq.getAlternativeToId());
                    if (eq.getSection() != null) {
                        qDto.setSectionId(eq.getSection().getId());
                    }
                    Question q = eq.getQuestion();
                    qDto.setOriginalQuestionId(q.getId());
                    qDto.setQuestionText(q.getQuestionText());
                    qDto.setStimulus(q.getStimulus());
                    qDto.setType(q.getType());
                    qDto.setMcqType(q.getMcqType());
                    qDto.setStatements(q.getStatements());
                    qDto.setDifficulty(q.getDifficulty());
                    qDto.setBloomLevel(q.getBloomLevel());
                    qDto.setLanguage(q.getLanguage());
                    qDto.setDynamicData(q.getDynamicData());
                    if (q.getOptions() != null) {
                        qDto.setOptions(q.getOptions().stream().map(opt -> {
                            ExamDTO.OptionDTO odto = new ExamDTO.OptionDTO();
                            odto.setId(opt.getId());
                            odto.setOptionText(opt.getOptionText());
                            odto.setCorrect(opt.isCorrect());
                            return odto;
                        }).collect(Collectors.toList()));
                    }
                    return qDto;
                }).collect(Collectors.toList()));

        return dto;
    }

    private ExamDTO.ExamQuestionDTO toQuestionDTO(Question q) {
        ExamDTO.ExamQuestionDTO dto = new ExamDTO.ExamQuestionDTO();
        dto.setId(q.getId());
        dto.setQuestionText(q.getQuestionText());
        dto.setStimulus(q.getStimulus());
        dto.setType(q.getType());
        dto.setMcqType(q.getMcqType());
        dto.setStatements(q.getStatements());
        dto.setDifficulty(q.getDifficulty());
        dto.setBloomLevel(q.getBloomLevel());
        dto.setLanguage(q.getLanguage());
        dto.setMarks(q.getMarks());
        dto.setDynamicData(q.getDynamicData());
        dto.setCorrectAnswer(q.getCorrectAnswer());
        dto.setExplanation(q.getExplanation());
        // If there are board/school sources, map them beautifully, otherwise fallback to sourceReference (chunk)
        if (q.getSources() != null && !q.getSources().isEmpty()) {
            // Join all board names beautifully
            String joinedSources = q.getSources().stream()
                .map(src -> {
                    String org = src.getOrganizationName() != null ? src.getOrganizationName().trim() : "";
                    String year = src.getExamYear() != null ? src.getExamYear().toString() : "";
                    if (!org.isEmpty() && !year.isEmpty()) {
                        return org + " " + year;
                    } else if (!org.isEmpty()) {
                        return org;
                    } else {
                        return year;
                    }
                })
                .filter(s -> !s.isEmpty())
                .collect(Collectors.joining(", "));
            
            if (!joinedSources.isEmpty()) {
                dto.setSourceReference(joinedSources);
            } else {
                mapFallbackSourceReference(dto, q);
            }
        } else {
            mapFallbackSourceReference(dto, q);
        }

        if (q.getChapter() != null) {
            dto.setChapterId(q.getChapter().getId());
        }
        if (q.getTopic() != null) {
            dto.setTopicId(q.getTopic().getId());
        }
        if (q.getOptions() != null) {
            dto.setOptions(q.getOptions().stream().map(opt -> {
                ExamDTO.OptionDTO odto = new ExamDTO.OptionDTO();
                odto.setId(opt.getId());
                odto.setOptionText(opt.getOptionText());
                odto.setCorrect(opt.isCorrect());
                return odto;
            }).collect(Collectors.toList()));
        }
        if (q.getSources() != null) {
            dto.setSources(q.getSources().stream().map(src -> {
                ExamDTO.QuestionSourceDTO sdto = new ExamDTO.QuestionSourceDTO();
                sdto.setSourceType(src.getSourceType() != null ? src.getSourceType().name() : null);
                sdto.setExamYear(src.getExamYear());
                sdto.setOrganizationName(src.getOrganizationName());
                sdto.setExamName(src.getExamName());
                sdto.setSession(src.getSession());
                sdto.setNote(src.getNote());
                return sdto;
            }).collect(Collectors.toList()));
        }
        return dto;
    }

    private void mapFallbackSourceReference(ExamDTO.ExamQuestionDTO dto, Question q) {
        String rawRef = q.getSourceReference();
        if (rawRef != null) {
            String clean = rawRef.trim().toLowerCase();
            // Check if it is a raw UUID or starts with chunk_ and a UUID
            if (clean.matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$") || 
                clean.startsWith("chunk_") || 
                clean.contains("chunk_") ||
                clean.matches(".*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*")) {
                dto.setSourceReference("Textbook Content");
            } else {
                dto.setSourceReference(rawRef);
            }
        }
    }
}
