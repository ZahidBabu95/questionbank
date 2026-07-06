package com.testshaper.service.impl;

import com.testshaper.dto.*;
import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.security.TenantContext;
import com.testshaper.service.AIQuestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LectureService {

    private final LectureRepository lectureRepository;
    private final LectureSectionRepository sectionRepository;

    private final ClassSubjectRepository classSubjectRepository;
    private final ChapterRepository chapterRepository;
    private final TopicRepository topicRepository;
    private final QuestionRepository questionRepository;
    
    private final CurriculumDocumentChunkRepository chunkRepository;
    private final AIQuestionService aiQuestionService;
    private final ExamRepository examRepository;
    private final SourceBookIndexRepository sourceBookIndexRepository;


    @Transactional
    public LectureDTO createLecture(LectureRequest req, String username) {
        Lecture lecture = new Lecture();
        lecture.setTenantId(TenantContext.getTenantId());
        lecture.setTitle(req.getTitle());
        lecture.setLanguage(req.getLanguage());
        lecture.setDifficultyLevel(req.getDifficultyLevel());
        lecture.setLectureTimeMinutes(req.getLectureTimeMinutes());
        lecture.setTags(req.getTags());
        lecture.setCreatedBy(username);
        lecture.setStatus(Lecture.LectureStatus.DRAFT);

        setAcademicMappings(lecture, req);

        // Save to generate ID
        lecture = lectureRepository.save(lecture);

        // Process initial sections
        if (req.getSections() != null && !req.getSections().isEmpty()) {
            for (LectureRequest.LectureSectionRequest secReq : req.getSections()) {
                LectureSection section = new LectureSection();
                section.setLecture(lecture);
                section.setSectionTitle(secReq.getSectionTitle());
                section.setContent(secReq.getContent());
                section.setSectionOrder(secReq.getSectionOrder() != null ? secReq.getSectionOrder() : 0);
                
                if (secReq.getQuestionIds() != null && !secReq.getQuestionIds().isEmpty()) {
                    int order = 0;
                    for (UUID qId : secReq.getQuestionIds()) {
                        Question q = questionRepository.findById(qId).orElse(null);
                        if (q != null) {
                            LectureQuestion lq = new LectureQuestion();
                            lq.setLecture(lecture);
                            lq.setSection(section);
                            lq.setQuestion(q);
                            lq.setQuestionOrder(order++);
                            section.getSectionQuestions().add(lq);
                        }
                    }
                }
                lecture.getSections().add(section);
            }
        }

        // Process overall questions
        if (req.getQuestionIds() != null && !req.getQuestionIds().isEmpty()) {
            int order = 0;
            for (UUID qId : req.getQuestionIds()) {
                Question q = questionRepository.findById(qId).orElse(null);
                if (q != null) {
                    LectureQuestion lq = new LectureQuestion();
                    lq.setLecture(lecture);
                    lq.setQuestion(q);
                    lq.setQuestionOrder(order++);
                    lecture.getQuestions().add(lq);
                }
            }
        }

        return mapToDTO(lectureRepository.save(lecture));
    }

    @Transactional
    public LectureDTO updateLecture(UUID id, LectureRequest req) {
        Lecture lecture = getLectureEntity(id);

        lecture.setTitle(req.getTitle());
        lecture.setLanguage(req.getLanguage());
        lecture.setDifficultyLevel(req.getDifficultyLevel());
        lecture.setLectureTimeMinutes(req.getLectureTimeMinutes());
        lecture.setTags(req.getTags());

        setAcademicMappings(lecture, req);

        // Update sections
        lecture.getSections().clear();
        if (req.getSections() != null) {
            for (LectureRequest.LectureSectionRequest secReq : req.getSections()) {
                LectureSection section = new LectureSection();
                section.setLecture(lecture);
                section.setSectionTitle(secReq.getSectionTitle());
                section.setContent(secReq.getContent());
                section.setSectionOrder(secReq.getSectionOrder() != null ? secReq.getSectionOrder() : 0);
                
                if (secReq.getQuestionIds() != null && !secReq.getQuestionIds().isEmpty()) {
                    int order = 0;
                    for (UUID qId : secReq.getQuestionIds()) {
                        Question q = questionRepository.findById(qId).orElse(null);
                        if (q != null) {
                            LectureQuestion lq = new LectureQuestion();
                            lq.setLecture(lecture);
                            lq.setSection(section);
                            lq.setQuestion(q);
                            lq.setQuestionOrder(order++);
                            section.getSectionQuestions().add(lq);
                        }
                    }
                }
                lecture.getSections().add(section);
            }
        }

        // Update overall questions
        lecture.getQuestions().clear();
        if (req.getQuestionIds() != null && !req.getQuestionIds().isEmpty()) {
            int order = 0;
            for (UUID qId : req.getQuestionIds()) {
                Question q = questionRepository.findById(qId).orElse(null);
                if (q != null) {
                    LectureQuestion lq = new LectureQuestion();
                    lq.setLecture(lecture);
                    lq.setQuestion(q);
                    lq.setQuestionOrder(order++);
                    lecture.getQuestions().add(lq);
                }
            }
        }

        return mapToDTO(lectureRepository.save(lecture));
    }

    @Transactional(readOnly = true)
    public LectureDTO getLecture(UUID id) {
        return mapToDTO(getLectureEntity(id));
    }

    @Transactional(readOnly = true)
    public Page<LectureDTO> listLectures(String search, UUID classSubjectId, Pageable pageable) {
        Page<Lecture> specs;
        String tenantId = TenantContext.getTenantId();
        if (classSubjectId != null) {
            specs = (search != null && !search.isBlank())
                    ? lectureRepository.findByTenantIdAndClassSubjectIdAndTitleContainingIgnoreCaseAndDeletedFalse(tenantId, classSubjectId, search, pageable)
                    : lectureRepository.findByTenantIdAndClassSubjectIdAndDeletedFalse(tenantId, classSubjectId, pageable);
        } else {
            specs = (search != null && !search.isBlank())
                    ? lectureRepository.findByTenantIdAndTitleContainingIgnoreCaseAndDeletedFalse(tenantId, search, pageable)
                    : lectureRepository.findByTenantIdAndDeletedFalse(tenantId, pageable);
        }
        return specs.map(this::mapToDTOListView);
    }

    @Transactional
    public void deleteLecture(UUID id) {
        Lecture lecture = getLectureEntity(id);
        lecture.setDeleted(true);
        lectureRepository.save(lecture);
        log.info("Soft deleted lecture id={} tenant={}", id, TenantContext.getTenantId());
    }

    @Transactional
    public LectureDTO publishLecture(UUID id) {
        Lecture lecture = getLectureEntity(id);
        lecture.setStatus(Lecture.LectureStatus.PUBLISHED);
        return mapToDTO(lectureRepository.save(lecture));
    }

    // ── Question Management ──────────────────────────────────────────────────

    @Transactional
    public LectureDTO addQuestion(UUID lectureId, AddQuestionRequest req) {
        Lecture lecture = getLectureEntity(lectureId);
        if (req.getQuestionId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question ID is required");
        }
        Question question = questionRepository.findById(req.getQuestionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        // Tenant check for question
        if (!question.getTenantId().equals(TenantContext.getTenantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this question");
        }

        LectureQuestion lq = new LectureQuestion();
        lq.setLecture(lecture);
        lq.setQuestion(question);
        lq.setQuestionOrder(req.getOrder() != null ? req.getOrder() : lecture.getQuestions().size());

        if (req.getSectionId() != null) {
            LectureSection section = sectionRepository.findById(req.getSectionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found"));
            if (!section.getLecture().getId().equals(lecture.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Section does not belong to this lecture");
            }
            lq.setSection(section);
            section.getSectionQuestions().add(lq);
        } else {
            lecture.getQuestions().add(lq);
        }

        lectureRepository.save(lecture);
        return getLecture(lectureId); // Map after saving
    }

    @Transactional
    public LectureDTO removeQuestion(UUID lectureId, UUID questionId) {
        Lecture lecture = getLectureEntity(lectureId);

        // Remove from uncategorized questions
        lecture.getQuestions().removeIf(lq -> lq.getQuestion().getId().equals(questionId));

        // Remove from sections
        for (LectureSection sec : lecture.getSections()) {
            sec.getSectionQuestions().removeIf(lq -> lq.getQuestion().getId().equals(questionId));
        }

        return mapToDTO(lectureRepository.save(lecture));
    }

    public Map<String, Object> generateAILectureContent(String topic, UUID topicId, String classLevel, String difficulty, String language) {
        log.info("AI Generation requested for topic={} topicId={} level={}", topic, topicId, classLevel);
        
        String contextText = "";
        if (topicId != null) {
            List<CurriculumDocumentChunk> chunks = chunkRepository.findByMappedTopicId(topicId);
            if (chunks != null && !chunks.isEmpty()) {
                contextText = chunks.stream()
                        .map(CurriculumDocumentChunk::getChunkText)
                        .collect(Collectors.joining("\n\n"));
            }
        }

        String prompt = String.format(
                "You are an expert academic educator. Write a highly engaging, structured, and easy-to-understand explanation note in %s for the topic: '%s'.\n" +
                "Target Student Level: Class %s (Difficulty: %s)\n\n" +
                "Use the following textbook content as reference material to build exact, premium quality explanations:\n" +
                "=== TEXTBOOK MATERIAL START ===\n%s\n=== TEXTBOOK MATERIAL END ===\n\n" +
                "Requirements:\n" +
                "1. Provide a clear introduction, bulleted key concepts, and simplified definitions.\n" +
                "2. Provide 2-3 step-by-step real-world examples or analogies in %s that students can easily relate to.\n" +
                "3. Style your output directly in beautiful HTML format (using tags like <p>, <ul>, <li>, <strong>, <em>, <h3>, <blockquote>). Do not wrap the output in markdown block tick marks like ```html. Output only raw HTML.\n" +
                "4. Use LaTeX format inline (e.g. \\( ... \\) ) for math formulas if any.",
                language, topic, classLevel, difficulty, contextText.isEmpty() ? "No context available. Rely on expert curriculum knowledge." : contextText, language
        );

        String aiResult = "";
        try {
            aiResult = aiQuestionService.generateRawCompletion(prompt, null);
        } catch (Exception e) {
            log.error("AI Generation failed: {}", e.getMessage());
            aiResult = "<p><i>(AI generation failed. Please refine manually or retry.)</i></p>";
        }

        return Map.of(
                "explanation", aiResult,
                "examples", "",
                "practiceQuestions", new ArrayList<>()
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getChapterMetadata(UUID chapterId) {
        log.info("Fetching chapter metadata for chapterId={}", chapterId);
        
        UUID resolvedChapterId = chapterId;
        java.util.Optional<SourceBookIndex> indexOpt = sourceBookIndexRepository.findById(chapterId);
        if (indexOpt.isPresent() && indexOpt.get().getMappedChapter() != null) {
            resolvedChapterId = indexOpt.get().getMappedChapter().getId();
            log.info("Resolved chapterId={} from SourceBookIndexId={}", resolvedChapterId, chapterId);
        }

        List<Topic> topics = topicRepository.findByChapterIdOrderByNameAsc(resolvedChapterId);
        
        List<Question> approvedQuestions = questionRepository.findByChapterIdAndStatusAndDeletedFalse(resolvedChapterId, Question.QuestionStatus.APPROVED);
        long approvedQuestionsCount = approvedQuestions != null ? approvedQuestions.size() : 0;

        long goldenChunksCount = 0;
        List<Map<String, Object>> topicList = new ArrayList<>();
        for (Topic t : topics) {
            List<CurriculumDocumentChunk> chunks = chunkRepository.findByMappedTopicId(t.getId());
            int chunkCount = chunks != null ? chunks.size() : 0;
            goldenChunksCount += chunkCount;
            
            String joinedChunks = chunks != null ? chunks.stream()
                    .map(CurriculumDocumentChunk::getChunkText)
                    .collect(Collectors.joining("\n\n")) : "";

            List<Question> topicApprovedQs = questionRepository.findByTopicIdAndStatusAndDeletedFalse(t.getId(), Question.QuestionStatus.APPROVED);
            List<Map<String, Object>> mappedQs = topicApprovedQs != null ? topicApprovedQs.stream().map(q -> {
                Map<String, Object> qMap = new HashMap<>();
                qMap.put("questionId", q.getId());
                qMap.put("questionText", q.getQuestionText());
                qMap.put("type", q.getType());
                qMap.put("difficulty", q.getDifficulty().name());
                qMap.put("marks", q.getMarks());
                qMap.put("mcqType", q.getMcqType());
                qMap.put("statements", q.getStatements());
                qMap.put("stimulus", q.getStimulus() != null ? q.getStimulus() : "");
                qMap.put("explanation", q.getExplanation() != null ? q.getExplanation() : "");
                qMap.put("correctAnswer", q.getCorrectAnswer() != null ? q.getCorrectAnswer() : "");
                qMap.put("chapterName", q.getChapter() != null ? q.getChapter().getName() : "");
                
                List<Map<String, Object>> optionsList = new ArrayList<>();
                if (q.getOptions() != null) {
                    for (QuestionOption opt : q.getOptions()) {
                        Map<String, Object> optMap = new HashMap<>();
                        optMap.put("optionLabel", opt.getOptionLabel());
                        optMap.put("optionText", opt.getOptionText());
                        optMap.put("isCorrect", opt.isCorrect());
                        optionsList.add(optMap);
                    }
                }
                qMap.put("options", optionsList);
                return qMap;
            }).collect(Collectors.toList()) : new ArrayList<>();

            Map<String, Object> tMap = new HashMap<>();
            tMap.put("id", t.getId());
            tMap.put("name", t.getName());
            tMap.put("chunkCount", chunkCount);
            tMap.put("goldenText", joinedChunks);
            tMap.put("approvedQuestions", mappedQs);
            
            topicList.add(tMap);
        }

        return Map.of(
            "topics", topicList,
            "approvedQuestionsCount", approvedQuestionsCount,
            "goldenChunksCount", goldenChunksCount
        );
    }

    // ── AI RAG and Exam bridge ────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> generateRAGLectureContent(UUID classSubjectId, UUID chapterId, String difficulty, String language) {
        log.info("Generating RAG lecture for chapterId={}, difficulty={}, language={}", chapterId, difficulty, language);
        
        List<Topic> topics = topicRepository.findByChapterIdOrderByNameAsc(chapterId);
        List<Map<String, Object>> sections = new ArrayList<>();
        
        for (int i = 0; i < topics.size(); i++) {
            Topic topic = topics.get(i);
            
            // 1. Fetch chunks for topic
            List<CurriculumDocumentChunk> chunks = chunkRepository.findByMappedTopicId(topic.getId());
            String contextText = chunks.stream()
                    .map(CurriculumDocumentChunk::getChunkText)
                    .collect(Collectors.joining("\n\n"));
            
            // 2. Call AI generate completion
            String noteContent = "";
            try {
                String prompt = String.format(
                        "You are a master teacher. Generate a highly detailed, professional, and easy-to-understand lecture note in %s for the topic: '%s'.\n" +
                        "Difficulty Level: %s\n" +
                        "Please use the following textbook context to extract exact, high-quality material:\n" +
                        "=== CONTEXT START ===\n%s\n=== CONTEXT END ===\n\n" +
                        "Requirements:\n" +
                        "1. Explain all definitions clearly and use step-by-step real-world examples in %s.\n" +
                        "2. Output the content directly in beautiful Markdown format.\n" +
                        "3. Use LaTeX syntax for equations/formulas if any.\n" +
                        "Make sure the response contains only the note, fully rendered in Markdown.",
                        language, topic.getName(), difficulty, contextText.isEmpty() ? "No context available. Rely on expert curriculum knowledge." : contextText, language
                );
                noteContent = aiQuestionService.generateRawCompletion(prompt, null);
            } catch (Exception e) {
                log.error("AI Generation failed for topic {}: {}", topic.getName(), e.getMessage());
                noteContent = "### " + topic.getName() + "\n\n(AI generation failed for this topic. Please write or regenerate content.)";
            }
            
            // 3. Fetch linked approved questions for this topic
            List<Question> approvedQuestions = questionRepository.findByTopicIdAndStatusAndDeletedFalse(topic.getId(), Question.QuestionStatus.APPROVED);
            
            List<Map<String, Object>> mappedQs = approvedQuestions.stream().map(q -> {
                Map<String, Object> qMap = new HashMap<>();
                qMap.put("questionId", q.getId());
                qMap.put("questionText", q.getQuestionText());
                qMap.put("type", q.getType());
                qMap.put("difficulty", q.getDifficulty().name());
                qMap.put("marks", q.getMarks());
                qMap.put("mcqType", q.getMcqType());
                qMap.put("statements", q.getStatements());
                return qMap;
            }).collect(Collectors.toList());
            
            Map<String, Object> sectionMap = new HashMap<>();
            sectionMap.put("topicId", topic.getId());
            sectionMap.put("sectionTitle", topic.getName());
            sectionMap.put("content", noteContent);
            sectionMap.put("sectionOrder", i);
            sectionMap.put("sectionQuestions", mappedQs);
            
            sections.add(sectionMap);
        }
        
        return Map.of(
                "title", "Lecture on Chapter Topics",
                "sections", sections
        );
    }

    @Transactional
    public ExamDTO createExamFromLecture(UUID lectureId, String username) {
        log.info("Creating exam from lectureId={}, requested by {}", lectureId, username);
        Lecture lecture = getLectureEntity(lectureId);
        
        // 1. Collect all questions from sections and the lecture root
        List<Question> questions = new ArrayList<>();
        
        for (LectureSection sec : lecture.getSections()) {
            for (LectureQuestion lq : sec.getSectionQuestions()) {
                if (lq.getQuestion() != null && !questions.contains(lq.getQuestion())) {
                    questions.add(lq.getQuestion());
                }
            }
        }
        
        for (LectureQuestion lq : lecture.getQuestions()) {
            if (lq.getQuestion() != null && !questions.contains(lq.getQuestion())) {
                questions.add(lq.getQuestion());
            }
        }
        
        if (questions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This lecture does not contain any questions.");
        }
        
        // 2. Create dynamic Exam entity
        Exam exam = new Exam();
        exam.setTenantId(TenantContext.getTenantId());
        exam.setTitle(lecture.getTitle() + " - Exam");
        exam.setExamType(Exam.ExamType.PRACTICE);
        exam.setDurationMinutes(45);
        exam.setLanguage(lecture.getLanguage() != null ? lecture.getLanguage() : "Bangla");
        exam.setCreatedBy(username);
        exam.setStatus(Exam.ExamStatus.DRAFT);
        exam.setEditorMode(ExamEditorMode.STRICT_LINKED);
        exam.setManual(true);
        exam.setTotalQuestions(questions.size());
        
        double totalMarks = 0.0;
        List<ExamQuestion> examQuestions = new ArrayList<>();
        int order = 1;
        for (Question q : questions) {
            ExamQuestion eq = new ExamQuestion();
            eq.setExam(exam);
            eq.setQuestion(q);
            eq.setMarks(q.getMarks() != null ? q.getMarks() : 1.0);
            eq.setQuestionOrder(order++);
            examQuestions.add(eq);
            totalMarks += eq.getMarks();
        }
        
        exam.setTotalMarks(totalMarks);
        exam.setExamQuestions(examQuestions);
        
        // Copy over class subject if present
        if (lecture.getClassSubject() != null) {
            exam.setClassSubject(lecture.getClassSubject());
        }
        
        Exam savedExam = examRepository.save(exam);
        log.info("Created exam id={} with {} questions from lecture id={}", savedExam.getId(), questions.size(), lectureId);
        
        return mapToExamDTO(savedExam);
    }

    private ExamDTO mapToExamDTO(Exam entity) {
        ExamDTO dto = new ExamDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setExamType(entity.getExamType());
        dto.setStatus(entity.getStatus());
        dto.setLanguage(entity.getLanguage());
        dto.setDurationMinutes(entity.getDurationMinutes());
        dto.setTotalMarks(entity.getTotalMarks());
        dto.setTotalQuestions(entity.getTotalQuestions());
        dto.setCreatedBy(entity.getCreatedBy());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setEditorMode(entity.getEditorMode());
        dto.setRawContent(entity.getRawContent());
        dto.setDocSettingsJson(entity.getDocSettingsJson());
        
        if (entity.getClassSubject() != null) {
            dto.setClassSubjectId(entity.getClassSubject().getId());
            if (entity.getClassSubject().getAcademicClass() != null) {
                dto.setClassId(entity.getClassSubject().getAcademicClass().getId());
                dto.setClassName(entity.getClassSubject().getAcademicClass().getName());
            }
            if (entity.getClassSubject().getSubject() != null) {
                dto.setSubjectId(entity.getClassSubject().getSubject().getId());
                dto.setSubjectName(entity.getClassSubject().getSubject().getName());
            }
        }
        
        // Map questions
        if (entity.getExamQuestions() != null) {
            List<ExamDTO.ExamQuestionDTO> eqList = entity.getExamQuestions().stream().map(eq -> {
                ExamDTO.ExamQuestionDTO eqdto = new ExamDTO.ExamQuestionDTO();
                eqdto.setId(eq.getId());
                eqdto.setOriginalQuestionId(eq.getQuestion().getId());
                eqdto.setOrder(eq.getQuestionOrder());
                eqdto.setMarks(eq.getMarks());
                eqdto.setQuestionText(eq.getOverrideQuestionText() != null ? eq.getOverrideQuestionText() : eq.getQuestion().getQuestionText());
                eqdto.setType(eq.getQuestion().getType());
                eqdto.setMcqType(eq.getQuestion().getMcqType());
                eqdto.setStatements(eq.getQuestion().getStatements());
                eqdto.setDifficulty(eq.getQuestion().getDifficulty());
                eqdto.setBloomLevel(eq.getQuestion().getBloomLevel());
                eqdto.setLanguage(eq.getQuestion().getLanguage());
                eqdto.setExplanation(eq.getQuestion().getExplanation());
                eqdto.setCorrectAnswer(eq.getQuestion().getCorrectAnswer());
                return eqdto;
            }).collect(Collectors.toList());
            dto.setQuestions(eqList);
        }
        
        return dto;
    }

    // ── Utility Methods ──────────────────────────────────────────────────────

    private Lecture getLectureEntity(UUID id) {
        if (id == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lecture ID is required");
        Lecture lecture = lectureRepository.findById(id)
                .filter(l -> !l.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lecture not found"));
        if (!lecture.getTenantId().equals(TenantContext.getTenantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return lecture;
    }

    private void setAcademicMappings(Lecture lecture, LectureRequest req) {
        if (req.getClassSubjectId() != null) {
            classSubjectRepository.findById(req.getClassSubjectId()).ifPresent(lecture::setClassSubject);
        }
        if (req.getChapterId() != null) {
            chapterRepository.findById(req.getChapterId()).ifPresent(lecture::setChapter);
        }
        if (req.getTopicId() != null) {
            topicRepository.findById(req.getTopicId()).ifPresent(lecture::setTopic);
        }
    }

    private LectureDTO mapToDTO(Lecture entity) {
        LectureDTO dto = new LectureDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setStatus(entity.getStatus().name());
        dto.setLanguage(entity.getLanguage());
        dto.setDifficultyLevel(entity.getDifficultyLevel());
        dto.setLectureTimeMinutes(entity.getLectureTimeMinutes());
        dto.setTags(entity.getTags());
        dto.setCreatedBy(entity.getCreatedBy());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setAiGenerated(entity.isAiGenerated());
        dto.setAiSummary(entity.getAiSummary());

        // Flat map class Subject etc
        if (entity.getClassSubject() != null) {
            dto.setClassSubjectId(entity.getClassSubject().getId());
            if (entity.getClassSubject().getAcademicClass() != null) {
                dto.setClassId(entity.getClassSubject().getAcademicClass().getId());
                dto.setClassName(entity.getClassSubject().getAcademicClass().getName());
            }
            if (entity.getClassSubject().getSubject() != null) {
                dto.setSubjectName(entity.getClassSubject().getSubject().getName());
            }
        }
        if (entity.getChapter() != null) {
            dto.setChapterId(entity.getChapter().getId());
            dto.setChapterName(entity.getChapter().getName());
        }
        if (entity.getTopic() != null) {
            dto.setTopicId(entity.getTopic().getId());
            dto.setTopicName(entity.getTopic().getName());
        }

        // Map Sections
        List<LectureDTO.LectureSectionDTO> secDtos = entity.getSections().stream().map(s -> {
            LectureDTO.LectureSectionDTO sdto = new LectureDTO.LectureSectionDTO();
            sdto.setId(s.getId());
            sdto.setSectionTitle(s.getSectionTitle());
            sdto.setContent(s.getContent());
            sdto.setSectionOrder(s.getSectionOrder());

            // Map Questions inside section
            sdto.setSectionQuestions(s.getSectionQuestions().stream()
                .map(this::mapToLectureQuestionDTO)
                .collect(Collectors.toList()));
            return sdto;
        }).collect(Collectors.toList());
        dto.setSections(secDtos);

        // Map uncategorized queries
        List<LectureDTO.LectureQuestionDTO> uncatDtos = entity.getQuestions().stream()
            .map(this::mapToLectureQuestionDTO)
            .collect(Collectors.toList());
        dto.setQuestions(uncatDtos);

        return dto;
    }

    private LectureDTO.LectureQuestionDTO mapToLectureQuestionDTO(LectureQuestion lq) {
        LectureDTO.LectureQuestionDTO qdto = new LectureDTO.LectureQuestionDTO();
        qdto.setId(lq.getId());
        if (lq.getQuestion() != null) {
            qdto.setQuestionId(lq.getQuestion().getId());
            qdto.setQuestionText(lq.getQuestion().getQuestionText());
            qdto.setType(lq.getQuestion().getType());
            qdto.setMcqType(lq.getQuestion().getMcqType());
            qdto.setStatements(lq.getQuestion().getStatements());
            qdto.setDifficulty(lq.getQuestion().getDifficulty().name());
            qdto.setMarks(lq.getQuestion().getMarks());
            qdto.setStimulus(lq.getQuestion().getStimulus());
            qdto.setExplanation(lq.getQuestion().getExplanation());
            qdto.setCorrectAnswer(lq.getQuestion().getCorrectAnswer());
            if (lq.getQuestion().getChapter() != null) {
                qdto.setChapterName(lq.getQuestion().getChapter().getName());
            }
            if (lq.getQuestion().getOptions() != null) {
                qdto.setOptions(lq.getQuestion().getOptions().stream().map(opt -> {
                    LectureDTO.LectureQuestionOptionDTO odto = new LectureDTO.LectureQuestionOptionDTO();
                    odto.setOptionLabel(opt.getOptionLabel());
                    odto.setOptionText(opt.getOptionText());
                    odto.setCorrect(opt.isCorrect());
                    return odto;
                }).collect(Collectors.toList()));
            }
        }
        qdto.setQuestionOrder(lq.getQuestionOrder());
        return qdto;
    }

    private LectureDTO mapToDTOListView(Lecture entity) {
        LectureDTO dto = new LectureDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setStatus(entity.getStatus().name());
        dto.setCreatedBy(entity.getCreatedBy());
        dto.setCreatedAt(entity.getCreatedAt());

        // Map academic fields for filtering and display in list view
        if (entity.getClassSubject() != null) {
            dto.setClassSubjectId(entity.getClassSubject().getId());
            if (entity.getClassSubject().getAcademicClass() != null) {
                dto.setClassId(entity.getClassSubject().getAcademicClass().getId());
                dto.setClassName(entity.getClassSubject().getAcademicClass().getName());
            }
            if (entity.getClassSubject().getSubject() != null) {
                dto.setSubjectName(entity.getClassSubject().getSubject().getName());
            }
        }
        if (entity.getChapter() != null) {
            dto.setChapterId(entity.getChapter().getId());
            dto.setChapterName(entity.getChapter().getName());
        }
        if (entity.getTopic() != null) {
            dto.setTopicId(entity.getTopic().getId());
            dto.setTopicName(entity.getTopic().getName());
        }

        // Skip sections for list view payload size reduction
        return dto;
    }
}
