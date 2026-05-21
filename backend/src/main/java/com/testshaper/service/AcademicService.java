package com.testshaper.service;

import com.testshaper.entity.AcademicLevel;
import com.testshaper.entity.AcademicStream;
import com.testshaper.entity.AcademicClass;
import com.testshaper.entity.AcademicGroup;
import com.testshaper.entity.Chapter;
import com.testshaper.entity.ClassSubject;
import com.testshaper.entity.Subject;
import com.testshaper.entity.Topic;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicService {

    // --- Academic Level ---
    AcademicLevel createLevel(AcademicLevel level);
    AcademicLevel updateLevel(UUID id, AcademicLevel level);
    List<AcademicLevel> getAllLevels();
    void deleteLevel(UUID id);

    // --- Academic Stream ---
    AcademicStream createStream(UUID levelId, AcademicStream stream);
    AcademicStream updateStream(UUID id, AcademicStream stream);
    List<AcademicStream> getStreamsByLevel(UUID levelId);
    void deleteStream(UUID id);

    // --- Academic Class ---
    AcademicClass createClass(UUID streamId, AcademicClass academicClass);
    AcademicClass updateClass(UUID id, AcademicClass academicClass);
    List<AcademicClass> getClassesByStream(UUID streamId);
    List<AcademicClass> getAllClasses();
    void deleteClass(UUID id);

    // --- Academic Group ---
    AcademicGroup createGroup(AcademicGroup group);
    List<AcademicGroup> getAllGroups();
    void deleteGroup(UUID id);

    // --- Subject (Global) ---
    Subject createSubject(Subject subject);
    Subject updateSubject(UUID id, Subject subject);
    List<Subject> getAllSubjects();
    void deleteSubject(UUID id);

    // --- Class Subject (Syllabus Mapping) ---
    void updateClassSubject(UUID id, com.testshaper.dto.ClassSubjectDTO dto);
    ClassSubject assignSubjectToClass(UUID classId, UUID subjectId, UUID groupId, UUID sessionId);
    ClassSubject createAndAssignSubject(UUID classId, UUID groupId, Subject subject);
    List<com.testshaper.dto.ClassSubjectDTO> getSubjectsByClass(UUID classId, UUID sessionId);
    List<com.testshaper.dto.ClassSubjectDTO> getSubjectsByClassAndGroup(UUID classId, UUID groupId, UUID sessionId);
    void deleteClassSubject(UUID id);
    Optional<ClassSubject> findClassSubjectById(UUID id);

    // --- Chapter ---
    Chapter createChapter(Chapter chapter, UUID classSubjectId);
    Chapter updateChapter(UUID id, Chapter chapter);
    List<Chapter> getChaptersByClassSubject(UUID classSubjectId);
    void deleteChapter(UUID id);

    // --- Topic ---
    Topic createTopic(Topic topic, UUID chapterId);
    Topic updateTopic(UUID id, Topic topic);
    List<Topic> getTopicsByChapter(UUID chapterId);
    void deleteTopic(UUID id);

    // --- Batch Hierarchy (single call for entire academic structure) ---
    java.util.Map<String, Object> getFullHierarchy(boolean bypassRestrictions);
}
