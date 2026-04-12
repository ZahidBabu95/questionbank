package com.testshaper.controller;

import com.testshaper.dto.performance.*;
import com.testshaper.service.PerformanceReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports/performance")
@RequiredArgsConstructor
public class PerformanceReportController {

    private final PerformanceReportService performanceService;

    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<StudentPerformanceDTO> getStudentPerformance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) UUID classId,
            @RequestParam(required = false) UUID subjectId) {
        return ResponseEntity.ok(performanceService.getStudentPerformance(startDate, endDate, classId, subjectId));
    }

    @GetMapping("/questions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<List<QuestionPerformanceDTO>> getQuestionPerformance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) UUID subjectId) {
        return ResponseEntity.ok(performanceService.getQuestionPerformance(startDate, endDate, subjectId));
    }

    @GetMapping("/exams/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<ExamPerformanceDTO> getExamPerformance(@PathVariable UUID id) {
        return ResponseEntity.ok(performanceService.getExamPerformance(id));
    }
}
