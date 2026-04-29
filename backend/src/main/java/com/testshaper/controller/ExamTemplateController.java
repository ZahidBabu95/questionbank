package com.testshaper.controller;

import com.testshaper.common.ApiResponse;
import com.testshaper.dto.ExamTemplateDTO;
import com.testshaper.service.ExamTemplateService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/exams/templates")
public class ExamTemplateController {

    private final ExamTemplateService service;

    public ExamTemplateController(ExamTemplateService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamTemplateDTO>>> getTemplates() {
        return ResponseEntity.ok(ApiResponse.success(service.getAvailableTemplates(), "Templates fetched successfully"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ExamTemplateDTO>> createTemplate(@RequestBody ExamTemplateDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(service.createTemplate(dto), "Template created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ExamTemplateDTO>> updateTemplate(@PathVariable UUID id, @RequestBody ExamTemplateDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(service.updateTemplate(id, dto), "Template updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable UUID id) {
        service.deleteTemplate(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Template deleted successfully"));
    }
}
