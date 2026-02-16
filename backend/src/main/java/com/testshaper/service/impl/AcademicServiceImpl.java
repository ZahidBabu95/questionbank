package com.testshaper.service.impl;

import com.testshaper.entity.AcademicClass;
import com.testshaper.entity.Chapter;
import com.testshaper.entity.Subject;
import com.testshaper.entity.Topic;
import com.testshaper.repository.AcademicClassRepository;
import com.testshaper.repository.ChapterRepository;
import com.testshaper.repository.SubjectRepository;
import com.testshaper.repository.TopicRepository;
import com.testshaper.service.AcademicService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AcademicServiceImpl implements AcademicService {

    private final AcademicClassRepository classRepository;
    private final SubjectRepository subjectRepository;
    private final ChapterRepository chapterRepository;
    private final TopicRepository topicRepository;

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
    public Subject createSubject(Subject subject, UUID classId) {
        AcademicClass academicClass = classRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Class not found"));
        subject.setAcademicClass(academicClass);
        return subjectRepository.save(subject);
    }

    @Override
    public List<Subject> getSubjectsByClass(UUID classId) {
        return subjectRepository.findByAcademicClassId(classId);
    }

    @Override
    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteSubject(UUID id) {
        subjectRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Chapter createChapter(Chapter chapter, UUID subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new RuntimeException("Subject not found"));
        chapter.setSubject(subject);
        return chapterRepository.save(chapter);
    }

    @Override
    public List<Chapter> getChaptersBySubject(UUID subjectId) {
        return chapterRepository.findBySubjectId(subjectId);
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
