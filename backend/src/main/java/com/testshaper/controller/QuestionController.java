package com.testshaper.controller;

import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import com.testshaper.service.QuestionService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    @PostMapping("/mcq/create")
    public ResponseEntity<Question> createMCQ(@RequestBody CreateMCQRequest request) {
        return ResponseEntity.ok(questionService.createMCQ(request.getQuestion(), request.getOptions()));
    }

    @PostMapping("/short/create")
    public ResponseEntity<Question> createShortQuestion(@RequestBody Question question) {
        return ResponseEntity.ok(questionService.createShortQuestion(question));
    }

    @PostMapping("/cq/create")
    public ResponseEntity<Question> createCQ(@RequestBody Question question) {
        return ResponseEntity.ok(questionService.createCQ(question));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Question> getQuestion(@PathVariable UUID id) {
        return ResponseEntity.ok(questionService.getQuestion(id));
    }

    @GetMapping("/{id}/options")
    public ResponseEntity<List<QuestionOption>> getOptions(@PathVariable UUID id) {
        return ResponseEntity.ok(questionService.getOptions(id));
    }

    @GetMapping("/list")
    public ResponseEntity<List<Question>> getAllQuestions() {
        return ResponseEntity.ok(questionService.getAllQuestions());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable UUID id) {
        questionService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<Question> approveQuestion(@PathVariable UUID id) {
        // TODO: Get approver from SecurityContext
        String approverId = "ADMIN";
        return ResponseEntity.ok(questionService.approveQuestion(id, approverId));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<Question> rejectQuestion(@PathVariable UUID id) {
        return ResponseEntity.ok(questionService.rejectQuestion(id));
    }

    @Data
    public static class CreateMCQRequest {
        private Question question;
        private List<QuestionOption> options;
    }
}
