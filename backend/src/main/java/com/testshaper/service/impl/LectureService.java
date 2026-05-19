package com.testshaper.service.impl;

import com.testshaper.dto.*;
import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;


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
                lecture.getSections().add(section);
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
                lecture.getSections().add(section);
            }
        }

        return mapToDTO(lectureRepository.save(lecture));
    }

    @Transactional(readOnly = true)
    public LectureDTO getLecture(UUID id) {
        return mapToDTO(getLectureEntity(id));
    }

    @Transactional(readOnly = true)
    public Page<LectureDTO> listLectures(String search, Pageable pageable) {
        Page<Lecture> specs = (search != null && !search.isBlank())
                ? lectureRepository.findByTenantIdAndTitleContainingIgnoreCase(TenantContext.getTenantId(), search,
                        pageable)
                : lectureRepository.findByTenantId(TenantContext.getTenantId(), pageable);
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

    // ── AI Helper ────────────────────────────────────────────────────────────

    public Map<String, Object> generateAILectureContent(String topic, String classLevel, String difficulty,
            String language) {
        // AI Integration Placeholder
        log.info("AI Generation requested for topic={} level={}", topic, classLevel);

        return Map.of(
                "explanation", "<p><b>" + topic + "</b> is an auto-generated AI explanation...</p>",
                "examples", "<p>Example 1: ...</p>",
                "practiceQuestions", List.of("Concept question 1?", "Problem statement 2?"));
    }

    // ── Utility Methods ──────────────────────────────────────────────────────

    private Lecture getLectureEntity(UUID id) {
        if (id == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lecture ID is required");
        Lecture lecture = lectureRepository.findById(id)
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
            if (entity.getClassSubject().getAcademicClass() != null) {
                dto.setClassName(entity.getClassSubject().getAcademicClass().getName());
            }
            if (entity.getClassSubject().getSubject() != null) {
                dto.setSubjectName(entity.getClassSubject().getSubject().getName());
            }
        }
        if (entity.getChapter() != null) {
            dto.setChapterName(entity.getChapter().getName());
        }
        if (entity.getTopic() != null) {
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
            sdto.setSectionQuestions(s.getSectionQuestions().stream().map(lq -> {
                LectureDTO.LectureQuestionDTO qdto = new LectureDTO.LectureQuestionDTO();
                qdto.setId(lq.getId());
                qdto.setQuestionId(lq.getQuestion().getId());
                qdto.setQuestionOrder(lq.getQuestionOrder());
                // Inline Question mapping
                qdto.setQuestionText(lq.getQuestion().getQuestionText());
                qdto.setType(lq.getQuestion().getType());
                qdto.setMcqType(lq.getQuestion().getMcqType());
                qdto.setStatements(lq.getQuestion().getStatements());
                qdto.setDifficulty(lq.getQuestion().getDifficulty().name());
                qdto.setMarks(lq.getQuestion().getMarks());
                return qdto;
            }).collect(Collectors.toList()));
            return sdto;
        }).collect(Collectors.toList());
        dto.setSections(secDtos);

        // Map uncategorized queries
        List<LectureDTO.LectureQuestionDTO> uncatDtos = entity.getQuestions().stream().map(lq -> {
            LectureDTO.LectureQuestionDTO qdto = new LectureDTO.LectureQuestionDTO();
            qdto.setId(lq.getId());
            qdto.setQuestionId(lq.getQuestion().getId());
            qdto.setQuestionOrder(lq.getQuestionOrder());
            qdto.setQuestionText(lq.getQuestion().getQuestionText());
            qdto.setType(lq.getQuestion().getType());
            qdto.setMcqType(lq.getQuestion().getMcqType());
            qdto.setStatements(lq.getQuestion().getStatements());
            qdto.setDifficulty(lq.getQuestion().getDifficulty().name());
            qdto.setMarks(lq.getQuestion().getMarks());
            return qdto;
        }).collect(Collectors.toList());
        dto.setQuestions(uncatDtos);

        return dto;
    }

    private LectureDTO mapToDTOListView(Lecture entity) {
        LectureDTO dto = new LectureDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setStatus(entity.getStatus().name());
        dto.setCreatedBy(entity.getCreatedBy());
        dto.setCreatedAt(entity.getCreatedAt());
        // Skip sections for list view payload size reduction
        return dto;
    }
}
