package com.testshaper.controller;

import com.testshaper.entity.AcademicClass;
import com.testshaper.entity.Chapter;
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

    // --- Subjects ---
    @PostMapping("/classes/{classId}/subjects")
    public ResponseEntity<Subject> createSubject(@PathVariable UUID classId, @RequestBody Subject subject) {
        return ResponseEntity.ok(academicService.createSubject(subject, classId));
    }

    @GetMapping("/classes/{classId}/subjects")
    public ResponseEntity<List<Subject>> getSubjectsByClass(@PathVariable UUID classId) {
        return ResponseEntity.ok(academicService.getSubjectsByClass(classId));
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

    // --- Chapters ---
    @PostMapping("/subjects/{subjectId}/chapters")
    public ResponseEntity<Chapter> createChapter(@PathVariable UUID subjectId, @RequestBody Chapter chapter) {
        return ResponseEntity.ok(academicService.createChapter(chapter, subjectId));
    }

    @GetMapping("/subjects/{subjectId}/chapters")
    public ResponseEntity<List<Chapter>> getChaptersBySubject(@PathVariable UUID subjectId) {
        return ResponseEntity.ok(academicService.getChaptersBySubject(subjectId));
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
