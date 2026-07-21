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
    private final com.testshaper.repository.QuestionOptionRepository questionOptionRepository;

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

        // 1b. Validate Bloom's Taxonomy distribution
        validateBloomDistribution(request);

        // 2. Validate question type rules (sum must match totalQuestions & totalMarks)
        validateQuestionTypeRules(request);

        // 3. Fetch ClassSubject
        ClassSubject classSubject = classSubjectRepository.findById(request.getClassSubjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ClassSubject not found"));

        // Resolve global ClassSubject ID if custom tenant
        String globalTenantIdFallback = "0c430840-39f2-4645-b2e4-53d62c8e4b49";
        try {
            Object result = entityManager.createNativeQuery("SELECT CAST(id AS CHAR) FROM institutes WHERE code = 'DEFAULT-001'")
                    .setMaxResults(1)
                    .getSingleResult();
            if (result != null) {
                globalTenantIdFallback = result.toString();
            }
        } catch (Exception e) {
            log.warn("Failed to resolve globalTenantId via native query, falling back to default UUID: {}", e.getMessage());
        }

        UUID globalClassSubjectId = classSubject.getId();
        if (!"DEFAULT".equals(classSubject.getTenantId()) && !globalTenantIdFallback.equals(classSubject.getTenantId())) {
            try {
                List<UUID> candidates = entityManager.createQuery(
                    "SELECT cs.id FROM ClassSubject cs WHERE (cs.tenantId = 'DEFAULT' OR cs.tenantId = :globalTenantId) " +
                    "AND cs.academicClass.id = :classId AND cs.subject.id = :subId", UUID.class)
                    .setParameter("globalTenantId", globalTenantIdFallback)
                    .setParameter("classId", classSubject.getAcademicClass().getId())
                    .setParameter("subId", classSubject.getSubject().getId())
                    .getResultList();
                if (!candidates.isEmpty()) {
                    globalClassSubjectId = candidates.get(0);
                    log.info("Resolved global classSubjectId {} for custom tenant classSubjectId {}", globalClassSubjectId, classSubject.getId());
                }
            } catch (Exception e) {
                log.warn("Failed to resolve global classSubjectId, using requested classSubjectId: {}", e.getMessage());
            }
        }

        // Resolve global Chapter and Topic IDs (run for both custom and global tenants to guarantee successful mapping)
        // Resolve Chapters
        if (request.getChapterIds() != null && !request.getChapterIds().isEmpty()) {
            try {
                List<String> customChapterNames = entityManager.createQuery(
                    "SELECT c.name FROM Chapter c WHERE c.id IN :cIds", String.class)
                    .setParameter("cIds", request.getChapterIds())
                    .getResultList();
                
                if (!customChapterNames.isEmpty()) {
                    List<UUID> resolvedGlobalChapterIds = entityManager.createQuery(
                        "SELECT c.id FROM Chapter c WHERE c.classSubject.id = :globalCsId AND c.name IN :names", UUID.class)
                        .setParameter("globalCsId", globalClassSubjectId)
                        .setParameter("names", customChapterNames)
                        .getResultList();
                    
                    if (!resolvedGlobalChapterIds.isEmpty()) {
                        log.info("Resolving chapters {} to global chapters {} by names {}", request.getChapterIds(), resolvedGlobalChapterIds, customChapterNames);
                        request.setChapterIds(resolvedGlobalChapterIds);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to resolve global chapter IDs: {}", e.getMessage());
            }
        }

        // Resolve Topics
        if (request.getTopicIds() != null && !request.getTopicIds().isEmpty()) {
            try {
                List<String> customTopicNames = entityManager.createQuery(
                    "SELECT t.name FROM Topic t WHERE t.id IN :tIds", String.class)
                    .setParameter("tIds", request.getTopicIds())
                    .getResultList();
                
                if (!customTopicNames.isEmpty()) {
                    List<UUID> resolvedGlobalTopicIds = entityManager.createQuery(
                        "SELECT t.id FROM Topic t WHERE t.chapter.classSubject.id = :globalCsId AND t.name IN :names", UUID.class)
                        .setParameter("globalCsId", globalClassSubjectId)
                        .setParameter("names", customTopicNames)
                        .getResultList();
                    
                    if (!resolvedGlobalTopicIds.isEmpty()) {
                        log.info("Resolving topics {} to global topics {} by names {}", request.getTopicIds(), resolvedGlobalTopicIds, customTopicNames);
                        request.setTopicIds(resolvedGlobalTopicIds);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to resolve global topic IDs: {}", e.getMessage());
            }
        }

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
                    exam, rule, request, globalClassSubjectId, usedQuestionIds, orderCounter);
            
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
            genRule.setQuestionsToAnswer(rule.getQuestionsToAnswer());
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

            Set<UUID> existingIds = exam.getExamQuestions().stream()
                    .map(ExamQuestion::getId)
                    .collect(Collectors.toSet());

            // 1. Update remaining existing questions
            for (ExamQuestion eq : exam.getExamQuestions()) {
                ExamDTO.ExamQuestionDTO qDto = incomingMap.get(eq.getId());
                eq.setQuestionOrder(qDto.getOrder());
                eq.setMarks(qDto.getMarks());
                eq.setAlternativeToId(qDto.getAlternativeToId());

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

            // 2. Insert new questions (either custom or imported)
            for (ExamDTO.ExamQuestionDTO qDto : dto.getQuestions()) {
                if (qDto.getId() != null && !existingIds.contains(qDto.getId())) {
                    ExamQuestion newEq = new ExamQuestion();
                    newEq.setId(qDto.getId()); // Use the frontend-generated UUID
                    newEq.setExam(exam);
                    newEq.setQuestionOrder(qDto.getOrder());
                    newEq.setMarks(qDto.getMarks() != null ? qDto.getMarks() : 1.0);
                    newEq.setAlternativeToId(qDto.getAlternativeToId());

                    Question qEntity = null;
                    if (qDto.getOriginalQuestionId() != null) {
                        // Imported from question bank
                        qEntity = questionRepository.findById(qDto.getOriginalQuestionId()).orElse(null);
                    }

                    if (qEntity == null) {
                        // Brand new custom question
                        qEntity = new Question();
                        qEntity.setTenantId(exam.getTenantId());
                        qEntity.setType(qDto.getType() != null ? qDto.getType() : "MCQ");
                        qEntity.setQuestionText(qDto.getQuestionText() != null ? qDto.getQuestionText() : "");
                        qEntity.setDifficulty(qDto.getDifficulty() != null ? qDto.getDifficulty() : Question.DifficultyLevel.MEDIUM);
                        qEntity.setMarks(qDto.getMarks() != null ? qDto.getMarks() : 1.0);
                        qEntity.setLanguage(exam.getLanguage() != null ? exam.getLanguage() : "Bangla");
                        qEntity.setStatus(Question.QuestionStatus.APPROVED);
                        qEntity.setCreatedBy(exam.getCreatedBy());
                        qEntity.setStimulus(qDto.getStimulus());
                        qEntity.setBloomLevel(qDto.getBloomLevel());
                        qEntity.setClassSubject(exam.getClassSubject());

                        qEntity = questionRepository.save(qEntity);

                        // If MCQ, save the custom options
                        if ("MCQ".equals(qEntity.getType()) && qDto.getOptions() != null) {
                            List<QuestionOption> qOptions = new ArrayList<>();
                            int optIdx = 0;
                            char optChar = 'A';
                            for (ExamDTO.OptionDTO oDto : qDto.getOptions()) {
                                QuestionOption opt = new QuestionOption();
                                opt.setQuestion(qEntity);
                                opt.setOptionLabel(String.valueOf((char) (optChar + optIdx)));
                                opt.setOptionText(oDto.getOptionText() != null ? oDto.getOptionText() : "");
                                opt.setCorrect(oDto.isCorrect());
                                opt.setTenantId(qEntity.getTenantId());
                                qOptions.add(opt);
                                optIdx++;
                            }
                            questionOptionRepository.saveAll(qOptions);
                            qEntity.setOptions(qOptions);
                        }
                    }

                    newEq.setQuestion(qEntity);

                    // Track question text override
                    String originalText = qEntity.getQuestionText() != null ? qEntity.getQuestionText() : "";
                    if (qDto.getQuestionText() != null && !qDto.getQuestionText().trim().equals(originalText.trim())) {
                        newEq.setOverrideQuestionText(qDto.getQuestionText());
                    }

                    // Track options override
                    if (qDto.getOptions() != null && !qDto.getOptions().isEmpty()) {
                        try {
                            newEq.setOverrideOptionsJson(objectMapper.writeValueAsString(qDto.getOptions()));
                        } catch (JsonProcessingException e) {
                            log.error("Failed to serialize options for new ExamQuestion {}", newEq.getId(), e);
                        }
                    }

                    exam.getExamQuestions().add(newEq);
                }
            }
        }

        Exam saved = examRepository.save(exam);
        log.info("Exam updated successfully: id={}", saved.getId());
        return toDTO(saved);
    }

    private String normalizeBloomLevel(String bloom) {
        if (bloom == null) return "";
        String b = bloom.toUpperCase().trim();
        if (b.equals("REMEMBERING") || b.equals("KNOWLEDGE") || b.equals("জ্ঞানমূলক")) {
            return "KNOWLEDGE";
        }
        if (b.equals("UNDERSTANDING") || b.equals("COMPREHENSION") || b.equals("অনুধাবনমূলক")) {
            return "COMPREHENSION";
        }
        if (b.equals("APPLYING") || b.equals("APPLICATION") || b.equals("প্রয়োগমূলক")) {
            return "APPLICATION";
        }
        if (b.equals("ANALYZING") || b.equals("EVALUATING") || b.equals("CREATING") || b.equals("HIGHER_ORDER") || b.equals("উচ্চতর দক্ষতা")) {
            return "HIGHER_ORDER";
        }
        return b;
    }

    private List<String> getPreferredBloomLevels(Map<String, Integer> bloomDeficits) {
        List<String> prefs = new ArrayList<>();
        if (bloomDeficits == null) return prefs;
        for (Map.Entry<String, Integer> entry : bloomDeficits.entrySet()) {
            if (entry.getValue() > 0) {
                prefs.add(entry.getKey());
            }
        }
        return prefs;
    }

    // =========================================================
    // WEIGHTED RANDOM SELECTION ALGORITHM
    // =========================================================
    private List<ExamQuestion> selectQuestionsForRule(
            Exam exam,
            ExamGenerationRequest.QuestionTypeRule rule,
            ExamGenerationRequest request,
            UUID globalClassSubjectId,
            Set<UUID> usedIds,
            int startOrder) {

        int total = rule.getCount();
        int easyCount = (int) Math.round(total * request.getEasyPercent() / 100.0);
        int mediumCount = (int) Math.round(total * request.getMediumPercent() / 100.0);
        int hardCount = total - easyCount - mediumCount; // remainder goes to hard

        // Calculate target Bloom Counts for this rule
        int knowledgeCount = (int) Math.round(total * request.getKnowledgePercent() / 100.0);
        int comprehensionCount = (int) Math.round(total * request.getComprehensionPercent() / 100.0);
        int applicationCount = (int) Math.round(total * request.getApplicationPercent() / 100.0);
        int higherOrderCount = total - knowledgeCount - comprehensionCount - applicationCount;

        Map<String, Integer> bloomDeficits = new HashMap<>();
        bloomDeficits.put("KNOWLEDGE", knowledgeCount);
        bloomDeficits.put("COMPREHENSION", comprehensionCount);
        bloomDeficits.put("APPLICATION", applicationCount);
        bloomDeficits.put("HIGHER_ORDER", higherOrderCount);

        log.debug("Selecting {} {} questions: easy={} medium={} hard={}, bloom: K={} C={} A={} H={}",
                total, rule.getQuestionType(), easyCount, mediumCount, hardCount,
                knowledgeCount, comprehensionCount, applicationCount, higherOrderCount);

        String tenantId = TenantContext.getTenantId();
        Set<UUID> chapterIds = null;
        if (rule.getCategoryName() != null && !rule.getCategoryName().trim().isEmpty()) {
            String catNameClean = rule.getCategoryName().trim();
            List<String> matchedNames = entityManager.createQuery(
                "SELECT DISTINCT c.name FROM Chapter c WHERE c.classSubject.id = :csId AND (c.isActive = true OR c.isActive IS NULL) AND LOWER(c.categoryName) = LOWER(:catName)", String.class)
                .setParameter("csId", globalClassSubjectId)
                .setParameter("catName", catNameClean)
                .getResultList();

            List<String> cleanNames = matchedNames.stream()
                .filter(n -> n != null && !n.trim().isEmpty())
                .map(String::trim)
                .collect(Collectors.toList());

            List<UUID> catChapterIds;
            if (!cleanNames.isEmpty()) {
                catChapterIds = entityManager.createQuery(
                    "SELECT c.id FROM Chapter c WHERE c.classSubject.id = :csId AND (c.isActive = true OR c.isActive IS NULL) AND (LOWER(c.categoryName) = LOWER(:catName) OR LOWER(c.name) IN :cleanNames)", UUID.class)
                    .setParameter("csId", globalClassSubjectId)
                    .setParameter("catName", catNameClean)
                    .setParameter("cleanNames", cleanNames.stream().map(String::toLowerCase).collect(Collectors.toList()))
                    .getResultList();
            } else {
                catChapterIds = entityManager.createQuery(
                    "SELECT c.id FROM Chapter c WHERE c.classSubject.id = :csId AND (c.isActive = true OR c.isActive IS NULL) AND LOWER(c.categoryName) = LOWER(:catName)", UUID.class)
                    .setParameter("csId", globalClassSubjectId)
                    .setParameter("catName", catNameClean)
                    .getResultList();
            }
            
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

        // Fetch EASY batch
        List<String> preferredEasyBloom = getPreferredBloomLevels(bloomDeficits);
        List<Question> easyPool = fetchPool(tenantId, globalClassSubjectId,
                rule.getQuestionType(), Question.DifficultyLevel.EASY, preferredEasyBloom,
                request.getLanguage(), chapterIds, topicIds, currentExcludedIds, easyCount,
                request, exam.getCreatedBy());
        pool.addAll(easyPool);
        easyPool.forEach(q -> {
            currentExcludedIds.add(q.getId());
            String norm = normalizeBloomLevel(q.getBloomLevel());
            if (bloomDeficits.containsKey(norm)) {
                bloomDeficits.put(norm, Math.max(0, bloomDeficits.get(norm) - 1));
            }
        });

        // Fetch MEDIUM batch
        List<String> preferredMediumBloom = getPreferredBloomLevels(bloomDeficits);
        List<Question> mediumPool = fetchPool(tenantId, globalClassSubjectId,
                rule.getQuestionType(), Question.DifficultyLevel.MEDIUM, preferredMediumBloom,
                request.getLanguage(), chapterIds, topicIds, currentExcludedIds, mediumCount,
                request, exam.getCreatedBy());
        pool.addAll(mediumPool);
        mediumPool.forEach(q -> {
            currentExcludedIds.add(q.getId());
            String norm = normalizeBloomLevel(q.getBloomLevel());
            if (bloomDeficits.containsKey(norm)) {
                bloomDeficits.put(norm, Math.max(0, bloomDeficits.get(norm) - 1));
            }
        });

        // Fetch HARD batch
        List<String> preferredHardBloom = getPreferredBloomLevels(bloomDeficits);
        List<Question> hardPool = fetchPool(tenantId, globalClassSubjectId,
                rule.getQuestionType(), Question.DifficultyLevel.HARD, preferredHardBloom,
                request.getLanguage(), chapterIds, topicIds, currentExcludedIds, hardCount,
                request, exam.getCreatedBy());
        pool.addAll(hardPool);
        hardPool.forEach(q -> {
            currentExcludedIds.add(q.getId());
            String norm = normalizeBloomLevel(q.getBloomLevel());
            if (bloomDeficits.containsKey(norm)) {
                bloomDeficits.put(norm, Math.max(0, bloomDeficits.get(norm) - 1));
            }
        });

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
                List<String> preferredFallbackBloom = getPreferredBloomLevels(bloomDeficits);
                List<Question> fallbackPool = fetchPool(tenantId, globalClassSubjectId,
                        rule.getQuestionType(), level, preferredFallbackBloom,
                        request.getLanguage(), chapterIds, topicIds, currentExcludedIds, deficit,
                        request, exam.getCreatedBy());
                if (!fallbackPool.isEmpty()) {
                    pool.addAll(fallbackPool);
                    fallbackPool.forEach(q -> {
                        currentExcludedIds.add(q.getId());
                        String norm = normalizeBloomLevel(q.getBloomLevel());
                        if (bloomDeficits.containsKey(norm)) {
                            bloomDeficits.put(norm, Math.max(0, bloomDeficits.get(norm) - 1));
                        }
                    });
                    deficit -= fallbackPool.size();
                }
            }
        }

        // If we still have a deficit, try fallback question types (e.g. CQ_DESCRIPTIVE <-> CQ)
        if (pool.size() < total) {
            int deficit = total - pool.size();
            List<String> fallbackTypes = new ArrayList<>();
            if ("CQ_DESCRIPTIVE".equalsIgnoreCase(rule.getQuestionType())) {
                fallbackTypes.add("CQ");
            } else if ("CQ".equalsIgnoreCase(rule.getQuestionType())) {
                fallbackTypes.add("CQ_DESCRIPTIVE");
            }

            for (String fallbackType : fallbackTypes) {
                if (deficit <= 0) {
                    break;
                }
                log.info("Still have deficit of {} questions for type {}. Trying compatible fallback type {}.",
                        deficit, rule.getQuestionType(), fallbackType);

                List<Question.DifficultyLevel> allLevels = List.of(
                        Question.DifficultyLevel.MEDIUM,
                        Question.DifficultyLevel.EASY,
                        Question.DifficultyLevel.HARD
                );

                for (Question.DifficultyLevel level : allLevels) {
                    if (deficit <= 0) {
                        break;
                    }
                    List<String> preferredFallbackBloom = getPreferredBloomLevels(bloomDeficits);
                    List<Question> fallbackPool = fetchPool(tenantId, globalClassSubjectId,
                            fallbackType, level, preferredFallbackBloom,
                            request.getLanguage(), chapterIds, topicIds, currentExcludedIds, deficit,
                            request, exam.getCreatedBy());
                    if (!fallbackPool.isEmpty()) {
                        pool.addAll(fallbackPool);
                        fallbackPool.forEach(q -> {
                            currentExcludedIds.add(q.getId());
                            String norm = normalizeBloomLevel(q.getBloomLevel());
                            if (bloomDeficits.containsKey(norm)) {
                                bloomDeficits.put(norm, Math.max(0, bloomDeficits.get(norm) - 1));
                            }
                        });
                        deficit -= fallbackPool.size();
                    }
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
            String type,
            Question.DifficultyLevel difficulty,
            List<String> preferredBloomLevels,
            String language,
            Set<UUID> chapterIds,
            Set<UUID> topicIds,
            Set<UUID> excludedIds,
            int needed,
            ExamGenerationRequest request,
            String createdBy) {

        if (needed <= 0) return new ArrayList<>();

        // If usedPercent is specified, partition the query
        if (request.getUsedPercent() != null && request.getUsedPercent() >= 0 && request.getUsedPercent() <= 100) {
            int targetUsed = (int) Math.round(needed * request.getUsedPercent() / 100.0);
            int targetUnused = needed - targetUsed;

            List<Question> usedList = new ArrayList<>();
            if (request.getExamAllocations() != null && !request.getExamAllocations().isEmpty() && targetUsed > 0) {
                List<ExamGenerationRequest.ExamAllocationRequest> activeAllocations = request.getExamAllocations().stream()
                        .filter(a -> a.getPercent() != null && a.getPercent() > 0)
                        .collect(Collectors.toList());

                if (!activeAllocations.isEmpty()) {
                    int allocatedCount = 0;
                    Set<UUID> localExclusions = new HashSet<>(excludedIds);

                    for (int i = 0; i < activeAllocations.size(); i++) {
                        ExamGenerationRequest.ExamAllocationRequest alloc = activeAllocations.get(i);
                        int countForThisExam;
                        if (i == activeAllocations.size() - 1) {
                            countForThisExam = targetUsed - allocatedCount;
                        } else {
                            countForThisExam = (int) Math.round(targetUsed * alloc.getPercent() / 100.0);
                        }

                        if (countForThisExam > 0) {
                            List<Question> listForThisExam = queryPool(tenantId, classSubjectId, type, difficulty, preferredBloomLevels,
                                    language, chapterIds, topicIds, localExclusions, countForThisExam, request, createdBy, true, alloc.getExamId());
                            usedList.addAll(listForThisExam);
                            listForThisExam.forEach(q -> localExclusions.add(q.getId()));
                            allocatedCount += listForThisExam.size();
                        }
                    }

                    // Fallback to any used questions if deficit remains
                    if (usedList.size() < targetUsed) {
                        int deficit = targetUsed - usedList.size();
                        Set<UUID> finalUsedExclusions = new HashSet<>(excludedIds);
                        usedList.forEach(q -> finalUsedExclusions.add(q.getId()));

                        List<Question> generalUsedList = queryPool(tenantId, classSubjectId, type, difficulty, preferredBloomLevels,
                                language, chapterIds, topicIds, finalUsedExclusions, deficit, request, createdBy, true, null);
                        usedList.addAll(generalUsedList);
                    }
                } else {
                    usedList = queryPool(tenantId, classSubjectId, type, difficulty, preferredBloomLevels,
                            language, chapterIds, topicIds, excludedIds, targetUsed, request, createdBy, true, null);
                }
            } else {
                usedList = queryPool(tenantId, classSubjectId, type, difficulty, preferredBloomLevels,
                        language, chapterIds, topicIds, excludedIds, targetUsed, request, createdBy, true, null);
            }

            Set<UUID> updatedExclusions = new HashSet<>(excludedIds);
            usedList.forEach(q -> updatedExclusions.add(q.getId()));

            List<Question> unusedList = queryPool(tenantId, classSubjectId, type, difficulty, preferredBloomLevels,
                    language, chapterIds, topicIds, updatedExclusions, targetUnused, request, createdBy, false, null);

            List<Question> combined = new ArrayList<>();
            combined.addAll(usedList);
            combined.addAll(unusedList);

            if (combined.size() < needed) {
                // Fallback: fetch remainder from general pool (ignore used/unused partition)
                int deficit = needed - combined.size();
                Set<UUID> finalExclusions = new HashSet<>(excludedIds);
                combined.forEach(q -> finalExclusions.add(q.getId()));

                List<Question> fallbackList = queryPool(tenantId, classSubjectId, type, difficulty, preferredBloomLevels,
                        language, chapterIds, topicIds, finalExclusions, deficit, request, createdBy, null, null);
                combined.addAll(fallbackList);
            }
            return combined;
        } else {
            // General query
            return queryPool(tenantId, classSubjectId, type, difficulty, preferredBloomLevels,
                    language, chapterIds, topicIds, excludedIds, needed, request, createdBy, null, null);
        }
    }

    private List<Question> queryPool(
            String tenantId,
            UUID classSubjectId,
            String type,
            Question.DifficultyLevel difficulty,
            List<String> preferredBloomLevels,
            String language,
            Set<UUID> chapterIds,
            Set<UUID> topicIds,
            Set<UUID> excludedIds,
            int needed,
            ExamGenerationRequest request,
            String createdBy,
            Boolean fetchUsedOnly,
            UUID filterExamId) {

        if (needed <= 0) return new ArrayList<>();

        StringBuilder jpql = new StringBuilder("SELECT DISTINCT q.id FROM Question q ");

        // 1. Joins
        if ("FAVORITES".equalsIgnoreCase(request.getSourceMode())) {
            jpql.append("JOIN QuestionFavorite qf ON qf.question = q ");
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(request.getSourceMode()) && request.getLectureIds() != null && !request.getLectureIds().isEmpty()) {
            jpql.append("JOIN LectureQuestion lq ON lq.question = q ");
        }

        boolean hasBoard = request.getBoards() != null && !request.getBoards().isEmpty();
        boolean hasYear = request.getYears() != null && !request.getYears().isEmpty();
        boolean hasSchool = request.getSchools() != null && !request.getSchools().isEmpty();

        if (hasBoard || hasYear || hasSchool) {
            jpql.append("JOIN q.sources qs ");
        }

        // 2. Base conditions
        jpql.append("WHERE q.status = 'APPROVED' AND q.deleted = false AND q.classSubject.id = :classSubjectId ");
        jpql.append("AND q.type = :type AND q.difficulty = :difficulty ");
        jpql.append("AND (q.language = :language OR q.language = 'Bilingual' OR :language = 'Bilingual' OR q.language IS NULL OR q.language = '') ");

        // 3. Chapter/Topic filters
        if (chapterIds != null && !chapterIds.isEmpty()) {
            jpql.append("AND q.chapter.id IN :chapterIds ");
            jpql.append("AND (q.chapter.isActive = true OR q.chapter.isActive IS NULL) ");
        }
        if (topicIds != null && !topicIds.isEmpty()) {
            jpql.append("AND q.topic.id IN :topicIds ");
            jpql.append("AND (q.chapter.isActive = true OR q.chapter.isActive IS NULL) ");
        }
        if (excludedIds != null && !excludedIds.isEmpty()) {
            jpql.append("AND q.id NOT IN :excludedIds ");
        }

        // 4. Source Mode filters
        if ("FAVORITES".equalsIgnoreCase(request.getSourceMode())) {
            jpql.append("AND qf.user.email = :createdBy ");
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(request.getSourceMode()) && request.getLectureIds() != null && !request.getLectureIds().isEmpty()) {
            jpql.append("AND lq.lecture.id IN :lectureIds ");
        }

        // 5. Board/Year/School filters
        if (hasBoard) {
            jpql.append("AND qs.sourceType = :boardExamType AND LOWER(qs.organizationName) IN :boards ");
        }
        if (hasYear) {
            jpql.append("AND qs.examYear IN :years ");
        }
        if (hasSchool) {
            jpql.append("AND qs.sourceType = :institutionTestType AND LOWER(qs.organizationName) IN :schools ");
        }

        // 6. Used/Unused filters
        if (fetchUsedOnly != null) {
            if (fetchUsedOnly) {
                if (filterExamId != null) {
                    jpql.append("AND EXISTS (SELECT eq.id FROM ExamQuestion eq WHERE eq.question = q AND eq.exam.id = :filterExamId) ");
                } else {
                    jpql.append("AND EXISTS (SELECT eq.id FROM ExamQuestion eq WHERE eq.question = q) ");
                }
            } else {
                if (filterExamId != null) {
                    jpql.append("AND NOT EXISTS (SELECT eq.id FROM ExamQuestion eq WHERE eq.question = q AND eq.exam.id = :filterExamId) ");
                } else {
                    jpql.append("AND NOT EXISTS (SELECT eq.id FROM ExamQuestion eq WHERE eq.question = q) ");
                }
            }
        }

        // Build JPA Query
        jakarta.persistence.TypedQuery<UUID> query = entityManager.createQuery(jpql.toString(), UUID.class);

        // Bind parameters
        query.setParameter("classSubjectId", classSubjectId);
        query.setParameter("type", type);
        query.setParameter("difficulty", difficulty);
        query.setParameter("language", language);

        if (chapterIds != null && !chapterIds.isEmpty()) {
            query.setParameter("chapterIds", chapterIds);
        }
        if (topicIds != null && !topicIds.isEmpty()) {
            query.setParameter("topicIds", topicIds);
        }
        if (excludedIds != null && !excludedIds.isEmpty()) {
            query.setParameter("excludedIds", excludedIds);
        }

        if ("FAVORITES".equalsIgnoreCase(request.getSourceMode())) {
            query.setParameter("createdBy", createdBy);
        } else if ("LECTURE_SHEETS".equalsIgnoreCase(request.getSourceMode()) && request.getLectureIds() != null && !request.getLectureIds().isEmpty()) {
            query.setParameter("lectureIds", request.getLectureIds());
        }

        if (hasBoard) {
            List<String> lowerBoards = request.getBoards().stream()
                    .map(String::toLowerCase)
                    .collect(Collectors.toList());
            query.setParameter("boards", lowerBoards);
            query.setParameter("boardExamType", com.testshaper.entity.QuestionSource.SourceType.BOARD_EXAM);
        }
        if (hasYear) {
            query.setParameter("years", request.getYears());
        }
        if (hasSchool) {
            List<String> lowerSchools = request.getSchools().stream()
                    .map(String::toLowerCase)
                    .collect(Collectors.toList());
            query.setParameter("schools", lowerSchools);
            query.setParameter("institutionTestType", com.testshaper.entity.QuestionSource.SourceType.INSTITUTION_TEST);
        }

        if (fetchUsedOnly != null && filterExamId != null) {
            query.setParameter("filterExamId", filterExamId);
        }

        List<UUID> eligibleIds = query.getResultList();

        if (eligibleIds.isEmpty()) {
            return new ArrayList<>();
        }

        // Shuffle the eligible IDs and limit them
        Collections.shuffle(eligibleIds, new Random());
        List<UUID> selectedIds = eligibleIds.stream().limit(Math.max(needed * 5, 50)).collect(Collectors.toList());

        // Fetch actual question entities
        List<Question> candidates = questionRepository.findAllById(selectedIds);
        Collections.shuffle(candidates, new Random());

        List<Question> selectedQuestions = new ArrayList<>();

        // Bloom matching pass
        if (preferredBloomLevels != null && !preferredBloomLevels.isEmpty()) {
            for (Question q : candidates) {
                if (selectedQuestions.size() >= needed) break;
                String qBloom = q.getBloomLevel();
                String normBloom = normalizeBloomLevel(qBloom);
                if (preferredBloomLevels.contains(normBloom)) {
                    selectedQuestions.add(q);
                }
            }
        }

        // General fill pass
        for (Question q : candidates) {
            if (selectedQuestions.size() >= needed) break;
            if (!selectedQuestions.contains(q)) {
                selectedQuestions.add(q);
            }
        }

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
                    rule.setQuestionsToAnswer(r.getQuestionsToAnswer());
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

    private void validateBloomDistribution(ExamGenerationRequest req) {
        int sum = req.getKnowledgePercent() + req.getComprehensionPercent() + req.getApplicationPercent() + req.getHigherOrderPercent();
        if (sum != 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bloom's Taxonomy percentages must sum to 100, got: " + sum);
        }
    }

    private void validateQuestionTypeRules(ExamGenerationRequest req) {
        int totalQ = req.getQuestionTypeRules().stream()
                .mapToInt(ExamGenerationRequest.QuestionTypeRule::getCount).sum();
        double totalM = req.getQuestionTypeRules().stream()
                .mapToDouble(r -> {
                    int effectiveCount = r.getQuestionsToAnswer() != null ? r.getQuestionsToAnswer() : r.getCount();
                    return effectiveCount * r.getMarksPerQuestion();
                }).sum();

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

        try {
            Map<String, Object> docSettings = new HashMap<>();
            docSettings.put("sourceMode", req.getSourceMode());
            if (req.getLectureIds() != null && !req.getLectureIds().isEmpty()) {
                docSettings.put("lectureIds", req.getLectureIds());
            }
            if (req.getBoards() != null && !req.getBoards().isEmpty()) {
                docSettings.put("boards", req.getBoards());
            }
            if (req.getYears() != null && !req.getYears().isEmpty()) {
                docSettings.put("years", req.getYears());
            }
            if (req.getSchools() != null && !req.getSchools().isEmpty()) {
                docSettings.put("schools", req.getSchools());
            }
            exam.setDocSettingsJson(objectMapper.writeValueAsString(docSettings));
        } catch (Exception e) {
            log.error("Failed to serialize docSettingsJson in buildExamEntity", e);
        }

        return exam;
    }

    public ExamDTO getPublicExam(UUID examId) {
        Exam exam = examRepository.findByIdWithQuestions(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));
        return toDTO(exam);
    }

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

    public Page<ExamSummaryDTO> listExams(String title, Exam.ExamType examType, Exam.ExamStatus status, UUID classSubjectId, Pageable pageable, String username, boolean isSuperAdmin) {
        String tenantId = TenantContext.getTenantId();
        String createdBy = isSuperAdmin ? null : username;
        return examRepository.findByTenantAndOptionalCreator(tenantId, title, createdBy, examType, status, classSubjectId, pageable).map(this::toSummaryDTO);
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
        boolean isSuperAdmin = false;
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                isSuperAdmin = auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN") || a.getAuthority().equals("SUPER_ADMIN"));
            }
        } catch (Exception ignored) {}

        if (!isSuperAdmin && !"DEFAULT".equals(currentTenant) && !exam.getTenantId().equals(currentTenant)) {
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
        dto.setTenantId(exam.getTenantId());
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
            qDto.setAlternativeToId(eq.getAlternativeToId());
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
            qDto.setDynamicData(q.getDynamicData());

            if (q.getSources() != null) {
                qDto.setSources(q.getSources().stream().map(src -> {
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
