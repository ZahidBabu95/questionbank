package com.testshaper.controller;

import com.testshaper.entity.QuestionType;
import com.testshaper.service.QuestionTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/question-types")
@RequiredArgsConstructor
public class QuestionTypeController {

    private final QuestionTypeService questionTypeService;

    @GetMapping
    public ResponseEntity<List<QuestionType>> getAllQuestionTypes() {
        return ResponseEntity.ok(questionTypeService.getAllQuestionTypes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuestionType> getQuestionTypeById(@PathVariable UUID id) {
        return ResponseEntity.ok(questionTypeService.getQuestionTypeById(id));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<QuestionType> getQuestionTypeByCode(@PathVariable String code) {
        return ResponseEntity.ok(questionTypeService.getQuestionTypeByCode(code));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<QuestionType> createQuestionType(@RequestBody QuestionType questionType) {
        return new ResponseEntity<>(questionTypeService.createQuestionType(questionType), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<QuestionType> updateQuestionType(@PathVariable UUID id, @RequestBody QuestionType questionType) {
        return ResponseEntity.ok(questionTypeService.updateQuestionType(id, questionType));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> deleteQuestionType(@PathVariable UUID id) {
        questionTypeService.deleteQuestionType(id);
        return ResponseEntity.noContent().build();
    }
}
