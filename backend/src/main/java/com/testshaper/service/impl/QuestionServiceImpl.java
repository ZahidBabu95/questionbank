package com.testshaper.service.impl;

import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import com.testshaper.entity.QuestionSource;
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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

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
    private final com.testshaper.repository.AppNotificationRepository notificationRepository;

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags"}, allEntries = true)
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
        if (Boolean.TRUE.equals(question.getAiGenerated())) {
            question.setStatus(Question.QuestionStatus.DRAFT);
        } else {
            question.setStatus(Question.QuestionStatus.PENDING); // Default status
        }
        
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
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags"}, allEntries = true)
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
            } else if (Boolean.TRUE.equals(question.getAiGenerated())) {
                question.setStatus(Question.QuestionStatus.DRAFT);
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
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags"}, allEntries = true)
    public Question createShortQuestion(Question question) {
        if (question.getType() == null || question.getType().isEmpty()) {
            question.setType(Question.QuestionType.SHORT.name());
        }
        if (Boolean.TRUE.equals(question.getAiGenerated())) {
            question.setStatus(Question.QuestionStatus.DRAFT);
        } else {
            question.setStatus(Question.QuestionStatus.PENDING);
        }
        if (question.getSources() != null) {
            for (com.testshaper.entity.QuestionSource source : question.getSources()) {
                source.setQuestion(question);
            }
        }

        // Backward-Compatibility Parser: Convert dynamic_data JSON inputs to legacy relational tables/columns
        if (question.getDynamicData() != null && !question.getDynamicData().isEmpty()) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(question.getDynamicData());

                // 1. MCQ Compatibility
                if ("MCQ".equalsIgnoreCase(question.getType()) || "MULTIPLE_CHOICE".equalsIgnoreCase(question.getType())) {
                    if (node.has("stimulus")) {
                        question.setStimulus(node.get("stimulus").asText());
                    }
                    if (node.has("questionText")) {
                        question.setQuestionText(node.get("questionText").asText());
                    }
                    if (node.has("mcqType")) {
                        question.setMcqType(node.get("mcqType").asText());
                    }
                    if (node.has("explanation")) {
                        question.setExplanation(node.get("explanation").asText());
                    }

                    // Save parent question first to establish UUID for foreign key mapping
                    Question savedQuestion = questionRepository.save(question);

                    if (node.has("options") && node.get("options").isArray()) {
                        JsonNode optionsNode = node.get("options");
                        List<QuestionOption> optionsList = new java.util.ArrayList<>();
                        char labelChar = 'ক';
                        for (int i = 0; i < optionsNode.size(); i++) {
                            JsonNode optNode = optionsNode.get(i);
                            QuestionOption opt = new QuestionOption();
                            opt.setQuestion(savedQuestion);
                            opt.setOptionLabel(String.valueOf((char) (labelChar + i)));
                            opt.setOptionText(optNode.has("text") ? optNode.get("text").asText() : "");

                            boolean isCorrect = false;
                            if (optNode.has("isCorrect")) {
                                String isCorrectStr = optNode.get("isCorrect").asText();
                                isCorrect = "true".equalsIgnoreCase(isCorrectStr) || "1".equals(isCorrectStr);
                            }
                            opt.setCorrect(isCorrect);
                            optionsList.add(opt);
                        }

                        // Extract and set correct answer text in parent
                        optionsList.stream().filter(QuestionOption::isCorrect).findFirst()
                                .ifPresent(opt -> savedQuestion.setCorrectAnswer(opt.getOptionText()));

                        optionRepository.saveAll(optionsList);
                        savedQuestion.setOptions(optionsList);
                    }
                    return savedQuestion;
                }

                // 2. CQ Compatibility
                if ("CQ".equalsIgnoreCase(question.getType()) || "CREATIVE".equalsIgnoreCase(question.getType())) {
                    String stem = node.has("stimulus") ? node.get("stimulus").asText() : "";
                    question.setStimulus(stem);

                    if (node.has("subQuestions") && node.get("subQuestions").isArray()) {
                        JsonNode subQNode = node.get("subQuestions");
                        StringBuilder combinedHtml = new StringBuilder();
                        combinedHtml.append("<div class=\"cq-stem\">").append(stem).append("</div>");
                        combinedHtml.append("<div class=\"cq-questions\"><ol type=\"a\">");

                        for (int i = 0; i < subQNode.size(); i++) {
                            JsonNode sq = subQNode.get(i);
                            String label = sq.has("label") ? sq.get("label").asText() : String.valueOf((char) ('ক' + i));
                            String text = sq.has("text") ? sq.get("text").asText() : "";
                            String marksVal = sq.has("marks") ? sq.get("marks").asText() : "1";

                            combinedHtml.append("<li data-marks=\"").append(marksVal).append("\">")
                                    .append("<span class=\"cq-text\">").append(text).append("</span> ")
                                    .append("<span class=\"cq-marks\">(").append(marksVal).append(")</span></li>");
                        }
                        combinedHtml.append("</ol></div>");
                        question.setQuestionText(combinedHtml.toString());
                    }

                    if (question.getMarks() == null || question.getMarks() == 0) {
                        question.setMarks(10.0);
                    }
                }

                // 3. SHORT Compatibility
                if ("SHORT".equalsIgnoreCase(question.getType()) || "SHORT_ANSWER".equalsIgnoreCase(question.getType())) {
                    if (node.has("questionText")) {
                        question.setQuestionText(node.get("questionText").asText());
                    }
                    if (node.has("stimulus")) {
                        question.setStimulus(node.get("stimulus").asText());
                    }
                    if (node.has("correctAnswer")) {
                        question.setCorrectAnswer(node.get("correctAnswer").asText());
                    }
                    if (node.has("explanation")) {
                        question.setExplanation(node.get("explanation").asText());
                    }
                }
            } catch (Exception e) {
                // Non-fatal parse failure fallback: let default JPA save run
                System.err.println("Non-fatal error parsing dynamic data JSON: " + e.getMessage());
            }
        }

        return questionRepository.save(question);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags"}, allEntries = true)
    public Question createCQ(Question question) {
        if (question.getType() == null || question.getType().isEmpty()) {
            question.setType(Question.QuestionType.CQ.name());
        }
        if (Boolean.TRUE.equals(question.getAiGenerated())) {
            question.setStatus(Question.QuestionStatus.DRAFT);
        } else {
            question.setStatus(Question.QuestionStatus.PENDING);
        }
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
    @org.springframework.cache.annotation.Cacheable(value = "questionsBank", key = "#filters.get('subjectId') != null ? 'subject:' + #filters.get('subjectId') + ':qbank:' + #filters.hashCode() + '_' + #pageable.pageNumber : 'global:qbank:' + #filters.hashCode() + '_' + #pageable.pageNumber", unless = "#result == null")
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
            Object result = entityManager.createNativeQuery("SELECT CAST(id AS CHAR) FROM institutes WHERE code = 'DEFAULT-001'")
                    .setMaxResults(1)
                    .getSingleResult();
            if (result != null) {
                globalTenantId = result.toString();
            }
        } catch (Exception e) {
            // ignore if not found
        }
        if (globalTenantId == null) {
            globalTenantId = "0c430840-39f2-4645-b2e4-53d62c8e4b49"; // Default Institute UUID fallback
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
                filters.get("sourceSchools"),
                filters.get("filterUnanswered")
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
            Object result = entityManager.createNativeQuery("SELECT CAST(id AS CHAR) FROM institutes WHERE code = 'DEFAULT-001'")
                    .setMaxResults(1)
                    .getSingleResult();
            if (result != null) {
                globalTenantId = result.toString();
            }
        } catch (Exception e) {
            // ignore if not found
        }
        if (globalTenantId == null) {
            globalTenantId = "0c430840-39f2-4645-b2e4-53d62c8e4b49"; // Default Institute UUID fallback
        }
        
        String subjectIdFilter = filters.get("subjectId");
        if (subjectIdFilter == null || subjectIdFilter.isEmpty()) {
            subjectIdFilter = filters.get("classSubjectId");
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
                subjectIdFilter,
                filters.get("chapterId"),
                filters.get("topicId"),
                filters.get("className"),
                filters.get("subjectName"),
                allowedSubjectIds,
                globalTenantId,
                filters.get("sourceBoards"),
                filters.get("sourceYears"),
                filters.get("sourceSchools"),
                filters.get("filterUnanswered")
            );

        // OPTIMIZED ID PROJECTION: 
        // Do not load full entities. Just select the UUIDs directly using Criteria API.
        jakarta.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        jakarta.persistence.criteria.CriteriaQuery<UUID> cq = cb.createQuery(UUID.class);
        jakarta.persistence.criteria.Root<Question> root = cq.from(Question.class);
        
        cq.select(root.get("id"));
        
        jakarta.persistence.criteria.Predicate predicate = spec.toPredicate(root, cq, cb);
        
        String sourceMode = filters.get("sourceMode");
        if ("FAVORITES".equalsIgnoreCase(sourceMode)) {
            jakarta.persistence.criteria.Root<com.testshaper.entity.QuestionFavorite> qfRoot = cq.from(com.testshaper.entity.QuestionFavorite.class);
            jakarta.persistence.criteria.Predicate qfJoin = cb.equal(qfRoot.get("question"), root);
            String currentUser = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            jakarta.persistence.criteria.Predicate qfUser = cb.equal(qfRoot.get("user").get("email"), currentUser);
            
            predicate = cb.and(predicate, qfJoin, qfUser);
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(sourceMode)) {
            String lectureIdsStr = filters.get("lectureIds");
            if (org.springframework.util.StringUtils.hasText(lectureIdsStr)) {
                List<UUID> lectureIds = java.util.Arrays.stream(lectureIdsStr.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(UUID::fromString)
                        .collect(java.util.stream.Collectors.toList());
                if (!lectureIds.isEmpty()) {
                    jakarta.persistence.criteria.Root<com.testshaper.entity.LectureQuestion> lqRoot = cq.from(com.testshaper.entity.LectureQuestion.class);
                    jakarta.persistence.criteria.Predicate lqJoin = cb.equal(lqRoot.get("question"), root);
                    jakarta.persistence.criteria.Predicate lqLecture = lqRoot.get("lecture").get("id").in(lectureIds);
                    
                    predicate = cb.and(predicate, lqJoin, lqLecture);
                } else {
                    predicate = cb.and(predicate, cb.or());
                }
            } else {
                predicate = cb.and(predicate, cb.or());
            }
        }

        String unusedOnlyStr = filters.get("unusedOnly");
        if ("true".equalsIgnoreCase(unusedOnlyStr)) {
            jakarta.persistence.criteria.Subquery<Long> sub = cq.subquery(Long.class);
            jakarta.persistence.criteria.Root<com.testshaper.entity.ExamQuestion> subRoot = sub.from(com.testshaper.entity.ExamQuestion.class);
            sub.select(cb.count(subRoot));
            sub.where(cb.equal(subRoot.get("question"), root));
            predicate = cb.and(predicate, cb.equal(sub, 0L));
        } else {
            String examIdsStr = filters.get("examIds");
            if (org.springframework.util.StringUtils.hasText(examIdsStr)) {
                List<UUID> examIds = java.util.Arrays.stream(examIdsStr.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(UUID::fromString)
                        .collect(java.util.stream.Collectors.toList());
                if (!examIds.isEmpty()) {
                    jakarta.persistence.criteria.Root<com.testshaper.entity.ExamQuestion> eqRoot = cq.from(com.testshaper.entity.ExamQuestion.class);
                    jakarta.persistence.criteria.Predicate eqJoin = cb.equal(eqRoot.get("question"), root);
                    jakarta.persistence.criteria.Predicate eqExam = eqRoot.get("exam").get("id").in(examIds);
                    
                    predicate = cb.and(predicate, eqJoin, eqExam);
                } else {
                    predicate = cb.and(predicate, cb.or());
                }
            } else {
                String usedOnlyStr = filters.get("usedOnly");
                if ("true".equalsIgnoreCase(usedOnlyStr)) {
                    jakarta.persistence.criteria.Root<com.testshaper.entity.ExamQuestion> eqRoot = cq.from(com.testshaper.entity.ExamQuestion.class);
                    jakarta.persistence.criteria.Predicate eqJoin = cb.equal(eqRoot.get("question"), root);
                    predicate = cb.and(predicate, eqJoin);
                }
            }
        }
        
        if (predicate != null) {
            cq.where(predicate);
        }
        
        return entityManager.createQuery(cq).getResultList();
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "sourceTags", key = "#filters != null ? #filters.hashCode() : 0")
    public java.util.Map<String, Object> getSourceTags(java.util.Map<String, String> filters) {
        String classSubjectIdStr = filters != null ? filters.get("classSubjectId") : null;
        if (classSubjectIdStr == null || classSubjectIdStr.isEmpty()) {
            classSubjectIdStr = filters != null ? filters.get("subjectId") : null;
        }
        if (classSubjectIdStr == null || classSubjectIdStr.isEmpty()) {
            return java.util.Collections.emptyMap();
        }
        UUID csId;
        try {
            csId = UUID.fromString(classSubjectIdStr);
        } catch (Exception e) {
            return java.util.Collections.emptyMap();
        }

        String jpql = "SELECT qs.organizationName, qs.examYear, qs.sourceType, COUNT(DISTINCT q.id) " +
                      "FROM Question q JOIN q.sources qs " +
                      "WHERE q.classSubject.id = :csId AND q.deleted = false AND q.status = :status ";

        String language = filters != null ? filters.get("language") : null;
        if (org.springframework.util.StringUtils.hasText(language) && !"ALL".equalsIgnoreCase(language)) {
            jpql += "AND (q.language = :lang OR q.language = 'Bilingual' OR :lang = 'Bilingual' OR q.language IS NULL OR q.language = '') ";
        }

        jpql += "GROUP BY qs.organizationName, qs.examYear, qs.sourceType";

        var query = entityManager.createQuery(jpql, Object[].class)
                .setParameter("csId", csId)
                .setParameter("status", Question.QuestionStatus.APPROVED);

        if (org.springframework.util.StringUtils.hasText(language) && !"ALL".equalsIgnoreCase(language)) {
            query.setParameter("lang", language);
        }

        List<Object[]> rows = query.getResultList();

        java.util.Map<String, Integer> boardCounts = new java.util.HashMap<>();
        java.util.Map<String, Integer> yearCounts = new java.util.HashMap<>();
        java.util.Map<String, Integer> schoolCounts = new java.util.HashMap<>();

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
    @org.springframework.cache.annotation.Cacheable(value = "questionStats", key = "#filters != null ? #filters.hashCode() : 0")
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
            Object result = entityManager.createNativeQuery("SELECT CAST(id AS CHAR) FROM institutes WHERE code = 'DEFAULT-001'")
                    .setMaxResults(1)
                    .getSingleResult();
            if (result != null) {
                globalTenantId = result.toString();
            }
        } catch (Exception e) {
            // ignore if not found
        }
        if (globalTenantId == null) {
            globalTenantId = "0c430840-39f2-4645-b2e4-53d62c8e4b49"; // Default Institute UUID fallback
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
                filters != null ? filters.get("sourceSchools") : null,
                filters != null ? filters.get("filterUnanswered") : null
            );

        // OPTIMIZED STATS PROJECTION: 3 counts in 1 query
        jakarta.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        jakarta.persistence.criteria.CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
        jakarta.persistence.criteria.Root<Question> root = cq.from(Question.class);

        cq.multiselect(
            cb.count(root),
            cb.sum(cb.<Integer>selectCase().when(cb.equal(root.get("status"), Question.QuestionStatus.APPROVED), 1).otherwise(0)),
            cb.sum(cb.<Integer>selectCase().when(cb.equal(root.get("status"), Question.QuestionStatus.PENDING), 1).otherwise(0))
        );

        jakarta.persistence.criteria.Predicate predicate = baseSpec.toPredicate(root, cq, cb);
        if (predicate != null) {
            cq.where(predicate);
        }

        Object[] statsResult = entityManager.createQuery(cq).getSingleResult();
        totalQuestions = statsResult[0] != null ? ((Number) statsResult[0]).longValue() : 0;
        totalApproved = statsResult[1] != null ? ((Number) statsResult[1]).longValue() : 0;
        totalPending = statsResult[2] != null ? ((Number) statsResult[2]).longValue() : 0;

        if (filters != null && filters.get("subjectId") != null && !filters.get("subjectId").isEmpty()) {
            totalSubjects = totalQuestions > 0 ? 1 : 0;
        } else {
            jakarta.persistence.criteria.CriteriaQuery<Long> cqSub = cb.createQuery(Long.class);
            jakarta.persistence.criteria.Root<Question> subRoot = cqSub.from(Question.class);
            cqSub.select(cb.countDistinct(subRoot.get("classSubject").get("id")));
            jakarta.persistence.criteria.Predicate subPredicate = baseSpec.toPredicate(subRoot, cqSub, cb);
            if (subPredicate != null) {
                cqSub.where(subPredicate);
            }
            totalSubjects = entityManager.createQuery(cqSub).getSingleResult();
        }
        // 1. Get counts grouped by question type (MCQ, CQ, SHORT, etc.)
        org.springframework.data.jpa.domain.Specification<Question> statsSpec = 
            com.testshaper.specification.QuestionSpecification.filterQuestions(
                tenantId,
                null,
                null, // null so we get counts for all types
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
                filters != null ? filters.get("sourceSchools") : null,
                null // null so we count both answered and unanswered
            );

        jakarta.persistence.criteria.CriteriaQuery<Object[]> cqGroup = cb.createQuery(Object[].class);
        jakarta.persistence.criteria.Root<Question> groupRoot = cqGroup.from(Question.class);
        cqGroup.multiselect(groupRoot.get("type"), cb.count(groupRoot));
        cqGroup.groupBy(groupRoot.get("type"));
        jakarta.persistence.criteria.Predicate groupPredicate = statsSpec.toPredicate(groupRoot, cqGroup, cb);
        if (groupPredicate != null) {
            cqGroup.where(groupPredicate);
        }
        java.util.List<Object[]> typeCounts = entityManager.createQuery(cqGroup).getResultList();
        java.util.Map<String, Long> questionTypeCounts = new java.util.HashMap<>();
        for (Object[] row : typeCounts) {
            String typeName = (String) row[0];
            Long typeCount = (Long) row[1];
            if (typeName != null) {
                questionTypeCounts.put(typeName, typeCount);
            }
        }

        // 2. Get unanswered questions count matching active filters
        org.springframework.data.jpa.domain.Specification<Question> unansweredSpec = 
            com.testshaper.specification.QuestionSpecification.filterQuestions(
                tenantId,
                null,
                null, // null to search across all types
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
                filters != null ? filters.get("sourceSchools") : null,
                "true" // filterUnanswered as true
            );

        jakarta.persistence.criteria.CriteriaQuery<Long> cqUnanswered = cb.createQuery(Long.class);
        jakarta.persistence.criteria.Root<Question> unansweredRoot = cqUnanswered.from(Question.class);
        cqUnanswered.select(cb.count(unansweredRoot));
        jakarta.persistence.criteria.Predicate unansweredPredicate = unansweredSpec.toPredicate(unansweredRoot, cqUnanswered, cb);
        if (unansweredPredicate != null) {
            cqUnanswered.where(unansweredPredicate);
        }
        Long unansweredCount = entityManager.createQuery(cqUnanswered).getSingleResult();

        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalQuestions", totalQuestions);
        stats.put("totalApproved", totalApproved);
        stats.put("totalPending", totalPending);
        stats.put("totalSubjects", totalSubjects);
        stats.put("typeCounts", questionTypeCounts);
        stats.put("unansweredCount", unansweredCount != null ? unansweredCount : 0L);
        return stats;
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
    public void deleteQuestion(UUID id) {
        // Options cascade delete? Or manual?
        // For now, let's assume manual since we didn't set cascade in entity (kept
        // simple base entity)
        likeRepository.deleteByQuestionId(id);
        favoriteRepository.deleteByQuestionId(id);
        sourceRepository.deleteByQuestionId(id);
        examQuestionRepository.deleteByQuestionId(id);
        lectureQuestionRepository.deleteByQuestionId(id);
        notificationRepository.deleteByRelatedEntityId(id.toString());
        java.util.Optional<Question> qOpt = questionRepository.findById(id);
        if (qOpt.isPresent()) {
            Question q = qOpt.get();
            java.util.List<QuestionOption> oldOptions = new java.util.ArrayList<>(q.getOptions());
            q.getOptions().clear();
            for (QuestionOption opt : oldOptions) {
                optionRepository.delete(opt);
            }
            optionRepository.flush();
            questionRepository.saveAndFlush(q);
        }
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
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
    public void deleteQuestionsBulk(List<UUID> ids) {
        for (UUID id : ids) {
            deleteQuestion(id);
        }
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
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
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
    public Question rejectQuestion(UUID id) {
        return rejectQuestion(id, null, null);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
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
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
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
        }
        if (questionDetails.getChapter() != null && questionDetails.getChapter().getId() != null) {
            question.setChapter(entityManager.getReference(com.testshaper.entity.Chapter.class, questionDetails.getChapter().getId()));
        }
        if (questionDetails.getTopic() != null && questionDetails.getTopic().getId() != null) {
            question.setTopic(entityManager.getReference(com.testshaper.entity.Topic.class, questionDetails.getTopic().getId()));
        }
        if (questionDetails.getMcqType() != null) {
            question.setMcqType(questionDetails.getMcqType());
        }
        if (questionDetails.getStatements() != null) {
            question.setStatements(new java.util.ArrayList<>(questionDetails.getStatements()));
        }

        // Return status to PENDING on edit only if it was DRAFT
        if (question.getStatus() == Question.QuestionStatus.DRAFT) {
            question.setStatus(Question.QuestionStatus.PENDING);
        }


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
        if (Question.QuestionType.MCQ.name().equals(question.getType()) && options != null) {
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
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
    public void approveQuestionsBulk(List<UUID> ids, String approverId) {
        for (UUID id : ids) {
            approveQuestion(id, approverId);
        }
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
    public void rejectQuestionsBulk(List<UUID> ids) {
        for (UUID id : ids) {
            rejectQuestion(id);
        }
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
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
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
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
        
        // Ensure child sources are copied correctly for the revision draft
        if (revisionDraft.getSources() != null && !revisionDraft.getSources().isEmpty()) {
            for (QuestionSource src : revisionDraft.getSources()) {
                src.setQuestion(revisionDraft);
                src.setId(null); // Force insert of new copies for the draft
            }
        } else {
            // Copy sources from original if not provided or empty
            if (original.getSources() != null && !original.getSources().isEmpty()) {
                java.util.List<QuestionSource> copiedSources = new java.util.ArrayList<>();
                for (QuestionSource src : original.getSources()) {
                    QuestionSource cl = new QuestionSource();
                    cl.setSourceType(src.getSourceType());
                    cl.setExamYear(src.getExamYear());
                    cl.setOrganizationName(src.getOrganizationName());
                    cl.setExamName(src.getExamName());
                    cl.setSession(src.getSession());
                    cl.setNote(src.getNote());
                    cl.setQuestion(revisionDraft);
                    copiedSources.add(cl);
                }
                revisionDraft.setSources(copiedSources);
            }
        }
        
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
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
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

        // 2. Erase old options, copy new ones using orphan removal to avoid detached update attempts
        if ("MCQ".equals(original.getType()) || "MCQ".equals(revision.getType())) {
            java.util.List<QuestionOption> oldOptions = new java.util.ArrayList<>(original.getOptions());
            original.getOptions().clear();
            for (QuestionOption opt : oldOptions) {
                optionRepository.delete(opt);
            }
            optionRepository.flush();
            questionRepository.saveAndFlush(original);

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
            original.getOptions().addAll(savedOptions);
        }

        // 2.5. Update sources on approval using direct repository delete to avoid orphan removal null-column issue
        if (revision.getSources() != null) {
            sourceRepository.deleteByQuestionId(original.getId());
            original.getSources().clear();
            questionRepository.saveAndFlush(original);
            
            for (QuestionSource src : revision.getSources()) {
                QuestionSource cl = new QuestionSource();
                cl.setSourceType(src.getSourceType());
                cl.setExamYear(src.getExamYear());
                cl.setOrganizationName(src.getOrganizationName());
                cl.setExamName(src.getExamName());
                cl.setSession(src.getSession());
                cl.setNote(src.getNote());
                cl.setQuestion(original);
                sourceRepository.save(cl);
                original.getSources().add(cl);
            }
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
    @org.springframework.cache.annotation.CacheEvict(value = {"questionStats", "sourceTags", "questionsAvailability"}, allEntries = true)
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

    @Override
    public java.util.Map<String, Object> getQuestionAvailability(UUID classSubjectId, String language) {
        com.testshaper.dto.QuestionSearchParams params = new com.testshaper.dto.QuestionSearchParams();
        params.setClassSubjectId(classSubjectId);
        params.setLanguage(language);
        return getQuestionAvailability(params);
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "questionsAvailability", key = "#params != null ? #params.hashCode() : 0")
    public java.util.Map<String, Object> getQuestionAvailability(com.testshaper.dto.QuestionSearchParams params) {
        StringBuilder jpql = new StringBuilder(
                "SELECT q.chapter.id, q.topic.id, q.type, q.difficulty, COUNT(DISTINCT q.id) " +
                "FROM Question q ");

        // Joins
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

        // Base conditions
        jpql.append("WHERE q.classSubject.id = :csId AND q.deleted = false AND q.status = :status ");

        if (org.springframework.util.StringUtils.hasText(params.getLanguage()) && !"ALL".equalsIgnoreCase(params.getLanguage())) {
            jpql.append("AND (q.language = :lang OR q.language = 'Bilingual' OR :lang = 'Bilingual' OR q.language IS NULL OR q.language = '') ");
        }

        // Sourcing filters
        if ("FAVORITES".equalsIgnoreCase(params.getSourceMode())) {
            String currentUser = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            jpql.append("AND qf.user.email = :currentUser ");
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(params.getSourceMode()) && params.getLectureIds() != null && !params.getLectureIds().isEmpty()) {
            jpql.append("AND lq.lecture.id IN :lectureIds ");
        }

        if (hasBoard) {
            jpql.append("AND qs.sourceType = :boardExamType AND LOWER(qs.organizationName) IN :boards ");
        }
        if (hasYear) {
            jpql.append("AND qs.examYear IN :years ");
        }
        if (hasSchool) {
            jpql.append("AND qs.sourceType = :institutionTestType AND LOWER(qs.organizationName) IN :schools ");
        }

        jpql.append("GROUP BY q.chapter.id, q.topic.id, q.type, q.difficulty");

        var query = entityManager.createQuery(jpql.toString(), Object[].class)
                .setParameter("csId", params.getClassSubjectId())
                .setParameter("status", Question.QuestionStatus.APPROVED);

        if (org.springframework.util.StringUtils.hasText(params.getLanguage()) && !"ALL".equalsIgnoreCase(params.getLanguage())) {
            query.setParameter("lang", params.getLanguage());
        }

        if ("FAVORITES".equalsIgnoreCase(params.getSourceMode())) {
            String currentUser = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            query.setParameter("currentUser", currentUser);
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(params.getSourceMode()) && params.getLectureIds() != null && !params.getLectureIds().isEmpty()) {
            query.setParameter("lectureIds", params.getLectureIds());
        }

        if (hasBoard) {
            query.setParameter("boards", params.getBoards().stream().map(String::toLowerCase).collect(java.util.stream.Collectors.toList()));
            query.setParameter("boardExamType", com.testshaper.entity.QuestionSource.SourceType.BOARD_EXAM);
        }
        if (hasYear) {
            query.setParameter("years", params.getYears());
        }
        if (hasSchool) {
            query.setParameter("schools", params.getSchools().stream().map(String::toLowerCase).collect(java.util.stream.Collectors.toList()));
            query.setParameter("institutionTestType", com.testshaper.entity.QuestionSource.SourceType.INSTITUTION_TEST);
        }

        java.util.List<Object[]> rows = query.getResultList();

        java.util.Map<String, java.util.Map<String, java.util.Map<String, Integer>>> chapterCounts = new java.util.HashMap<>();
        java.util.Map<String, java.util.Map<String, java.util.Map<String, Integer>>> topicCounts = new java.util.HashMap<>();

        for (Object[] row : rows) {
            UUID chapUuid = (UUID) row[0];
            UUID topUuid = (UUID) row[1];
            String type = (String) row[2];
            Question.DifficultyLevel diff = (Question.DifficultyLevel) row[3];
            Long countVal = (Long) row[4];
            int count = countVal != null ? countVal.intValue() : 0;

            String chapId = chapUuid != null ? chapUuid.toString() : null;
            String topId = topUuid != null ? topUuid.toString() : null;
            String diffStr = diff != null ? diff.name() : "MEDIUM";

            // Map Chapter counts
            if (chapId != null) {
                chapterCounts.computeIfAbsent(chapId, k -> new java.util.HashMap<>())
                             .computeIfAbsent(type, k -> new java.util.HashMap<>())
                             .merge(diffStr, count, Integer::sum);
            }

            // Map Topic counts
            if (topId != null) {
                topicCounts.computeIfAbsent(topId, k -> new java.util.HashMap<>())
                           .computeIfAbsent(type, k -> new java.util.HashMap<>())
                           .merge(diffStr, count, Integer::sum);
            }
        }

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("chapters", chapterCounts);
        result.put("topics", topicCounts);
        return result;
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "questionsAvailability", key = "{#classSubjectIds, #language}")
    public java.util.Map<UUID, Boolean> getQuestionsAvailabilityBulk(java.util.List<UUID> classSubjectIds, String language) {
        java.util.Map<UUID, Boolean> result = new java.util.HashMap<>();
        if (classSubjectIds == null || classSubjectIds.isEmpty()) {
            return result;
        }
        
        for (UUID id : classSubjectIds) {
            result.put(id, false);
        }
        
        String jpql = "SELECT q.classSubject.id, COUNT(q.id) " +
                      "FROM Question q " +
                      "WHERE q.classSubject.id IN :csIds AND q.deleted = false AND q.status = :status ";
                      
        if (org.springframework.util.StringUtils.hasText(language) && !"ALL".equalsIgnoreCase(language)) {
            jpql += "AND q.language = :lang ";
        }
        
        jpql += "GROUP BY q.classSubject.id";
        
        var query = entityManager.createQuery(jpql, Object[].class)
                .setParameter("csIds", classSubjectIds)
                .setParameter("status", Question.QuestionStatus.APPROVED);
                
        if (org.springframework.util.StringUtils.hasText(language) && !"ALL".equalsIgnoreCase(language)) {
            query.setParameter("lang", language);
        }
        
        java.util.List<Object[]> rows = query.getResultList();
        for (Object[] row : rows) {
            UUID csId = (UUID) row[0];
            Long count = (Long) row[1];
            if (csId != null && count != null && count > 0) {
                result.put(csId, true);
            }
        }
        
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Question> getQuestionsBatch(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return new java.util.ArrayList<>();
        }
        return questionRepository.findAllById(ids);
    }
}

