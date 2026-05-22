package com.testshaper.service.impl;

import com.testshaper.dto.ExamDTO;
import com.testshaper.dto.ExamGenerationRequest;
import com.testshaper.dto.ExamSummaryDTO;
import com.testshaper.entity.*;
import com.testshaper.repository.ClassSubjectRepository;
import com.testshaper.repository.ExamQuestionPoolRepository;
import com.testshaper.repository.ExamRepository;
import com.testshaper.repository.QuestionRepository;
import com.testshaper.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.*;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamGenerationServiceImpl {

    private final ExamRepository examRepository;
    private final ExamQuestionPoolRepository questionPoolRepository;
    private final QuestionRepository questionRepository;
    private final ClassSubjectRepository classSubjectRepository;
    private final ObjectMapper objectMapper;
    private final com.testshaper.repository.QuestionFavoriteRepository favoriteRepository;
    private final com.testshaper.repository.UserRepository userRepository;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    // =========================================================
    // AUTO GENERATION — Main Entry Point
    // =========================================================
    @Transactional
    public ExamDTO generateExam(ExamGenerationRequest request, String createdBy) {
        log.info("Starting auto exam generation for tenant={}, subject={}", TenantContext.getTenantId(),
                request.getClassSubjectId());

        // 1. Validate difficulty distribution
        validateDifficultyDistribution(request);

        // 2. Validate question type rules (sum must match totalQuestions & totalMarks)
        validateQuestionTypeRules(request);

        // 3. Fetch ClassSubject
        ClassSubject classSubject = classSubjectRepository.findById(request.getClassSubjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ClassSubject not found"));

        // 4. Build exam entity
        Exam exam = buildExamEntity(request, classSubject, createdBy);

        // 5. Generate questions for each type
        Set<UUID> usedQuestionIds = new HashSet<>();
        List<ExamQuestion> allExamQuestions = new ArrayList<>();
        int orderCounter = 1;

        Map<String, ExamSection> sectionsMap = new LinkedHashMap<>();
        int sectionOrderCounter = 1;

        for (ExamGenerationRequest.QuestionTypeRule rule : request.getQuestionTypeRules()) {
            List<ExamQuestion> selected = selectQuestionsForRule(
                    exam, rule, request, usedQuestionIds, orderCounter);
            
            // If sectionName is specified, associate the questions with that section
            if (rule.getSectionName() != null && !rule.getSectionName().trim().isEmpty()) {
                String secName = rule.getSectionName().trim();
                ExamSection section = sectionsMap.get(secName);
                if (section == null) {
                    section = new ExamSection();
                    section.setExam(exam);
                    section.setSectionName(secName);
                    section.setSectionOrder(sectionOrderCounter++);
                    section.setQuestions(new ArrayList<>());
                    sectionsMap.put(secName, section);
                }
                
                for (ExamQuestion eq : selected) {
                    eq.setSection(section);
                    section.getQuestions().add(eq);
                }
            }
            
            allExamQuestions.addAll(selected);
            selected.forEach(eq -> usedQuestionIds.add(eq.getQuestion().getId()));
            orderCounter += selected.size();
        }

        if (!sectionsMap.isEmpty()) {
            exam.getExamSections().addAll(sectionsMap.values());
        }

        // 6. Shuffle questions if requested
        if (request.isShuffleQuestions()) {
            if (sectionsMap.isEmpty()) {
                Collections.shuffle(allExamQuestions, new Random());
            } else {
                // If there are sections, shuffle questions within each section, but keep sections in order
                for (ExamSection section : sectionsMap.values()) {
                    List<ExamQuestion> secQuestions = new ArrayList<>();
                    for (ExamQuestion eq : allExamQuestions) {
                        if (eq.getSection() == section) {
                            secQuestions.add(eq);
                        }
                    }
                    Collections.shuffle(secQuestions, new Random());
                }
            }
        }

        // Re-assign global questionOrder grouped by section order
        if (!sectionsMap.isEmpty()) {
            int globalOrder = 1;
            List<ExamQuestion> orderedQuestions = new ArrayList<>();
            List<ExamSection> sortedSections = new ArrayList<>(sectionsMap.values());
            sortedSections.sort(Comparator.comparing(ExamSection::getSectionOrder));
            
            for (ExamSection sec : sortedSections) {
                List<ExamQuestion> secQuestions = new ArrayList<>();
                for (ExamQuestion eq : allExamQuestions) {
                    if (eq.getSection() == sec) {
                        secQuestions.add(eq);
                    }
                }
                for (ExamQuestion eq : secQuestions) {
                    eq.setQuestionOrder(globalOrder++);
                    orderedQuestions.add(eq);
                }
            }
            
            // Add any questions that don't belong to any section
            for (ExamQuestion eq : allExamQuestions) {
                if (eq.getSection() == null) {
                    eq.setQuestionOrder(globalOrder++);
                    orderedQuestions.add(eq);
                }
            }
            allExamQuestions = orderedQuestions;
        } else {
            for (int i = 0; i < allExamQuestions.size(); i++) {
                allExamQuestions.get(i).setQuestionOrder(i + 1);
            }
        }

        // 7. Wire exam↔questions
        allExamQuestions.forEach(eq -> eq.setExam(exam));
        exam.getExamQuestions().addAll(allExamQuestions);

        // 8. Save generation rules
        for (ExamGenerationRequest.QuestionTypeRule rule : request.getQuestionTypeRules()) {
            ExamGenerationRule genRule = new ExamGenerationRule();
            genRule.setExam(exam);
            genRule.setQuestionType(rule.getQuestionType());
            genRule.setQuestionCount(rule.getCount());
            genRule.setMarksPerQuestion(rule.getMarksPerQuestion());
            exam.getGenerationRules().add(genRule);
        }

        // 9. Persist
        Exam saved = examRepository.save(exam);
        log.info("Exam generated successfully: id={}, questions={}", saved.getId(), saved.getExamQuestions().size());

        // 10. Mark used questions as favorites for the user
        userRepository.findByEmail(createdBy).ifPresent(user -> {
            for (ExamQuestion eq : saved.getExamQuestions()) {
                if (!favoriteRepository.existsByQuestionAndUser(eq.getQuestion(), user)) {
                    QuestionFavorite fav = new QuestionFavorite();
                    fav.setQuestion(eq.getQuestion());
                    fav.setUser(user);
                    favoriteRepository.save(fav);
                }
            }
        });

        return toDTO(saved);
    }

    @Transactional
    public ExamDTO updateExam(UUID id, ExamDTO dto) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));
                
        String currentTenant = TenantContext.getTenantId();
        // DEFAULT tenant can edit anything. Normal tenants can only edit their own.
        if (!"DEFAULT".equals(currentTenant) && !exam.getTenantId().equals(currentTenant)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied. Cannot modify cross-tenant data.");
        }

        if (dto.getTitle() != null)
            exam.setTitle(dto.getTitle());
        if (dto.getDurationMinutes() != null)
            exam.setDurationMinutes(dto.getDurationMinutes());
        if (dto.getTotalMarks() != null)
            exam.setTotalMarks(dto.getTotalMarks());
        if (dto.getHeaderText() != null)
            exam.setHeaderText(dto.getHeaderText());
        if (dto.getFooterText() != null)
            exam.setFooterText(dto.getFooterText());
        if (dto.getInstructions() != null)
            exam.setInstructions(dto.getInstructions());
        if (dto.getStatus() != null)
            exam.setStatus(dto.getStatus());
        if (dto.getEditorMode() != null)
            exam.setEditorMode(dto.getEditorMode());
        if (dto.getRawContent() != null)
            exam.setRawContent(dto.getRawContent());
        if (dto.getDocSettingsJson() != null)
            exam.setDocSettingsJson(dto.getDocSettingsJson());

        // Sync Questions if present
        if (dto.getQuestions() != null) {
            Map<UUID, ExamDTO.ExamQuestionDTO> incomingMap = dto.getQuestions().stream()
                    .filter(q -> q.getId() != null)
                    .collect(Collectors.toMap(ExamDTO.ExamQuestionDTO::getId, q -> q));

            // Remove questions not in the incoming list
            exam.getExamQuestions().removeIf(eq -> !incomingMap.containsKey(eq.getId()));

            // Update remaining questions
            for (ExamQuestion eq : exam.getExamQuestions()) {
                ExamDTO.ExamQuestionDTO qDto = incomingMap.get(eq.getId());
                eq.setQuestionOrder(qDto.getOrder());
                eq.setMarks(qDto.getMarks());

                String originalText = eq.getQuestion().getQuestionText() != null ? eq.getQuestion().getQuestionText()
                        : "";

                // Track question text override
                if (qDto.getQuestionText() != null
                        && !qDto.getQuestionText().trim().equals(originalText.trim())) {
                    eq.setOverrideQuestionText(qDto.getQuestionText());
                } else {
                    eq.setOverrideQuestionText(null);
                }

                // Track options override
                if (qDto.getOptions() != null && !qDto.getOptions().isEmpty()) {
                    try {
                        String optionsJson = objectMapper.writeValueAsString(qDto.getOptions());
                        eq.setOverrideOptionsJson(optionsJson);
                    } catch (JsonProcessingException e) {
                        log.error("Failed to serialize options for ExamQuestion {}", eq.getId(), e);
                    }
                } else {
                    eq.setOverrideOptionsJson(null);
                }
            }
        }

        Exam saved = examRepository.save(exam);
        log.info("Exam updated successfully: id={}", saved.getId());
        return toDTO(saved);
    }

    // =========================================================
    // WEIGHTED RANDOM SELECTION ALGORITHM
    // =========================================================
    private List<ExamQuestion> selectQuestionsForRule(
            Exam exam,
            ExamGenerationRequest.QuestionTypeRule rule,
            ExamGenerationRequest request,
            Set<UUID> usedIds,
            int startOrder) {

        int total = rule.getCount();
        int easyCount = (int) Math.round(total * request.getEasyPercent() / 100.0);
        int mediumCount = (int) Math.round(total * request.getMediumPercent() / 100.0);
        int hardCount = total - easyCount - mediumCount; // remainder goes to hard

        log.debug("Selecting {} {} questions: easy={} medium={} hard={}",
                total, rule.getQuestionType(), easyCount, mediumCount, hardCount);

        String tenantId = TenantContext.getTenantId();
        Set<UUID> chapterIds = null;
        if (rule.getCategoryName() != null && !rule.getCategoryName().trim().isEmpty()) {
            List<UUID> catChapterIds = entityManager.createQuery(
                "SELECT c.id FROM Chapter c WHERE c.classSubject.id = :csId AND (c.isActive = true OR c.isActive IS NULL) AND LOWER(c.categoryName) = LOWER(:catName)", UUID.class)
                .setParameter("csId", request.getClassSubjectId())
                .setParameter("catName", rule.getCategoryName().trim())
                .getResultList();
            
            Set<UUID> catSet = new HashSet<>(catChapterIds);
            if (request.getChapterIds() != null && !request.getChapterIds().isEmpty()) {
                chapterIds = new HashSet<>();
                for (UUID id : request.getChapterIds()) {
                    if (catSet.contains(id)) {
                        chapterIds.add(id);
                    }
                }
                if (chapterIds.isEmpty()) {
                    chapterIds.add(UUID.randomUUID()); // dummy to yield no results
                }
            } else {
                chapterIds = catSet;
                if (chapterIds.isEmpty()) {
                    chapterIds.add(UUID.randomUUID()); // dummy to yield no results
                }
            }
        } else {
            chapterIds = request.getChapterIds() != null && !request.getChapterIds().isEmpty()
                    ? new HashSet<>(request.getChapterIds())
                    : null;
        }

        Set<UUID> topicIds = request.getTopicIds() != null && !request.getTopicIds().isEmpty()
                ? new HashSet<>(request.getTopicIds())
                : null;


        Set<UUID> currentExcludedIds = new HashSet<>(usedIds);
        List<Question> pool = new ArrayList<>();

        List<Question> easyPool = fetchPool(tenantId, request.getClassSubjectId(),
                rule.getQuestionType(), Question.DifficultyLevel.EASY,
                request.getLanguage(), chapterIds, topicIds, currentExcludedIds, easyCount);
        pool.addAll(easyPool);
        easyPool.forEach(q -> currentExcludedIds.add(q.getId()));

        List<Question> mediumPool = fetchPool(tenantId, request.getClassSubjectId(),
                rule.getQuestionType(), Question.DifficultyLevel.MEDIUM,
                request.getLanguage(), chapterIds, topicIds, currentExcludedIds, mediumCount);
        pool.addAll(mediumPool);
        mediumPool.forEach(q -> currentExcludedIds.add(q.getId()));

        List<Question> hardPool = fetchPool(tenantId, request.getClassSubjectId(),
                rule.getQuestionType(), Question.DifficultyLevel.HARD,
                request.getLanguage(), chapterIds, topicIds, currentExcludedIds, hardCount);
        pool.addAll(hardPool);
        hardPool.forEach(q -> currentExcludedIds.add(q.getId()));

        // If the selection has deficit, check other difficulty levels of the same question type to fulfill the request.
        if (pool.size() < total) {
            int deficit = total - pool.size();
            log.info("Deficit of {} questions for type {}. Attempting fallback selection from other difficulty levels.",
                    deficit, rule.getQuestionType());

            List<Question.DifficultyLevel> fallbackOrder = List.of(
                    Question.DifficultyLevel.MEDIUM,
                    Question.DifficultyLevel.EASY,
                    Question.DifficultyLevel.HARD
            );

            for (Question.DifficultyLevel level : fallbackOrder) {
                if (deficit <= 0) {
                    break;
                }
                List<Question> fallbackPool = fetchPool(tenantId, request.getClassSubjectId(),
                        rule.getQuestionType(), level,
                        request.getLanguage(), chapterIds, topicIds, currentExcludedIds, deficit);
                if (!fallbackPool.isEmpty()) {
                    pool.addAll(fallbackPool);
                    fallbackPool.forEach(q -> currentExcludedIds.add(q.getId()));
                    deficit -= fallbackPool.size();
                }
            }
        }

        // Build ExamQuestion entries
        List<ExamQuestion> result = new ArrayList<>();
        for (int i = 0; i < pool.size(); i++) {
            ExamQuestion eq = new ExamQuestion();
            eq.setQuestion(pool.get(i));
            eq.setMarks(rule.getMarksPerQuestion());
            eq.setQuestionOrder(startOrder + i);
            result.add(eq);
        }
        return result;
    }

    private List<Question> fetchPool(String tenantId, UUID classSubjectId,
            Question.QuestionType type,
            Question.DifficultyLevel difficulty,
            String language,
            Set<UUID> chapterIds,
            Set<UUID> topicIds,
            Set<UUID> excludedIds,
            int needed) {
            
        if (needed <= 0) return new ArrayList<>();

        String globalTenantId = null;
        try {
            globalTenantId = (String) entityManager.createQuery("SELECT CAST(i.id AS string) FROM Institute i WHERE i.code = 'DEFAULT-001'")
                    .setMaxResults(1)
                    .getSingleResult();
        } catch (Exception e) {
            // ignore if not found
        }

        Set<UUID> safeExclusions = excludedIds.isEmpty()
                ? Set.of(UUID.randomUUID()) // avoids empty IN clause issues
                : excludedIds;

        Set<UUID> eligibleIdsSet = new HashSet<>();
        String typeStr = type != null ? type.name() : null;

        if (chapterIds == null && topicIds == null) {
            eligibleIdsSet.addAll(questionPoolRepository.findEligibleQuestionIds(
                    tenantId, globalTenantId, classSubjectId, typeStr, difficulty, language, null, safeExclusions));
        } else {
            if (chapterIds != null && !chapterIds.isEmpty()) {
                eligibleIdsSet.addAll(questionPoolRepository.findEligibleQuestionIds(
                        tenantId, globalTenantId, classSubjectId, typeStr, difficulty, language, chapterIds, safeExclusions));
            }
            if (topicIds != null && !topicIds.isEmpty()) {
                eligibleIdsSet.addAll(questionPoolRepository.findEligibleQuestionIdsByTopic(
                        tenantId, globalTenantId, classSubjectId, typeStr, difficulty, language, topicIds, safeExclusions));
            }
        }

        List<UUID> eligibleIds = new ArrayList<>(eligibleIdsSet);
                
        if (eligibleIds.size() < needed) {
            log.warn("Insufficient questions: needed={} available={} type={} difficulty={}",
                    needed, eligibleIds.size(), type, difficulty);
        }
                
        if (eligibleIds.isEmpty()) {
            return new ArrayList<>();
        }
        
        // Shuffle the IDs directly
        Collections.shuffle(eligibleIds, new Random());
        
        // Limit IDs to exactly what is needed
        List<UUID> selectedIds = eligibleIds.stream().limit(needed).collect(Collectors.toList());
        
        // Now ONLY fetch the required amount!
        List<Question> selectedQuestions = questionRepository.findAllById(selectedIds);
        
        // Ensure they are randomized
        Collections.shuffle(selectedQuestions, new Random());
        
        return selectedQuestions;
    }

    // =========================================================
    // REGENERATE
    // =========================================================
    @Transactional
    public ExamDTO regenerateExam(UUID examId, String requestedBy) {
        Exam existing = examRepository.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));

        // Build request from existing exam config
        ExamGenerationRequest req = new ExamGenerationRequest();
        req.setTitle(existing.getTitle());
        req.setExamType(existing.getExamType());
        req.setClassSubjectId(existing.getClassSubject().getId());
        req.setTotalMarks(existing.getTotalMarks());
        req.setTotalQuestions(existing.getTotalQuestions());
        req.setDurationMinutes(existing.getDurationMinutes());
        req.setLanguage(existing.getLanguage());
        req.setEasyPercent(existing.getEasyPercent());
        req.setMediumPercent(existing.getMediumPercent());
        req.setHardPercent(existing.getHardPercent());
        req.setShuffleQuestions(existing.isShuffleQuestions());
        req.setShuffleOptions(existing.isShuffleOptions());
        req.setInstituteName(existing.getInstituteName());
        req.setHeaderText(existing.getHeaderText());
        req.setQuestionTypeRules(existing.getGenerationRules().stream()
                .map(r -> {
                    ExamGenerationRequest.QuestionTypeRule rule = new ExamGenerationRequest.QuestionTypeRule();
                    rule.setQuestionType(r.getQuestionType());
                    rule.setCount(r.getQuestionCount());
                    rule.setMarksPerQuestion(r.getMarksPerQuestion());
                    return rule;
                }).collect(Collectors.toList()));

        // Clear existing questions
        existing.getExamQuestions().clear();
        existing.getGenerationRules().clear();
        examRepository.save(existing); // flush deletions

        // Delete old exam and regenerate fresh
        examRepository.delete(existing);
        examRepository.flush();

        return generateExam(req, requestedBy);
    }

    // =========================================================
    // VALIDATION
    // =========================================================
    private void validateDifficultyDistribution(ExamGenerationRequest req) {
        int sum = req.getEasyPercent() + req.getMediumPercent() + req.getHardPercent();
        if (sum != 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Difficulty percentages must sum to 100, got: " + sum);
        }
    }

    private void validateQuestionTypeRules(ExamGenerationRequest req) {
        int totalQ = req.getQuestionTypeRules().stream()
                .mapToInt(ExamGenerationRequest.QuestionTypeRule::getCount).sum();
        double totalM = req.getQuestionTypeRules().stream()
                .mapToDouble(r -> r.getCount() * r.getMarksPerQuestion()).sum();

        if (totalQ != req.getTotalQuestions()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format("Question type counts sum (%d) must equal totalQuestions (%d)", totalQ,
                            req.getTotalQuestions()));
        }
        if (Math.abs(totalM - req.getTotalMarks()) > 0.01) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format("Question marks sum (%.1f) must equal totalMarks (%.1f)", totalM,
                            req.getTotalMarks()));
        }
    }

    // =========================================================
    // HELPERS
    // =========================================================
    private Exam buildExamEntity(ExamGenerationRequest req, ClassSubject classSubject, String createdBy) {
        Exam exam = new Exam();
        exam.setTitle(req.getTitle());
        exam.setExamType(req.getExamType());
        exam.setClassSubject(classSubject);
        exam.setTotalMarks(req.getTotalMarks());
        exam.setTotalQuestions(req.getTotalQuestions());
        exam.setDurationMinutes(req.getDurationMinutes());
        exam.setLanguage(req.getLanguage());
        exam.setEasyPercent(req.getEasyPercent());
        exam.setMediumPercent(req.getMediumPercent());
        exam.setHardPercent(req.getHardPercent());
        exam.setShuffleQuestions(req.isShuffleQuestions());
        exam.setShuffleOptions(req.isShuffleOptions());
        exam.setInstituteName(req.getInstituteName());
        exam.setHeaderText(req.getHeaderText());
        exam.setStatus(Exam.ExamStatus.DRAFT);
        exam.setCreatedBy(createdBy);
        exam.setAiGenerated(false);
        return exam;
    }

    public ExamDTO getExam(UUID examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));
                
        String currentTenant = TenantContext.getTenantId();
        // If current user is DEFAULT tenant, allow access.
        // If exam belongs to DEFAULT tenant, allow access (so others can view global templates).
        // Otherwise, current user must be in the same tenant as the exam.
        if (!"DEFAULT".equals(currentTenant) && !"DEFAULT".equals(exam.getTenantId()) && !exam.getTenantId().equals(currentTenant)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        
        return toDTO(exam);
    }

    public Page<ExamSummaryDTO> listExams(String title, Exam.ExamType examType, Exam.ExamStatus status, Pageable pageable, String username, boolean isSuperAdmin) {
        String tenantId = TenantContext.getTenantId();
        String createdBy = isSuperAdmin ? null : username;
        return examRepository.findByTenantAndOptionalCreator(tenantId, title, createdBy, examType, status, pageable).map(this::toSummaryDTO);
    }

    private ExamSummaryDTO toSummaryDTO(Exam exam) {
        ExamSummaryDTO dto = new ExamSummaryDTO();
        dto.setId(exam.getId());
        dto.setTitle(exam.getTitle());
        dto.setExamType(exam.getExamType());
        dto.setStatus(exam.getStatus());
        dto.setLanguage(exam.getLanguage());
        dto.setDurationMinutes(exam.getDurationMinutes());
        dto.setTotalMarks(exam.getTotalMarks());
        dto.setTotalQuestions(exam.getTotalQuestions());
        dto.setCreatedBy(exam.getCreatedBy());
        dto.setCreatedAt(exam.getCreatedAt());

        if (exam.getClassSubject() != null) {
            if (exam.getClassSubject().getSubject() != null)
                dto.setSubjectName(exam.getClassSubject().getSubject().getName());
            if (exam.getClassSubject().getAcademicClass() != null)
                dto.setClassName(exam.getClassSubject().getAcademicClass().getName());
        }
        return dto;
    }

    @Transactional
    public void deleteExam(UUID examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));
                
        String currentTenant = TenantContext.getTenantId();
        if (!"DEFAULT".equals(currentTenant) && !exam.getTenantId().equals(currentTenant)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied. Cannot delete cross-tenant data.");
        }
        
        exam.setDeleted(true);
        examRepository.save(exam);
    }

    // =========================================================
    // RECYCLE BIN (SUPER ADMIN ONLY)
    // =========================================================
    
    public Page<ExamSummaryDTO> listDeletedExams(String title, Pageable pageable) {
        return examRepository.findDeletedExams(title, pageable).map(this::toSummaryDTO);
    }

    @Transactional
    public void restoreExam(UUID examId) {
        examRepository.restoreExam(examId.toString());
    }

    @Transactional
    public void hardDeleteExam(UUID examId) {
        String idStr = examId.toString();
        examRepository.deleteExamRules(idStr);
        examRepository.deleteExamQuestions(idStr);
        examRepository.hardDeleteExam(idStr);
    }

    @Transactional
    public void emptyRecycleBin() {
        examRepository.deleteDeletedExamRules();
        examRepository.deleteDeletedExamQuestions();
        examRepository.emptyRecycleBin();
    }

    // =========================================================
    // DTO MAPPER
    // =========================================================
    private ExamDTO toDTO(Exam exam) {
        ExamDTO dto = new ExamDTO();
        dto.setId(exam.getId());
        dto.setTitle(exam.getTitle());
        dto.setExamType(exam.getExamType());
        dto.setStatus(exam.getStatus());
        dto.setLanguage(exam.getLanguage());
        dto.setDurationMinutes(exam.getDurationMinutes());
        dto.setTotalMarks(exam.getTotalMarks());
        dto.setTotalQuestions(exam.getTotalQuestions());
        dto.setEasyPercent(exam.getEasyPercent());
        dto.setMediumPercent(exam.getMediumPercent());
        dto.setHardPercent(exam.getHardPercent());
        dto.setShuffleQuestions(exam.isShuffleQuestions());
        dto.setShuffleOptions(exam.isShuffleOptions());
        dto.setInstituteName(exam.getInstituteName());
        dto.setHeaderText(exam.getHeaderText());
        dto.setFooterText(exam.getFooterText());
        dto.setAiGenerated(exam.isAiGenerated());
        dto.setCreatedBy(exam.getCreatedBy());
        dto.setInstructions(exam.getInstructions());
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

        dto.setQuestions(exam.getExamQuestions().stream().map(eq -> {
            ExamDTO.ExamQuestionDTO qDto = new ExamDTO.ExamQuestionDTO();
            qDto.setId(eq.getId());
            qDto.setOrder(eq.getQuestionOrder());
            qDto.setMarks(eq.getMarks());
            if (eq.getSection() != null) {
                qDto.setSectionId(eq.getSection().getId());
            }
            Question q = eq.getQuestion();
            qDto.setOriginalQuestionId(q.getId());

            // Prefer override text if exists
            if (eq.getOverrideQuestionText() != null && !eq.getOverrideQuestionText().isEmpty()) {
                qDto.setQuestionText(eq.getOverrideQuestionText());
            } else {
                qDto.setQuestionText(q.getQuestionText());
            }

            qDto.setStimulus(q.getStimulus());
            qDto.setType(q.getType());
            qDto.setMcqType(q.getMcqType());
            qDto.setStatements(q.getStatements());
            qDto.setDifficulty(q.getDifficulty());
            qDto.setBloomLevel(q.getBloomLevel());
            qDto.setLanguage(q.getLanguage());
            qDto.setExplanation(q.getExplanation());
            qDto.setCorrectAnswer(q.getCorrectAnswer());

            if (q.getType().equals(Question.QuestionType.MCQ.name())) {
                java.util.List<ExamDTO.OptionDTO> optionDTOs = null;

                // Check if options were overridden
                if (eq.getOverrideOptionsJson() != null && !eq.getOverrideOptionsJson().isEmpty()) {
                    try {
                        optionDTOs = objectMapper.readValue(eq.getOverrideOptionsJson(),
                                new TypeReference<java.util.List<ExamDTO.OptionDTO>>() {
                                });
                    } catch (JsonProcessingException e) {
                        log.error("Failed to parse overridden options for ExamQuestion {}", eq.getId(), e);
                    }
                }

                // Fallback to bank options
                if (optionDTOs == null && q.getOptions() != null) {
                    optionDTOs = q.getOptions().stream().map(opt -> {
                        ExamDTO.OptionDTO oDto = new ExamDTO.OptionDTO();
                        oDto.setId(opt.getId());
                        oDto.setOptionText(opt.getOptionText());
                        oDto.setCorrect(opt.isCorrect());
                        return oDto;
                    }).collect(Collectors.toList());
                }

                if (optionDTOs != null) {
                    // Shuffle options if requested by config
                    if (exam.isShuffleOptions()) {
                        Collections.shuffle(optionDTOs, new Random());
                    }
                    qDto.setOptions(optionDTOs);
                }
            }

            return qDto;
        }).collect(Collectors.toList()));

        return dto;
    }
}
