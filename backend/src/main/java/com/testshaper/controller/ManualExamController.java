package com.testshaper.controller;

import com.testshaper.dto.*;
import com.testshaper.service.impl.ManualExamServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/exams/manual")
@RequiredArgsConstructor
public class ManualExamController {

    private final ManualExamServiceImpl manualExamService;

    @PostMapping("/create")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> createExam(
            @Valid @RequestBody ManualExamRequest req,
            Authentication auth) {
        System.out.println("DEBUG MANUAL EXAM: Entering createExam. User=" + (auth != null ? auth.getName() : "null"));
        System.out.println("DEBUG MANUAL EXAM: User authorities=" + (auth != null ? auth.getAuthorities() : "null"));
        ExamDTO exam = manualExamService.createExam(req, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("success", true, "message", "Exam created as draft", "data", exam));
    }

    /** PUT /api/v1/exams/manual/{examId} — update exam metadata */
    @PutMapping("/{examId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> updateExam(
            @PathVariable UUID examId,
            @Valid @RequestBody ManualExamRequest req) {
        ExamDTO exam = manualExamService.updateExam(examId, req);
        return ResponseEntity.ok(Map.of("success", true, "data", exam));
    }

    /** GET /api/v1/exams/manual/{examId} — get full exam */
    @GetMapping("/{examId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getExam(@PathVariable UUID examId) {
        return ResponseEntity.ok(Map.of("success", true, "data", manualExamService.getExam(examId)));
    }

    /** POST /api/v1/exams/manual/{examId}/add-question */
    @PostMapping("/{examId}/add-question")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> addQuestion(
            @PathVariable UUID examId,
            @Valid @RequestBody AddQuestionRequest req) {
        ExamDTO exam = manualExamService.addQuestion(examId, req);
        return ResponseEntity.ok(Map.of("success", true, "message", "Question added", "data", exam));
    }

    /** DELETE /api/v1/exams/manual/{examId}/remove-question/{questionId} */
    @DeleteMapping("/{examId}/remove-question/{questionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> removeQuestion(
            @PathVariable UUID examId,
            @PathVariable UUID questionId) {
        ExamDTO exam = manualExamService.removeQuestion(examId, questionId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Question removed", "data", exam));
    }

    /** PATCH /api/v1/exams/manual/{examId}/reorder */
    @PatchMapping("/{examId}/reorder")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> reorder(
            @PathVariable UUID examId,
            @RequestBody ReorderRequest req) {
        ExamDTO exam = manualExamService.reorderQuestions(examId, req);
        return ResponseEntity.ok(Map.of("success", true, "data", exam));
    }

    /** PATCH /api/v1/exams/manual/{examId}/publish */
    @PatchMapping("/{examId}/publish")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> publish(@PathVariable UUID examId) {
        ExamDTO exam = manualExamService.publishExam(examId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Exam published", "data", exam));
    }

    /** GET /api/v1/exams/manual/preview/{examId} */
    @GetMapping("/preview/{examId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> preview(@PathVariable UUID examId) {
        return ResponseEntity.ok(Map.of("success", true, "data", manualExamService.getExam(examId)));
    }

    /** DELETE /api/v1/exams/manual/{examId} */
    @DeleteMapping("/{examId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> deleteExam(@PathVariable UUID examId) {
        manualExamService.deleteExam(examId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Exam deleted"));
    }

    /**
     * GET /api/v1/exams/manual/questions/search
     * Left-panel question browser with filters.
     */
    @GetMapping("/questions/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> searchQuestions(
            @RequestParam(required = false) UUID classSubjectId,
            @RequestParam(required = false) UUID chapterId,
            @RequestParam(required = false) UUID topicId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        QuestionSearchParams params = new QuestionSearchParams();
        params.setClassSubjectId(classSubjectId);
        params.setChapterId(chapterId);
        params.setTopicId(topicId);
        params.setType(type);
        params.setDifficulty(difficulty);
        params.setLanguage(language);
        params.setKeyword(keyword);
        params.setPage(page);
        params.setSize(size);
        params.setSort(sort);

        Page<ExamDTO.ExamQuestionDTO> result = manualExamService.searchQuestions(params);
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }
}
