package com.testshaper.service.impl;

import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import com.testshaper.repository.QuestionOptionRepository;
import com.testshaper.repository.QuestionRepository;
import com.testshaper.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class QuestionServiceImpl implements QuestionService {

    @PersistenceContext
    private EntityManager entityManager;

    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final com.testshaper.service.QuestionFeedbackService feedbackService;
    private final com.testshaper.repository.UserRepository userRepository;
    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private com.testshaper.service.QuestionFeedbackLearningService feedbackLearningService;
    private final com.testshaper.repository.QuestionLikeRepository likeRepository;
    private final com.testshaper.repository.QuestionFavoriteRepository favoriteRepository;
    private final com.testshaper.repository.QuestionSourceRepository sourceRepository;
    private final com.testshaper.repository.ExamQuestionRepository examQuestionRepository;
    private final com.testshaper.repository.LectureQuestionRepository lectureQuestionRepository;

    @Override
    @Transactional
    public Question createMCQ(Question question, List<QuestionOption> options) {
        // Validation
        if (options == null || options.size() < 2) {
            throw new IllegalArgumentException("MCQ must have at least 2 options.");
        }
        long correctCount = options.stream().filter(QuestionOption::isCorrect).count();
        if (correctCount != 1) { // Assuming single select for MVP
            throw new IllegalArgumentException("MCQ must have exactly one correct answer.");
        }

        // Set correctAnswer from the correct option text
        options.stream().filter(QuestionOption::isCorrect).findFirst()
                .ifPresent(opt -> question.setCorrectAnswer(opt.getOptionText()));

        // Save Question
        if (question.getType() == null || question.getType().isEmpty()) {
            question.setType(Question.QuestionType.MCQ.name());
        }
        question.setStatus(Question.QuestionStatus.PENDING); // Default status
        
        if (question.getSources() != null) {
            for (com.testshaper.entity.QuestionSource source : question.getSources()) {
                source.setQuestion(question);
            }
        }
        
        Question savedQuestion = questionRepository.save(question);

        // Save Options
        for (QuestionOption option : options) {
            option.setQuestion(savedQuestion);
            optionRepository.save(option);
        }

        return savedQuestion;
    }

    @Override
    @Transactional
    public void createMCQBulk(List<Question> questions, List<List<QuestionOption>> optionsList) {
        if (questions == null || optionsList == null || questions.size() != optionsList.size()) {
            throw new IllegalArgumentException("Questions and options list must not be null and must have the same size.");
        }

        List<QuestionOption> allOptions = new java.util.ArrayList<>();
        List<Question> validQuestions = new java.util.ArrayList<>();

        for (int i = 0; i < questions.size(); i++) {
            Question question = questions.get(i);
            List<QuestionOption> options = optionsList.get(i);

            boolean isProblematic = false;
            String errorNote = "";
            
            // Respect parsed type
            if (question.getType() == null) {
                question.setType(Question.QuestionType.MCQ.name());
            }

            if (Question.QuestionType.MCQ.name().equals(question.getType())) {
                if (options == null || options.size() < 2) {
                    isProblematic = true;
                    errorNote = "[AI Error: Needs at least 2 options] ";
                    if (options == null) options = new java.util.ArrayList<>();
                } else {
                    long correctCount = options.stream().filter(QuestionOption::isCorrect).count();
                    
                    // AI fallback: If AI didn't mark any option as true, but provided 'correctAnswer' string
                    if (correctCount == 0 && question.getCorrectAnswer() != null && !question.getCorrectAnswer().isEmpty()) {
                        String ansTarget = question.getCorrectAnswer().trim().toLowerCase();
                        for (QuestionOption opt : options) {
                            String optText = opt.getOptionText() != null ? opt.getOptionText().trim().toLowerCase() : "";
                            String optLabel = opt.getOptionLabel() != null ? opt.getOptionLabel().trim().toLowerCase() : "";
                            if (optText.equals(ansTarget) || ansTarget.equals(optLabel) || ansTarget.startsWith(optLabel + ")") || ansTarget.startsWith(optLabel + ".")) {
                                opt.setCorrect(true);
                                correctCount = 1;
                                break;
                            }
                            // Partial match fallback
                            if (!optText.isEmpty() && (ansTarget.contains(optText) || optText.contains(ansTarget))) {
                                opt.setCorrect(true);
                                correctCount = 1;
                                break;
                            }
                        }
                    }

                    if (correctCount != 1) { 
                        isProblematic = true;
                        errorNote = "[AI Error: Needs exactly 1 correct answer] ";
                    } else {
                        // Set correctAnswer from the correct option text
                        options.stream().filter(QuestionOption::isCorrect).findFirst()
                                .ifPresent(opt -> question.setCorrectAnswer(opt.getOptionText()));
                    }
                }
                
                if ("MULTIPLE_COMPLETION".equals(question.getMcqType())) {
                    if (question.getStatements() == null || question.getStatements().size() < 2) {
                        isProblematic = true;
                        errorNote += "[AI Error: Multiple Completion must have at least 2 statements] ";
                    }
                }
            } else {
                // Short or CQ validations
                if (options != null) {
                    options.clear(); // Clear options for non-MCQ
                } else {
                    options = new java.util.ArrayList<>();
                }
            }

            if (isProblematic) {
                question.setStatus(Question.QuestionStatus.REJECTED);
                String oldExp = question.getExplanation() != null ? question.getExplanation() : "";
                question.setExplanation(errorNote + oldExp);
            } else {
                question.setStatus(Question.QuestionStatus.PENDING); // Default status
            }

            if (question.getSources() != null) {
                for (com.testshaper.entity.QuestionSource source : question.getSources()) {
                    source.setQuestion(question);
                }
            }

            validQuestions.add(question);

            for (QuestionOption option : options) {
                option.setQuestion(question);
                allOptions.add(option);
            }
        }

        // Batch save for high performance
        if (!validQuestions.isEmpty()) {
            questionRepository.saveAll(validQuestions);
            optionRepository.saveAll(allOptions);
        }
    }

    @Override
    @Transactional
    public Question createShortQuestion(Question question) {
        if (question.getType() == null || question.getType().isEmpty()) {
            question.setType(Question.QuestionType.SHORT.name());
        }
        question.setStatus(Question.QuestionStatus.PENDING);
        if (question.getSources() != null) {
            for (com.testshaper.entity.QuestionSource source : question.getSources()) {
                source.setQuestion(question);
            }
        }
        return questionRepository.save(question);
    }

    @Override
    @Transactional
    public Question createCQ(Question question) {
        if (question.getType() == null || question.getType().isEmpty()) {
            question.setType(Question.QuestionType.CQ.name());
        }
        question.setStatus(Question.QuestionStatus.PENDING);
        if (question.getSources() != null) {
            for (com.testshaper.entity.QuestionSource source : question.getSources()) {
                source.setQuestion(question);
            }
        }
        // Default marks for CQ is usually 10, but client can send it.
        // If questionText holds the formatted Stem+Questions, we just save it.
        return questionRepository.save(question);
    }

    @Override
    public Question getQuestion(UUID id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Question not found"));
    }

    @Override
    public List<QuestionOption> getOptions(UUID questionId) {
        return optionRepository.findByQuestionIdOrderByOptionLabelAsc(questionId);
    }

    @Override
    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }

    @Override
    public org.springframework.data.domain.Page<Question> getAllQuestionsPaginated(
            java.util.Map<String, String> filters,
            org.springframework.data.domain.Pageable pageable) {
        
        String tenantId = com.testshaper.security.TenantContext.getTenantId();
        
        // Fetch FGAC allowed subjects for the user's institute
        List<UUID> allowedSubjectIds = new java.util.ArrayList<>();
        if (org.springframework.util.StringUtils.hasText(tenantId)) {
            String currentUserEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            userRepository.findByEmail(currentUserEmail).ifPresent(user -> {
                if (user.getInstitute() != null && user.getInstitute().getAssignedSubjects() != null) {
                    user.getInstitute().getAssignedSubjects().forEach(sub -> allowedSubjectIds.add(sub.getId()));
                }
            });
        }

        // Identify the global tenant ID (Default Institute)
        String globalTenantId = null;
        try {
            globalTenantId = (String) entityManager.createQuery("SELECT CAST(i.id AS string) FROM Institute i WHERE i.code = 'DEFAULT-001'")
                    .setMaxResults(1)
                    .getSingleResult();
        } catch (Exception e) {
            // ignore if not found
        }
        
        org.springframework.data.jpa.domain.Specification<Question> spec = 
            com.testshaper.specification.QuestionSpecification.filterQuestions(
                tenantId,
                filters.get("filterStatus"),
                filters.get("filterType"),
                filters.get("search"),
                filters.get("language"),
                filters.get("levelId"),
                filters.get("streamId"),
                filters.get("classId"),
                filters.get("subjectId"),
                filters.get("chapterId"),
                filters.get("topicId"),
                filters.get("className"),
                filters.get("subjectName"),
                allowedSubjectIds,
                globalTenantId,
                filters.get("sourceBoards"),
                filters.get("sourceYears"),
                filters.get("sourceSchools")
            );

        return questionRepository.findAll(spec, pageable);
    }

    @Override
    public List<UUID> getAllQuestionIds(java.util.Map<String, String> filters) {
        String tenantId = com.testshaper.security.TenantContext.getTenantId();
        
        List<UUID> allowedSubjectIds = new java.util.ArrayList<>();
        if (org.springframework.util.StringUtils.hasText(tenantId)) {
            String currentUserEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            userRepository.findByEmail(currentUserEmail).ifPresent(user -> {
                if (user.getInstitute() != null && user.getInstitute().getAssignedSubjects() != null) {
                    user.getInstitute().getAssignedSubjects().forEach(sub -> allowedSubjectIds.add(sub.getId()));
                }
            });
        }

        String globalTenantId = null;
        try {
            globalTenantId = (String) entityManager.createQuery("SELECT CAST(i.id AS string) FROM Institute i WHERE i.code = 'DEFAULT-001'")
                    .setMaxResults(1)
                    .getSingleResult();
        } catch (Exception e) {
            // ignore if not found
        }
        
        org.springframework.data.jpa.domain.Specification<Question> spec = 
            com.testshaper.specification.QuestionSpecification.filterQuestions(
                tenantId,
                filters.get("filterStatus"),
                filters.get("filterType"),
                filters.get("search"),
                filters.get("language"),
                filters.get("levelId"),
                filters.get("streamId"),
                filters.get("classId"),
                filters.get("subjectId"),
                filters.get("chapterId"),
                filters.get("topicId"),
                filters.get("className"),
                filters.get("subjectName"),
                allowedSubjectIds,
                globalTenantId,
                filters.get("sourceBoards"),
                filters.get("sourceYears"),
                filters.get("sourceSchools")
            );

        return questionRepository.findAll(spec).stream().map(Question::getId).collect(java.util.stream.Collectors.toList());
    }

    @Override
    public java.util.Map<String, Object> getSourceTags(java.util.Map<String, String> filters) {
        List<UUID> ids = getAllQuestionIds(filters);
        if (ids == null || ids.isEmpty()) {
            return java.util.Collections.emptyMap();
        }

        java.util.Map<String, Integer> boardCounts = new java.util.HashMap<>();
        java.util.Map<String, Integer> yearCounts = new java.util.HashMap<>();
        java.util.Map<String, Integer> schoolCounts = new java.util.HashMap<>();

        int batchSize = 1000;
        for (int i = 0; i < ids.size(); i += batchSize) {
            List<UUID> batch = ids.subList(i, Math.min(i + batchSize, ids.size()));

            String jpql = "SELECT qs.organizationName, qs.examYear, qs.sourceType, COUNT(DISTINCT qs.question.id) " +
                          "FROM QuestionSource qs WHERE qs.question.id IN :batch " +
                          "GROUP BY qs.organizationName, qs.examYear, qs.sourceType";
            
            List<Object[]> rows = entityManager.createQuery(jpql, Object[].class)
                    .setParameter("batch", batch)
                    .getResultList();

            for (Object[] row : rows) {
                String orgName = (String) row[0];
                Integer year = (Integer) row[1];
                com.testshaper.entity.QuestionSource.SourceType type = (com.testshaper.entity.QuestionSource.SourceType) row[2];
                Long count = (Long) row[3];
                int c = count != null ? count.intValue() : 0;

                if (orgName != null && !orgName.isEmpty()) {
                    if (type == com.testshaper.entity.QuestionSource.SourceType.BOARD_EXAM || type == com.testshaper.entity.QuestionSource.SourceType.UNIVERSITY_ADMISSION) {
                        boardCounts.put(orgName, boardCounts.getOrDefault(orgName, 0) + c);
                    } else {
                        schoolCounts.put(orgName, schoolCounts.getOrDefault(orgName, 0) + c);
                    }
                }
                if (year != null) {
                    yearCounts.put(String.valueOf(year), yearCounts.getOrDefault(String.valueOf(year), 0) + c);
                }
            }
        }

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("boards", boardCounts.entrySet().stream()
                .map(e -> java.util.Map.of("name", e.getKey(), "count", e.getValue()))
                .sorted((a, b) -> Integer.compare((Integer)b.get("count"), (Integer)a.get("count")))
                .collect(java.util.stream.Collectors.toList()));
        result.put("years", yearCounts.entrySet().stream()
                .map(e -> java.util.Map.of("name", e.getKey(), "count", e.getValue()))
                .sorted((a, b) -> Integer.compare((Integer)b.get("count"), (Integer)a.get("count")))
                .collect(java.util.stream.Collectors.toList()));
        result.put("schools", schoolCounts.entrySet().stream()
                .map(e -> java.util.Map.of("name", e.getKey(), "count", e.getValue()))
                .sorted((a, b) -> Integer.compare((Integer)b.get("count"), (Integer)a.get("count")))
                .collect(java.util.stream.Collectors.toList()));

        return result;
    }

    @Override
    public java.util.Map<String, Object> getOverviewStats(java.util.Map<String, String> filters) {
        String tenantId = com.testshaper.security.TenantContext.getTenantId();
        
        List<UUID> allowedSubjectIds = new java.util.ArrayList<>();
        if (org.springframework.util.StringUtils.hasText(tenantId)) {
            String currentUserEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            userRepository.findByEmail(currentUserEmail).ifPresent(user -> {
                if (user.getInstitute() != null && user.getInstitute().getAssignedSubjects() != null) {
                    user.getInstitute().getAssignedSubjects().forEach(sub -> allowedSubjectIds.add(sub.getId()));
                }
            });
        }

        String globalTenantId = null;
        try {
            globalTenantId = (String) entityManager.createQuery("SELECT CAST(i.id AS string) FROM Institute i WHERE i.code = 'DEFAULT-001'")
                    .setMaxResults(1)
                    .getSingleResult();
        } catch (Exception e) {
            // ignore if not found
        }
        
        long totalQuestions = 0;
        long totalApproved = 0;
        long totalPending = 0;
        long totalSubjects = 0;

        org.springframework.data.jpa.domain.Specification<Question> baseSpec = 
            com.testshaper.specification.QuestionSpecification.filterQuestions(
                tenantId,
                null,
                filters != null ? filters.get("filterType") : null,
                filters != null ? filters.get("search") : null,
                filters != null ? filters.get("language") : null,
                filters != null ? filters.get("levelId") : null,
                filters != null ? filters.get("streamId") : null,
                filters != null ? filters.get("classId") : null,
                filters != null ? filters.get("subjectId") : null,
                filters != null ? filters.get("chapterId") : null,
                filters != null ? filters.get("topicId") : null,
                filters != null ? filters.get("className") : null,
                filters != null ? filters.get("subjectName") : null,
                allowedSubjectIds,
                globalTenantId,
                filters != null ? filters.get("sourceBoards") : null,
                filters != null ? filters.get("sourceYears") : null,
                filters != null ? filters.get("sourceSchools") : null
            );

        totalQuestions = questionRepository.count(baseSpec);

        org.springframework.data.jpa.domain.Specification<Question> approvedSpec = baseSpec.and((root, query, cb) -> cb.equal(root.get("status"), Question.QuestionStatus.APPROVED));
        totalApproved = questionRepository.count(approvedSpec);

        org.springframework.data.jpa.domain.Specification<Question> pendingSpec = baseSpec.and((root, query, cb) -> cb.equal(root.get("status"), Question.QuestionStatus.PENDING));
        totalPending = questionRepository.count(pendingSpec);

        if (filters != null && filters.get("subjectId") != null && !filters.get("subjectId").isEmpty()) {
            totalSubjects = 1;
        } else {
            totalSubjects = questionRepository.countDistinctClassSubjectIds(); 
        }

        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalQuestions", totalQuestions);
        stats.put("totalApproved", totalApproved);
        stats.put("totalPending", totalPending);
        stats.put("totalSubjects", totalSubjects);
        return stats;
    }

    @Override
    @Transactional
    public void deleteQuestion(UUID id) {
        // Options cascade delete? Or manual?
        // For now, let's assume manual since we didn't set cascade in entity (kept
        // simple base entity)
        likeRepository.deleteByQuestionId(id);
        favoriteRepository.deleteByQuestionId(id);
        sourceRepository.deleteByQuestionId(id);
        examQuestionRepository.deleteByQuestionId(id);
        lectureQuestionRepository.deleteByQuestionId(id);
        List<QuestionOption> options = optionRepository.findByQuestionIdOrderByOptionLabelAsc(id);
        optionRepository.deleteAll(options);
        try {
            questionRepository.deleteById(id);
            questionRepository.flush();
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT,
                "Cannot delete question. It is locked because it is used in an Exam, Lecture, or Student Result."
            );
        }
    }

    @Override
    @Transactional
    public void deleteQuestionsBulk(List<UUID> ids) {
        for (UUID id : ids) {
            deleteQuestion(id);
        }
    }

    @Override
    @Transactional
    public Question approveQuestion(UUID id, String approverId) {
        Question question = getQuestion(id);
        question.setStatus(Question.QuestionStatus.APPROVED);
        question.setApprovedBy(approverId);
        question.setApprovedAt(LocalDateTime.now());
        Question saved = questionRepository.save(question);

        // 🔄 Feedback Learning Loop: Record as GOOD_EXAMPLE
        feedbackLearningService.recordApprovedQuestion(saved.getId(), approverId);

        return saved;
    }

    @Override
    @Transactional
    public Question rejectQuestion(UUID id) {
        return rejectQuestion(id, null, null);
    }

    @Override
    @Transactional
    public Question rejectQuestion(UUID id, String rejectionReason, String rejectedBy) {
        Question question = getQuestion(id);
        question.setStatus(Question.QuestionStatus.REJECTED);
        Question saved = questionRepository.save(question);

        // 🔄 Feedback Learning Loop: Record as BAD_EXAMPLE (with reason)
        feedbackLearningService.recordRejectedQuestion(saved.getId(), rejectionReason, rejectedBy);

        return saved;
    }

    @Override
    @Transactional
    public Question updateQuestion(UUID id, Question questionDetails, List<QuestionOption> options) {
        Question question = getQuestion(id);

        // Update all standard mutable fields
        question.setQuestionText(questionDetails.getQuestionText());
        question.setStimulus(questionDetails.getStimulus());
        question.setMarks(questionDetails.getMarks());
        question.setDifficulty(questionDetails.getDifficulty());
        question.setLanguage(questionDetails.getLanguage());
        question.setExplanation(questionDetails.getExplanation());
        question.setBloomLevel(questionDetails.getBloomLevel());
        if (questionDetails.getClassSubject() != null && questionDetails.getClassSubject().getId() != null) {
            question.setClassSubject(entityManager.getReference(com.testshaper.entity.ClassSubject.class, questionDetails.getClassSubject().getId()));
        } else {
            question.setClassSubject(null);
        }
        if (questionDetails.getChapter() != null && questionDetails.getChapter().getId() != null) {
            question.setChapter(entityManager.getReference(com.testshaper.entity.Chapter.class, questionDetails.getChapter().getId()));
        } else {
            question.setChapter(null);
        }
        if (questionDetails.getTopic() != null && questionDetails.getTopic().getId() != null) {
            question.setTopic(entityManager.getReference(com.testshaper.entity.Topic.class, questionDetails.getTopic().getId()));
        } else {
            question.setTopic(null);
        }
        question.setMcqType(questionDetails.getMcqType());
        if (questionDetails.getStatements() != null) {
            question.setStatements(new java.util.ArrayList<>(questionDetails.getStatements()));
        } else {
            question.setStatements(new java.util.ArrayList<>());
        }
        // if (question.getType() != Question.QuestionType.MCQ) {
        // question.setCorrectAnswer(questionDetails.getCorrectAnswer());
        // }

        // Return status to PENDING on edit
        question.setStatus(Question.QuestionStatus.PENDING);

        // Handle Sources
        if (questionDetails.getSources() != null) {
            // clear existing sources (due to orphanRemoval this deletes them)
            question.getSources().clear();
            for (com.testshaper.entity.QuestionSource source : questionDetails.getSources()) {
                source.setQuestion(question);
                question.getSources().add(source);
            }
        }

        Question savedQuestion = questionRepository.save(question);

        // Update Options if it's MCQ and options are provided
        if (question.getType() == Question.QuestionType.MCQ && options != null) {
            // Validate new options
            if (options.size() < 2) {
                throw new IllegalArgumentException("MCQ must have at least 2 options.");
            }
            long correctCount = options.stream().filter(QuestionOption::isCorrect).count();
            if (correctCount != 1) {
                throw new IllegalArgumentException("MCQ must have exactly one correct answer.");
            }

            // Remove existing options
            List<QuestionOption> existingOptions = optionRepository.findByQuestionIdOrderByOptionLabelAsc(id);
            optionRepository.deleteAll(existingOptions);

            // Add new options
            for (QuestionOption opt : options) {
                opt.setQuestion(savedQuestion);
                optionRepository.save(opt);
            }
        }

        return savedQuestion;
    }

    @Override
    @Transactional
    public void approveQuestionsBulk(List<UUID> ids, String approverId) {
        for (UUID id : ids) {
            approveQuestion(id, approverId);
        }
    }

    @Override
    @Transactional
    public void rejectQuestionsBulk(List<UUID> ids) {
        for (UUID id : ids) {
            rejectQuestion(id);
        }
    }

    @Override
    @Transactional
    public void updateStatusBulk(List<UUID> ids, Question.QuestionStatus status, String approverId) {
        for (UUID id : ids) {
            if (status == Question.QuestionStatus.APPROVED) {
                approveQuestion(id, approverId);
            } else if (status == Question.QuestionStatus.REJECTED) {
                rejectQuestion(id);
            } else {
                Question question = getQuestion(id);
                question.setStatus(status);
                questionRepository.save(question);
            }
        }
    }

    // --- Revision / Pull Request Core System ---

    @Override
    @Transactional
    public Question submitRevision(UUID originalQuestionId, Question revisionDraft, List<QuestionOption> options, String userEmail, String versionComment) {
        Question original = getQuestion(originalQuestionId);
        
        boolean autoApprove = false;
        java.util.Optional<com.testshaper.entity.User> userOpt = userRepository.findByEmail(userEmail);
        if (userOpt.isPresent()) {
            com.testshaper.entity.User user = userOpt.get();
            boolean isSuperAdmin = user.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_SUPER_ADMIN"));
            boolean isDefaultInstitute = user.getInstitute() != null && "DEFAULT-001".equals(user.getInstitute().getCode());
            if (isSuperAdmin || isDefaultInstitute) {
                autoApprove = true;
            }
        }

        // Ensure this is a child draft
        revisionDraft.setParentQuestionId(originalQuestionId);
        revisionDraft.setVersionComment(versionComment);
        revisionDraft.setCreatedBy(userEmail);
        
        // Keep draft's status if already set, otherwise default to REVISED
        if (revisionDraft.getStatus() == null || revisionDraft.getStatus() == Question.QuestionStatus.PENDING) {
            revisionDraft.setStatus(Question.QuestionStatus.REVISED);
        }
        
        // Copy relational mappings from original if not provided or fetch managed references to avoid detached entity version errors
        if (revisionDraft.getClassSubject() != null && revisionDraft.getClassSubject().getId() != null) {
            revisionDraft.setClassSubject(entityManager.getReference(com.testshaper.entity.ClassSubject.class, revisionDraft.getClassSubject().getId()));
        } else {
            revisionDraft.setClassSubject(original.getClassSubject());
        }

        if (revisionDraft.getChapter() != null && revisionDraft.getChapter().getId() != null) {
            revisionDraft.setChapter(entityManager.getReference(com.testshaper.entity.Chapter.class, revisionDraft.getChapter().getId()));
        } else {
            revisionDraft.setChapter(original.getChapter());
        }

        if (revisionDraft.getTopic() != null && revisionDraft.getTopic().getId() != null) {
            revisionDraft.setTopic(entityManager.getReference(com.testshaper.entity.Topic.class, revisionDraft.getTopic().getId()));
        } else {
            revisionDraft.setTopic(original.getTopic());
        }

        if (revisionDraft.getType() == null) revisionDraft.setType(original.getType());

        Question savedDraft = questionRepository.save(revisionDraft);

        if (options != null && !options.isEmpty()) {
            java.util.List<QuestionOption> savedOptions = new java.util.ArrayList<>();
            for (QuestionOption opt : options) {
                opt.setQuestion(savedDraft);
                savedOptions.add(optionRepository.save(opt));
            }
            savedDraft.setOptions(savedOptions);
        }

        if (autoApprove) {
            return approveRevision(savedDraft.getId(), userEmail);
        }

        // Notify Admins
        java.util.List<com.testshaper.entity.User> admins = userRepository.findAllSuperAdmins();
        for (com.testshaper.entity.User admin : admins) {
            feedbackService.sendNotification(
                    admin.getId(),
                    "New Revision Request 📝",
                    "A user (" + userEmail + ") has requested a revision. Please review it.",
                    "SYSTEM",
                    savedDraft.getId().toString()
            );
        }

        return savedDraft;
    }

    @Override
    @Transactional
    public Question approveRevision(UUID revisionId, String approverId) {
        Question revision = getQuestion(revisionId);
        if (revision.getParentQuestionId() == null) {
            throw new IllegalArgumentException("This is not a revision, it has no parent question.");
        }

        Question original = getQuestion(revision.getParentQuestionId());

        // 1. Overwrite original fields with revision fields
        original.setQuestionText(revision.getQuestionText());
        original.setStimulus(revision.getStimulus());
        original.setMarks(revision.getMarks());
        original.setDifficulty(revision.getDifficulty());
        original.setLanguage(revision.getLanguage());
        original.setExplanation(revision.getExplanation());
        original.setBloomLevel(revision.getBloomLevel());
        if (revision.getClassSubject() != null && revision.getClassSubject().getId() != null) {
            original.setClassSubject(entityManager.getReference(com.testshaper.entity.ClassSubject.class, revision.getClassSubject().getId()));
        } else {
            original.setClassSubject(null);
        }
        if (revision.getChapter() != null && revision.getChapter().getId() != null) {
            original.setChapter(entityManager.getReference(com.testshaper.entity.Chapter.class, revision.getChapter().getId()));
        } else {
            original.setChapter(null);
        }
        if (revision.getTopic() != null && revision.getTopic().getId() != null) {
            original.setTopic(entityManager.getReference(com.testshaper.entity.Topic.class, revision.getTopic().getId()));
        } else {
            original.setTopic(null);
        }
        original.setCorrectAnswer(revision.getCorrectAnswer());
        original.setMcqType(revision.getMcqType());
        if (revision.getStatements() != null) {
            original.setStatements(new java.util.ArrayList<>(revision.getStatements()));
        } else {
            original.setStatements(new java.util.ArrayList<>());
        }
        original.setStatus(Question.QuestionStatus.APPROVED); // Ensure original stays APPROVED after merge

        // 2. Erase old options, copy new ones
        if (revision.getType() == Question.QuestionType.MCQ) {
            List<QuestionOption> oldOptions = optionRepository.findByQuestionIdOrderByOptionLabelAsc(original.getId());
            optionRepository.deleteAll(oldOptions);

            List<QuestionOption> newOptions = optionRepository.findByQuestionIdOrderByOptionLabelAsc(revision.getId());
            List<QuestionOption> savedOptions = new java.util.ArrayList<>();
            for (QuestionOption opt : newOptions) {
                // Duplicate the option to detach from revision
                QuestionOption cl = new QuestionOption();
                cl.setOptionText(opt.getOptionText());
                cl.setCorrect(opt.isCorrect());
                cl.setOptionLabel(opt.getOptionLabel());
                cl.setImagePath(opt.getImagePath());
                cl.setQuestion(original);
                savedOptions.add(optionRepository.save(cl));
            }
            original.setOptions(savedOptions);
        }

        questionRepository.save(original);

        String creatorEmail = revision.getCreatedBy();

        // 3. Delete the revision draft entirely to prevent it from cluttering the Question Banks
        deleteQuestion(revision.getId());

        // 4. Look up user by email to award XP
        if (creatorEmail != null) {
            userRepository.findByEmail(creatorEmail).ifPresent(u -> {
                feedbackService.awardXP(u.getId(), 10);
                feedbackService.sendNotification(
                        u.getId(),
                        "Revision Approved! 🎉",
                        "Your proposed edit to a question has been approved by the administrators.",
                        "REVISION_APPROVED",
                        original.getId().toString()
                );
            });
        }

        return original;
    }

    @Override
    @Transactional
    public void updateOptionsInPlace(UUID questionId, List<QuestionOption> incomingOptions) {
        Question q = questionRepository.findById(questionId)
            .orElseThrow(() -> new RuntimeException("Question not found"));

        if (incomingOptions != null && !incomingOptions.isEmpty()) {
            java.util.Map<UUID, QuestionOption> existingMap = q.getOptions().stream()
                .filter(opt -> opt.getId() != null)
                .collect(java.util.stream.Collectors.toMap(QuestionOption::getId, opt -> opt));

            java.util.List<QuestionOption> updatedOptions = new java.util.ArrayList<>();
            for (QuestionOption inc : incomingOptions) {
                if (inc.getId() != null && existingMap.containsKey(inc.getId())) {
                    QuestionOption ext = existingMap.get(inc.getId());
                    ext.setOptionText(inc.getOptionText());
                    ext.setCorrect(inc.isCorrect());
                    updatedOptions.add(ext);
                } else {
                    inc.setQuestion(q);
                    updatedOptions.add(inc);
                }
            }

            q.getOptions().clear();
            q.getOptions().addAll(updatedOptions);
        }
        questionRepository.save(q);
    }

    @Override
    public java.util.List<Question> getMyPendingRevisions(java.util.List<UUID> originalQuestionIds, String userEmail) {
        if (originalQuestionIds == null || originalQuestionIds.isEmpty()) {
            return new java.util.ArrayList<>();
        }
        return questionRepository.findPendingRevisionsByParentIdsAndCreator(originalQuestionIds, userEmail);
    }
}
