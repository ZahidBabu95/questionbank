package com.testshaper.service.impl;

import com.testshaper.dto.ExamDTO;
import com.testshaper.dto.ExamGenerationRequest;
import com.testshaper.dto.ExamSummaryDTO;
import com.testshaper.entity.*;
import com.testshaper.repository.ClassSubjectRepository;
import com.testshaper.repository.ExamQuestionPoolRepository;
import com.testshaper.repository.ExamRepository;
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
    private final ClassSubjectRepository classSubjectRepository;
    private final ObjectMapper objectMapper;

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

        for (ExamGenerationRequest.QuestionTypeRule rule : request.getQuestionTypeRules()) {
            List<ExamQuestion> selected = selectQuestionsForRule(
                    exam, rule, request, usedQuestionIds, orderCounter);
            allExamQuestions.addAll(selected);
            selected.forEach(eq -> usedQuestionIds.add(eq.getQuestion().getId()));
            orderCounter += selected.size();
        }

        // 6. Shuffle questions if requested
        if (request.isShuffleQuestions()) {
            Collections.shuffle(allExamQuestions, new Random());
            // Re-assign order after shuffle
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

        return toDTO(saved);
    }

    @Transactional
    public ExamDTO updateExam(UUID id, ExamDTO dto) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));

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
        Set<UUID> chapterIds = request.getChapterIds() != null
                ? new HashSet<>(request.getChapterIds())
                : null;

        List<Question> pool = new ArrayList<>();
        pool.addAll(pickRandom(fetchPool(tenantId, request.getClassSubjectId(),
                rule.getQuestionType(), Question.DifficultyLevel.EASY,
                request.getLanguage(), chapterIds, usedIds), easyCount, rule.getQuestionType(),
                Question.DifficultyLevel.EASY));
        pool.addAll(pickRandom(fetchPool(tenantId, request.getClassSubjectId(),
                rule.getQuestionType(), Question.DifficultyLevel.MEDIUM,
                request.getLanguage(), chapterIds, usedIds), mediumCount, rule.getQuestionType(),
                Question.DifficultyLevel.MEDIUM));
        pool.addAll(pickRandom(fetchPool(tenantId, request.getClassSubjectId(),
                rule.getQuestionType(), Question.DifficultyLevel.HARD,
                request.getLanguage(), chapterIds, usedIds), hardCount, rule.getQuestionType(),
                Question.DifficultyLevel.HARD));

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
            Set<UUID> excludedIds) {
        Set<UUID> safeExclusions = excludedIds.isEmpty()
                ? Set.of(UUID.randomUUID()) // avoids empty IN clause issues
                : excludedIds;
        Set<UUID> safeChapters = (chapterIds == null || chapterIds.isEmpty()) ? null : chapterIds;

        return questionPoolRepository.findEligibleQuestions(
                tenantId, classSubjectId, type, difficulty, language, safeChapters, safeExclusions);
    }

    /**
     * Weighted random pick — shuffles pool and takes first N.
     * Logs a warning (does NOT fail) if pool is too small — takes all available.
     */
    private List<Question> pickRandom(List<Question> pool, int needed,
            Question.QuestionType type,
            Question.DifficultyLevel difficulty) {
        if (pool.size() < needed) {
            log.warn("Insufficient questions: needed={} available={} type={} difficulty={}",
                    needed, pool.size(), type, difficulty);
        }
        Collections.shuffle(pool, new Random());
        return pool.stream().limit(Math.max(0, needed)).collect(Collectors.toList());
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
        return toDTO(exam);
    }

    public Page<ExamSummaryDTO> listExams(String title, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        return examRepository.findByTenant(tenantId, title, pageable).map(this::toSummaryDTO);
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
        exam.setDeleted(true);
        examRepository.save(exam);
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

        if (exam.getClassSubject() != null) {
            if (exam.getClassSubject().getSubject() != null)
                dto.setSubjectName(exam.getClassSubject().getSubject().getName());
            if (exam.getClassSubject().getAcademicClass() != null)
                dto.setClassName(exam.getClassSubject().getAcademicClass().getName());
        }

        dto.setQuestions(exam.getExamQuestions().stream().map(eq -> {
            ExamDTO.ExamQuestionDTO qDto = new ExamDTO.ExamQuestionDTO();
            qDto.setId(eq.getId());
            qDto.setOrder(eq.getQuestionOrder());
            qDto.setMarks(eq.getMarks());
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

            if (q.getType() == Question.QuestionType.MCQ) {
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
