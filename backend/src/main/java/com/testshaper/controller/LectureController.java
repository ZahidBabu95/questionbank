package com.testshaper.controller;

import com.testshaper.dto.AddQuestionRequest;
import com.testshaper.dto.LectureDTO;
import com.testshaper.dto.LectureRequest;
import com.testshaper.service.impl.LectureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lectures")
@RequiredArgsConstructor
public class LectureController {

    private final LectureService lectureService;

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> createLecture(
            @Valid @RequestBody LectureRequest req,
            Authentication auth) {
        LectureDTO lecture = lectureService.createLecture(req, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("success", true, "message", "Lecture created successfully", "data", lecture));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> updateLecture(
            @PathVariable UUID id,
            @Valid @RequestBody LectureRequest req) {
        LectureDTO lecture = lectureService.updateLecture(id, req);
        return ResponseEntity.ok(Map.of("success", true, "data", lecture));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> getLecture(@PathVariable UUID id) {
        LectureDTO lecture = lectureService.getLecture(id);
        return ResponseEntity.ok(Map.of("success", true, "data", lecture));
    }

    @GetMapping("/list")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> listLectures(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LectureDTO> lectures = lectureService.listLectures(search, pageable);
        return ResponseEntity.ok(Map.of("success", true, "data", lectures));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> deleteLecture(@PathVariable UUID id) {
        lectureService.deleteLecture(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Lecture deleted"));
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> publishLecture(@PathVariable UUID id) {
        LectureDTO lecture = lectureService.publishLecture(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Lecture published", "data", lecture));
    }

    // Question Management

    @PostMapping("/{id}/add-question")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> addQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody AddQuestionRequest req) {
        LectureDTO lecture = lectureService.addQuestion(id, req);
        return ResponseEntity.ok(Map.of("success", true, "message", "Question added to lecture", "data", lecture));
    }

    @DeleteMapping("/{lectureId}/remove-question/{questionId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> removeQuestion(
            @PathVariable UUID lectureId,
            @PathVariable UUID questionId) {
        LectureDTO lecture = lectureService.removeQuestion(lectureId, questionId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Question removed", "data", lecture));
    }

    // AI Features

    @PostMapping("/ai-generate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> aiGenerate(
            @RequestBody Map<String, String> payload) {
        String topic = payload.get("topic");
        String classLevel = payload.get("class");
        String diff = payload.get("difficulty");
        String lang = payload.get("language");

        Map<String, Object> aiContent = lectureService.generateAILectureContent(topic, classLevel, diff, lang);
        return ResponseEntity.ok(Map.of("success", true, "data", aiContent));
    }
}
