package com.testshaper.service.impl;

import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.service.AcademicService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AcademicServiceImpl implements AcademicService {

    private final AcademicClassRepository classRepository;
    private final SubjectRepository subjectRepository;
    private final ChapterRepository chapterRepository;
    private final TopicRepository topicRepository;
    private final ClassSubjectRepository classSubjectRepository;
    private final AcademicSessionRepository sessionRepository;

    @Override
    @Transactional
    public AcademicClass createClass(AcademicClass academicClass) {
        return classRepository.save(academicClass);
    }

    @Override
    public List<AcademicClass> getAllClasses() {
        return classRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteClass(UUID id) {
        classRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Subject createSubject(Subject subject) {
        // Create a global subject
        return subjectRepository.save(subject);
    }

    @Override
    @Transactional
    public ClassSubject createAndAssignSubject(UUID classId, Subject subject) {
        AcademicClass academicClass = classRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Class not found"));

        AcademicSession session = sessionRepository.findByIsActiveTrue()
                .orElseThrow(() -> new RuntimeException("No active academic session found. Please create one first."));

        // Check if subject exists (by code)
        Subject existingSubject = subjectRepository.findByCode(subject.getCode())
                .orElse(null);

        if (existingSubject == null) {
            existingSubject = subjectRepository.save(subject);
        }

        // Check if linkage exists
        if (classSubjectRepository.findByAcademicClassAndSubjectAndSession(academicClass, existingSubject, session)
                .isPresent()) {
            throw new RuntimeException("Subject is already assigned to this class for the current session.");
        }

        ClassSubject classSubject = new ClassSubject();
        classSubject.setAcademicClass(academicClass);
        classSubject.setSubject(existingSubject);
        classSubject.setSession(session);

        return classSubjectRepository.save(classSubject);
    }

    @Override
    @Transactional
    public ClassSubject assignSubjectToClass(UUID classId, UUID subjectId, UUID sessionId) {
        AcademicClass academicClass = classRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Class not found"));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new RuntimeException("Subject not found"));
        AcademicSession session = sessionRepository.findById(sessionId) // Assuming session ID is String in
                                                                        // Repo, but here UUID passed? Repo
                                                                        // uses String ID.
                .orElseThrow(() -> new RuntimeException("Session not found"));

        ClassSubject classSubject = new ClassSubject();
        classSubject.setAcademicClass(academicClass);
        classSubject.setSubject(subject);
        classSubject.setSession(session);

        return classSubjectRepository.save(classSubject);
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.testshaper.dto.ClassSubjectDTO> getSubjectsByClass(UUID classId) {
        log.info("Fetching subjects for classId: {}", classId);
        AcademicClass academicClass = classRepository.findById(classId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found with ID: " + classId));

        List<ClassSubject> classSubjects = classSubjectRepository.findByAcademicClassId(classId);
        log.info("Found {} class subjects for class: {}", classSubjects.size(), academicClass.getName());

        return classSubjects.stream()
                .map(cs -> {
                    com.testshaper.dto.ClassSubjectDTO dto = new com.testshaper.dto.ClassSubjectDTO();
                    dto.setClassSubjectId(cs.getId());
                    dto.setSubjectId(cs.getSubject().getId());
                    dto.setSubjectName(cs.getSubject().getName());
                    dto.setSubjectCode(cs.getSubject().getCode());
                    dto.setSubjectDescription(cs.getSubject().getDescription());
                    if (cs.getSession() != null) {
                        dto.setSessionId(cs.getSession().getId());
                        dto.setSessionName(cs.getSession().getName());
                    }
                    dto.setActive(cs.isActive());
                    return dto;
                })
                .toList();
    }

    @Override
    @Transactional
    public void deleteClassSubject(UUID id) {
        log.info("Deleting class subject with ID: {}", id);
        classSubjectRepository.findById(id).ifPresent(classSubjectRepository::delete);
    }

    @Override
    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteSubject(UUID id) {
        try {
            log.info("Deleting global subject with ID: {}", id);
            subjectRepository.deleteById(id);
            subjectRepository.flush(); // Force execute to catch constraints immediately
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            log.error("Failed to delete subject due to data integrity violation", e);
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot delete subject because it is assigned to direct classes. Please unassign it first.");
        } catch (Exception e) {
            log.error("Failed to delete subject", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to delete subject: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public Chapter createChapter(Chapter chapter, UUID classSubjectId) {
        ClassSubject classSubject = classSubjectRepository.findById(classSubjectId)
                .orElseThrow(() -> new RuntimeException("Class Subject not found"));
        chapter.setClassSubject(classSubject);
        return chapterRepository.save(chapter);
    }

    @Override
    public List<Chapter> getChaptersByClassSubject(UUID classSubjectId) {
        // Need to update repository to find by ClassSubject
        return chapterRepository.findByClassSubjectId(classSubjectId);
    }

    @Override
    public List<Chapter> getAllChapters() {
        return chapterRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteChapter(UUID id) {
        chapterRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Topic createTopic(Topic topic, UUID chapterId) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));
        topic.setChapter(chapter);
        return topicRepository.save(topic);
    }

    @Override
    public List<Topic> getTopicsByChapter(UUID chapterId) {
        return topicRepository.findByChapterId(chapterId);
    }

    @Override
    public List<Topic> getAllTopics() {
        return topicRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteTopic(UUID id) {
        topicRepository.deleteById(id);
    }
}
