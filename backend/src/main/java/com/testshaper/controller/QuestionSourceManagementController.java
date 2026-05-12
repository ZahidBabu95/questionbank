package com.testshaper.controller;

import com.testshaper.entity.QuestionSource;
import com.testshaper.repository.QuestionSourceRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/questions/manage-sources")
@RequiredArgsConstructor
public class QuestionSourceManagementController {

    private final QuestionSourceRepository questionSourceRepository;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<List<QuestionSourceRepository.SourceSummaryProjection>> getSourceSummary() {
        return ResponseEntity.ok(questionSourceRepository.getSourceSummary());
    }

    @GetMapping("/year-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<List<QuestionSourceRepository.YearSummaryProjection>> getYearSummary() {
        return ResponseEntity.ok(questionSourceRepository.getYearSummary());
    }

    @PostMapping("/rename")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<?> renameSource(@RequestBody RenameRequest request) {
        int updated = questionSourceRepository.renameOrganizationName(request.getOldName(), request.getNewName(), request.getSourceType());
        return ResponseEntity.ok(Map.of("message", "Renamed successfully", "updatedRecords", updated));
    }

    @PostMapping("/merge")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<?> mergeSources(@RequestBody MergeRequest request) {
        int updated = questionSourceRepository.mergeOrganizationNames(request.getOldNames(), request.getTargetName(), request.getSourceType());
        return ResponseEntity.ok(Map.of("message", "Merged successfully", "updatedRecords", updated));
    }

    @PostMapping("/rename-year")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<?> renameYear(@RequestBody RenameYearRequest request) {
        int updated = questionSourceRepository.renameExamYear(request.getOldYear(), request.getNewYear(), request.getSourceType());
        return ResponseEntity.ok(Map.of("message", "Year renamed successfully", "updatedRecords", updated));
    }

    @PostMapping("/merge-years")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<?> mergeYears(@RequestBody MergeYearRequest request) {
        int updated = questionSourceRepository.mergeExamYears(request.getOldYears(), request.getTargetYear(), request.getSourceType());
        return ResponseEntity.ok(Map.of("message", "Years merged successfully", "updatedRecords", updated));
    }

    @Data
    public static class RenameRequest {
        private String oldName;
        private String newName;
        private QuestionSource.SourceType sourceType;
    }

    @Data
    public static class MergeRequest {
        private List<String> oldNames;
        private String targetName;
        private QuestionSource.SourceType sourceType;
    }

    @Data
    public static class RenameYearRequest {
        private Integer oldYear;
        private Integer newYear;
        private QuestionSource.SourceType sourceType;
    }

    @Data
    public static class MergeYearRequest {
        private List<Integer> oldYears;
        private Integer targetYear;
        private QuestionSource.SourceType sourceType;
    }
}
