package com.testshaper.service;

import com.testshaper.entity.AcademicClass;
import com.testshaper.entity.Chapter;
import com.testshaper.entity.Subject;
import com.testshaper.entity.Topic;

import java.util.List;
import java.util.UUID;

public interface AcademicService {

    // Class
    AcademicClass createClass(AcademicClass academicClass);

    List<AcademicClass> getAllClasses();

    void deleteClass(UUID id);

    // Subject
    Subject createSubject(Subject subject, UUID classId);

    List<Subject> getSubjectsByClass(UUID classId);

    List<Subject> getAllSubjects();

    void deleteSubject(UUID id);

    // Chapter
    Chapter createChapter(Chapter chapter, UUID subjectId);

    List<Chapter> getChaptersBySubject(UUID subjectId);

    List<Chapter> getAllChapters();

    void deleteChapter(UUID id);

    // Topic
    Topic createTopic(Topic topic, UUID chapterId);

    List<Topic> getTopicsByChapter(UUID chapterId);

    List<Topic> getAllTopics();

    void deleteTopic(UUID id);
}
