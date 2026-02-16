package com.testshaper.service;

import com.testshaper.entity.AcademicClass;
import com.testshaper.entity.Chapter;
import com.testshaper.entity.ClassSubject;
import com.testshaper.entity.Subject;
import com.testshaper.entity.Topic;

import java.util.List;
import java.util.UUID;

public interface AcademicService {

    // Class
    AcademicClass createClass(AcademicClass academicClass);

    List<AcademicClass> getAllClasses();

    void deleteClass(UUID id);

    // Subject (Global)
    Subject createSubject(Subject subject);

    // Create subject and assign to class immediately
    ClassSubject createAndAssignSubject(UUID classId, Subject subject);

    // Class Subject (Syllabus)
    ClassSubject assignSubjectToClass(UUID classId, UUID subjectId, UUID sessionId);

    List<com.testshaper.dto.ClassSubjectDTO> getSubjectsByClass(UUID classId);

    void deleteClassSubject(UUID id);

    List<Subject> getAllSubjects();

    void deleteSubject(UUID id);

    // Chapter
    Chapter createChapter(Chapter chapter, UUID classSubjectId);

    List<Chapter> getChaptersByClassSubject(UUID classSubjectId);

    List<Chapter> getAllChapters();

    void deleteChapter(UUID id);

    // Topic
    Topic createTopic(Topic topic, UUID chapterId);

    List<Topic> getTopicsByChapter(UUID chapterId);

    List<Topic> getAllTopics();

    void deleteTopic(UUID id);
}
