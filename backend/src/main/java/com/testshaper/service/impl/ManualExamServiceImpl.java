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
        if (!question.getTenantId().equals(currentTenant) && 
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

        Question.QuestionType type = null;
        if (params.getType() != null && !params.getType().isBlank()) {
            try {
                type = Question.QuestionType.valueOf(params.getType());
            } catch (Exception ignored) {
            }
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

        return questionRepository.searchApproved(
                tenantId,
                params.getClassSubjectId(),
                params.getChapterId(),
                params.getTopicId(),
                type,
                difficulty,
                language,
                keyword,
                pageable).map(this::toQuestionDTO);
    }

    // ── Get Exam ──────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
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

    // ── Delete Exam ───────────────────────────────────────────────────────────
    @Transactional
    public void deleteExam(UUID examId) {
        Exam exam = getExamOrThrow(examId);
        exam.setDeleted(true);
        examRepository.save(exam);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Exam getExamOrThrow(UUID examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));
                
        String currentTenant = TenantContext.getTenantId();
        // DEFAULT tenant can edit anything. Normal tenants can only edit their own.
        if (!"DEFAULT".equals(currentTenant) && !exam.getTenantId().equals(currentTenant)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied. Cannot modify cross-tenant data.");
        }
        return exam;
    }

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
            if (exam.getClassSubject().getSubject() != null)
                dto.setSubjectName(exam.getClassSubject().getSubject().getName());
            if (exam.getClassSubject().getAcademicClass() != null)
                dto.setClassName(exam.getClassSubject().getAcademicClass().getName());
        }

        dto.setQuestions(exam.getExamQuestions().stream()
                .map(eq -> {
                    ExamDTO.ExamQuestionDTO qDto = new ExamDTO.ExamQuestionDTO();
                    qDto.setId(eq.getId());
                    qDto.setOrder(eq.getQuestionOrder());
                    qDto.setMarks(eq.getMarks());
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
        if (q.getOptions() != null) {
            dto.setOptions(q.getOptions().stream().map(opt -> {
                ExamDTO.OptionDTO odto = new ExamDTO.OptionDTO();
                odto.setId(opt.getId());
                odto.setOptionText(opt.getOptionText());
                odto.setCorrect(opt.isCorrect());
                return odto;
            }).collect(Collectors.toList()));
        }
        return dto;
    }
}
