package com.testshaper.controller;

import com.testshaper.entity.AcademicClass;
import com.testshaper.entity.Chapter;
import com.testshaper.entity.ClassSubject;
import com.testshaper.entity.Subject;
import com.testshaper.entity.Topic;
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

    // --- Classes ---
    @PostMapping("/classes")
    public ResponseEntity<AcademicClass> createClass(@RequestBody AcademicClass academicClass) {
        return ResponseEntity.ok(academicService.createClass(academicClass));
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

    // --- Subjects (Global) ---
    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Subject subject) {
        return ResponseEntity.ok(academicService.createSubject(subject));
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

    // --- Class Subjects (Syllabus) ---
    @PostMapping("/classes/{classId}/subjects/{subjectId}/session/{sessionId}")
    public ResponseEntity<ClassSubject> assignSubjectToClass(
            @PathVariable UUID classId,
            @PathVariable UUID subjectId,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(academicService.assignSubjectToClass(classId, subjectId, sessionId));
    }

    @PostMapping("/classes/{classId}/subjects")
    public ResponseEntity<ClassSubject> createAndAssignSubject(@PathVariable UUID classId,
            @RequestBody Subject subject) {
        return ResponseEntity.ok(academicService.createAndAssignSubject(classId, subject));
    }

    @GetMapping("/classes/{classId}/subjects")
    public ResponseEntity<List<com.testshaper.dto.ClassSubjectDTO>> getSubjectsByClass(@PathVariable UUID classId) {
        return ResponseEntity.ok(academicService.getSubjectsByClass(classId));
    }

    @DeleteMapping("/class-subjects/{id}")
    public ResponseEntity<Void> deleteClassSubject(@PathVariable UUID id) {
        academicService.deleteClassSubject(id);
        return ResponseEntity.noContent().build();
    }

    // --- Chapters ---
    @PostMapping("/class-subjects/{classSubjectId}/chapters")
    public ResponseEntity<Chapter> createChapter(@PathVariable UUID classSubjectId, @RequestBody Chapter chapter) {
        return ResponseEntity.ok(academicService.createChapter(chapter, classSubjectId));
    }

    @GetMapping("/class-subjects/{classSubjectId}/chapters")
    public ResponseEntity<List<Chapter>> getChaptersByClassSubject(@PathVariable UUID classSubjectId) {
        return ResponseEntity.ok(academicService.getChaptersByClassSubject(classSubjectId));
    }

    @GetMapping("/chapters")
    public ResponseEntity<List<Chapter>> getAllChapters() {
        return ResponseEntity.ok(academicService.getAllChapters());
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

    @GetMapping("/chapters/{chapterId}/topics")
    public ResponseEntity<List<Topic>> getTopicsByChapter(@PathVariable UUID chapterId) {
        return ResponseEntity.ok(academicService.getTopicsByChapter(chapterId));
    }

    @GetMapping("/topics")
    public ResponseEntity<List<Topic>> getAllTopics() {
        return ResponseEntity.ok(academicService.getAllTopics());
    }

    @DeleteMapping("/topics/{id}")
    public ResponseEntity<Void> deleteTopic(@PathVariable UUID id) {
        academicService.deleteTopic(id);
        return ResponseEntity.noContent().build();
    }
}
