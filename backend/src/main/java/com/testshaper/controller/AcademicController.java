package com.testshaper.controller;

import com.testshaper.entity.*;
import com.testshaper.service.AcademicService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/academic")
@RequiredArgsConstructor
public class AcademicController {

    private final AcademicService academicService;

    // --- Levels ---
    @PostMapping("/levels")
    public ResponseEntity<AcademicLevel> createLevel(@RequestBody AcademicLevel level) {
        return ResponseEntity.ok(academicService.createLevel(level));
    }
    @PutMapping("/levels/{id}")
    public ResponseEntity<AcademicLevel> updateLevel(@PathVariable UUID id, @RequestBody AcademicLevel level) {
        return ResponseEntity.ok(academicService.updateLevel(id, level));
    }
    @GetMapping("/levels")
    public ResponseEntity<List<AcademicLevel>> getAllLevels() {
        return ResponseEntity.ok(academicService.getAllLevels());
    }

    /** Returns complete academic hierarchy (levels, streams, classes, subjects) in a SINGLE call.
     *  This eliminates 20+ individual API calls that would exhaust the connection pool. */
    @GetMapping("/hierarchy")
    public ResponseEntity<?> getFullHierarchy(@RequestParam(required = false, defaultValue = "false") boolean bypass) {
        return ResponseEntity.ok(academicService.getFullHierarchy(bypass));
    }

    @DeleteMapping("/levels/{id}")
    public ResponseEntity<Void> deleteLevel(@PathVariable UUID id) {
        academicService.deleteLevel(id);
        return ResponseEntity.noContent().build();
    }

    // --- Streams ---
    @PostMapping("/levels/{levelId}/streams")
    public ResponseEntity<AcademicStream> createStream(@PathVariable UUID levelId, @RequestBody AcademicStream stream) {
        return ResponseEntity.ok(academicService.createStream(levelId, stream));
    }
    @PutMapping("/streams/{id}")
    public ResponseEntity<AcademicStream> updateStream(@PathVariable UUID id, @RequestBody AcademicStream stream) {
        return ResponseEntity.ok(academicService.updateStream(id, stream));
    }
    @GetMapping("/levels/{levelId}/streams")
    public ResponseEntity<List<AcademicStream>> getStreamsByLevel(@PathVariable UUID levelId) {
        return ResponseEntity.ok(academicService.getStreamsByLevel(levelId));
    }
    @DeleteMapping("/streams/{id}")
    public ResponseEntity<Void> deleteStream(@PathVariable UUID id) {
        academicService.deleteStream(id);
        return ResponseEntity.noContent().build();
    }

    // --- Classes ---
    @PostMapping("/streams/{streamId}/classes")
    public ResponseEntity<AcademicClass> createClass(@PathVariable UUID streamId, @RequestBody AcademicClass academicClass) {
        return ResponseEntity.ok(academicService.createClass(streamId, academicClass));
    }
    @PutMapping("/classes/{id}")
    public ResponseEntity<AcademicClass> updateClass(@PathVariable UUID id, @RequestBody AcademicClass academicClass) {
        return ResponseEntity.ok(academicService.updateClass(id, academicClass));
    }
    @GetMapping("/streams/{streamId}/classes")
    public ResponseEntity<List<AcademicClass>> getClassesByStream(@PathVariable UUID streamId) {
        return ResponseEntity.ok(academicService.getClassesByStream(streamId));
    }
    @GetMapping("/classes")
    public ResponseEntity<List<AcademicClass>> getAllClasses() {
        return ResponseEntity.ok(academicService.getAllClasses());
    }
    @DeleteMapping("/classes/{id}")
    public ResponseEntity<Void> deleteClass(@PathVariable UUID id) {
        academicService.deleteClass(id);
        return ResponseEntity.noContent().build();
    }

    // --- Groups ---
    @PostMapping("/groups")
    public ResponseEntity<AcademicGroup> createGroup(@RequestBody AcademicGroup group) {
        return ResponseEntity.ok(academicService.createGroup(group));
    }
    @GetMapping("/groups")
    public ResponseEntity<List<AcademicGroup>> getAllGroups() {
        return ResponseEntity.ok(academicService.getAllGroups());
    }
    @DeleteMapping("/groups/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable UUID id) {
        academicService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    // --- Subjects (Global) ---
    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Subject subject) {
        return ResponseEntity.ok(academicService.createSubject(subject));
    }
    @PutMapping("/subjects/{id}")
    public ResponseEntity<Subject> updateSubject(@PathVariable UUID id, @RequestBody Subject subject) {
        return ResponseEntity.ok(academicService.updateSubject(id, subject));
    }
    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getAllSubjects() {
        return ResponseEntity.ok(academicService.getAllSubjects());
    }
    @DeleteMapping("/subjects/{id}")
    public ResponseEntity<Void> deleteSubject(@PathVariable UUID id) {
        academicService.deleteSubject(id);
        return ResponseEntity.noContent().build();
    }

    // --- Class Subjects (Syllabus Mapping) ---
    @PostMapping("/classes/{classId}/subjects/assign")
    public ResponseEntity<ClassSubject> assignSubjectToClass(
            @PathVariable UUID classId,
            @RequestParam UUID subjectId,
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false) UUID sessionId) {
        return ResponseEntity.ok(academicService.assignSubjectToClass(classId, subjectId, groupId, sessionId));
    }

    @PostMapping("/classes/{classId}/subjects")
    public ResponseEntity<ClassSubject> createAndAssignSubject(
            @PathVariable UUID classId,
            @RequestParam(required = false) UUID groupId,
            @RequestBody Subject subject) {
        return ResponseEntity.ok(academicService.createAndAssignSubject(classId, groupId, subject));
    }

    @GetMapping("/classes/{classId}/subjects")
    public ResponseEntity<List<com.testshaper.dto.ClassSubjectDTO>> getSubjectsByClass(
            @PathVariable UUID classId,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) UUID sessionId) {
        if (groupId != null && sessionId != null) {
            if ("COMMON".equals(groupId)) {
                return ResponseEntity.ok(academicService.getSubjectsByClassAndGroup(classId, null, sessionId));
            }
            return ResponseEntity.ok(academicService.getSubjectsByClassAndGroup(classId, UUID.fromString(groupId), sessionId));
        }
        return ResponseEntity.ok(academicService.getSubjectsByClass(classId, sessionId));
    }

    @PutMapping("/class-subjects/{id}")
    public ResponseEntity<Void> updateClassSubject(@PathVariable UUID id, @RequestBody com.testshaper.dto.ClassSubjectDTO dto) {
        academicService.updateClassSubject(id, dto);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/class-subjects/{id}")
    public ResponseEntity<Void> deleteClassSubject(@PathVariable UUID id) {
        academicService.deleteClassSubject(id);
        return ResponseEntity.noContent().build();
    }

    /** Resolve full hierarchy IDs for a classSubjectId — used to restore picker state from history */
    @GetMapping("/class-subjects/{id}/hierarchy")
    public ResponseEntity<?> getClassSubjectHierarchy(@PathVariable UUID id) {
        return academicService.findClassSubjectById(id).map(cs -> {
            AcademicClass ac = cs.getAcademicClass();
            AcademicStream  st = ac.getStream();
            AcademicLevel   lv = st.getLevel();
            return ResponseEntity.ok(java.util.Map.of(
                "classSubjectId", cs.getId(),
                "classId",        ac.getId(),
                "streamId",       st.getId(),
                "levelId",        lv.getId()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- Chapters ---
    @PostMapping("/class-subjects/{classSubjectId}/chapters")
    public ResponseEntity<Chapter> createChapter(@PathVariable UUID classSubjectId, @RequestBody Chapter chapter) {
        return ResponseEntity.ok(academicService.createChapter(chapter, classSubjectId));
    }
    @PutMapping("/chapters/{id}")
    public ResponseEntity<Chapter> updateChapter(@PathVariable UUID id, @RequestBody Chapter chapter) {
        return ResponseEntity.ok(academicService.updateChapter(id, chapter));
    }
    @GetMapping("/class-subjects/{classSubjectId}/chapters")
    public ResponseEntity<List<Chapter>> getChaptersByClassSubject(
            @PathVariable UUID classSubjectId,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly) {
        return ResponseEntity.ok(academicService.getChaptersByClassSubject(classSubjectId, activeOnly));
    }
    @DeleteMapping("/chapters/{id}")
    public ResponseEntity<Void> deleteChapter(@PathVariable UUID id) {
        academicService.deleteChapter(id);
        return ResponseEntity.noContent().build();
    }

    // --- Topics ---
    @PostMapping("/chapters/{chapterId}/topics")
    public ResponseEntity<Topic> createTopic(@PathVariable UUID chapterId, @RequestBody Topic topic) {
        return ResponseEntity.ok(academicService.createTopic(topic, chapterId));
    }
    @PutMapping("/topics/{id}")
    public ResponseEntity<Topic> updateTopic(@PathVariable UUID id, @RequestBody Topic topic) {
        return ResponseEntity.ok(academicService.updateTopic(id, topic));
    }
    @GetMapping("/chapters/{chapterId}/topics")
    public ResponseEntity<List<Topic>> getTopicsByChapter(@PathVariable UUID chapterId) {
        return ResponseEntity.ok(academicService.getTopicsByChapter(chapterId));
    }
    @DeleteMapping("/topics/{id}")
    public ResponseEntity<Void> deleteTopic(@PathVariable UUID id) {
        academicService.deleteTopic(id);
        return ResponseEntity.noContent().build();
    }
}
