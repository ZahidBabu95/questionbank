package com.testshaper.controller;

import com.testshaper.dto.ExamDTO;
import com.testshaper.dto.ExamGenerationRequest;
import com.testshaper.dto.ExamSummaryDTO;
import com.testshaper.service.impl.ExamGenerationServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/exams/generate")
@RequiredArgsConstructor
public class ExamGenerationController {

    private final ExamGenerationServiceImpl examGenerationService;

    /**
     * POST /api/v1/exams/generate/auto
     * Auto-generate an exam from question bank.
     */
    @PostMapping("/auto")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('EXAMS_GEN_AUTO_CREATE', 'EXAM_PAPER_GENERATOR_AUTO_GENERATE_CREATE')")
    public ResponseEntity<Map<String, Object>> generateExam(
            @Valid @RequestBody ExamGenerationRequest request,
            Authentication auth) {
        ExamDTO exam = examGenerationService.generateExam(request, auth.getName());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Exam generated successfully",
                "data", exam));
    }

    /**
     * GET /api/v1/exams/generate/{examId}
     */
    @GetMapping("/{examId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('EXAMS_GEN_VIEW', 'EXAMS_VIEW', 'EXAM_PAPER_GENERATOR_VIEW', 'EXAM_PAPER_GENERATOR_AUTO_GENERATE_VIEW', 'EXAM_PAPER_GENERATOR_LEGACY_EDITOR_VIEW', 'EXAM_PAPER_GENERATOR_MANUAL_SELECT_VIEW', 'EXAM_PAPER_GENERATOR_NEXUS_PAPER_ENGINE_V2_VIEW', 'EXAM_PAPER_GENERATOR_PAPER_EDITOR_VIEW', 'EXAM_PAPER_GENERATOR_SAVED_EXAMS_VIEW')")
    public ResponseEntity<Map<String, Object>> getExam(@PathVariable UUID examId) {
        ExamDTO exam = examGenerationService.getExam(examId);
        return ResponseEntity.ok(Map.of("success", true, "data", exam));
    }

    /**
     * GET /api/v1/exams/generate/{examId}/preview
     * Same as getExam — returns full question list for preview.
     */
    @GetMapping("/{examId}/preview")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('EXAMS_GEN_VIEW', 'EXAMS_VIEW', 'EXAM_PAPER_GENERATOR_VIEW', 'EXAM_PAPER_GENERATOR_AUTO_GENERATE_VIEW', 'EXAM_PAPER_GENERATOR_LEGACY_EDITOR_VIEW', 'EXAM_PAPER_GENERATOR_MANUAL_SELECT_VIEW', 'EXAM_PAPER_GENERATOR_NEXUS_PAPER_ENGINE_V2_VIEW', 'EXAM_PAPER_GENERATOR_PAPER_EDITOR_VIEW', 'EXAM_PAPER_GENERATOR_SAVED_EXAMS_VIEW')")
    public ResponseEntity<Map<String, Object>> previewExam(@PathVariable UUID examId) {
        ExamDTO exam = examGenerationService.getExam(examId);
        return ResponseEntity.ok(Map.of("success", true, "data", exam));
    }

    /**
     * POST /api/v1/exams/generate/{examId}/regenerate
     * Regenerate using same configuration but new random questions.
     */
    @PostMapping("/{examId}/regenerate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('EXAMS_GEN_EDIT', 'EXAMS_GEN_AUTO_EDIT', 'EXAM_PAPER_GENERATOR_AUTO_GENERATE_EDIT')")
    public ResponseEntity<Map<String, Object>> regenerateExam(
            @PathVariable UUID examId,
            Authentication auth) {
        ExamDTO exam = examGenerationService.regenerateExam(examId, auth.getName());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Exam regenerated successfully",
                "data", exam));
    }

    /**
     * DELETE /api/v1/exams/generate/{examId}
     */
    @DeleteMapping("/{examId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('EXAMS_GEN_DELETE', 'EXAM_PAPER_GENERATOR_DELETE', 'EXAMS_GEN_AUTO_DELETE', 'EXAM_PAPER_GENERATOR_AUTO_GENERATE_DELETE', 'EXAM_PAPER_GENERATOR_LEGACY_EDITOR_DELETE', 'EXAM_PAPER_GENERATOR_MANUAL_SELECT_DELETE', 'EXAM_PAPER_GENERATOR_NEXUS_PAPER_ENGINE_V2_DELETE', 'EXAM_PAPER_GENERATOR_PAPER_EDITOR_DELETE', 'EXAM_PAPER_GENERATOR_SAVED_EXAMS_DELETE')")
    public ResponseEntity<Map<String, Object>> deleteExam(@PathVariable UUID examId) {
        examGenerationService.deleteExam(examId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Exam deleted"));
    }

    /**
     * PUT /api/v1/exams/generate/{examId}
     */
    @PutMapping("/{examId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('EXAMS_GEN_EDIT', 'EXAMS_GEN_AUTO_EDIT', 'EXAM_PAPER_GENERATOR_AUTO_GENERATE_EDIT', 'EXAM_PAPER_GENERATOR_LEGACY_EDITOR_EDIT', 'EXAM_PAPER_GENERATOR_MANUAL_SELECT_EDIT', 'EXAM_PAPER_GENERATOR_NEXUS_PAPER_ENGINE_V2_EDIT', 'EXAM_PAPER_GENERATOR_PAPER_EDITOR_EDIT', 'EXAM_PAPER_GENERATOR_SAVED_EXAMS_EDIT')")
    public ResponseEntity<Map<String, Object>> updateExam(
            @PathVariable UUID examId,
            @RequestBody ExamDTO dto) {
        try {
            ExamDTO updated = examGenerationService.updateExam(examId, dto);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Exam updated successfully",
                    "data", updated));
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * GET /api/v1/exams/generate (list)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('EXAMS_GEN_VIEW', 'EXAMS_VIEW', 'EXAM_PAPER_GENERATOR_VIEW', 'EXAM_PAPER_GENERATOR_AUTO_GENERATE_VIEW', 'EXAM_PAPER_GENERATOR_LEGACY_EDITOR_VIEW', 'EXAM_PAPER_GENERATOR_MANUAL_SELECT_VIEW', 'EXAM_PAPER_GENERATOR_NEXUS_PAPER_ENGINE_V2_VIEW', 'EXAM_PAPER_GENERATOR_PAPER_EDITOR_VIEW', 'EXAM_PAPER_GENERATOR_SAVED_EXAMS_VIEW')")
    public ResponseEntity<Map<String, Object>> listExams(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) com.testshaper.entity.Exam.ExamType examType,
            @RequestParam(required = false) com.testshaper.entity.Exam.ExamStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        boolean isSuperAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ExamSummaryDTO> exams = examGenerationService.listExams(title, examType, status, pageable, auth.getName(), isSuperAdmin);
        return ResponseEntity.ok(Map.of("success", true, "data", exams));
    }
}
