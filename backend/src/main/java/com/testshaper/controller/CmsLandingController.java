package com.testshaper.controller;

import com.testshaper.dto.cms.CmsSectionDTO;
import com.testshaper.dto.cms.CmsSectionRequest;
import com.testshaper.service.CmsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cms/landing")
@RequiredArgsConstructor
public class CmsLandingController {

    private final CmsService cmsService;

    @GetMapping("/sections")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<CmsSectionDTO>> getAllSections() {
        return ResponseEntity.ok(cmsService.getAllSections());
    }

    @PutMapping("/sections/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<CmsSectionDTO> updateSection(@PathVariable UUID id, @RequestBody CmsSectionRequest request) {
        return ResponseEntity.ok(cmsService.updateSection(id, request));
    }

    @PatchMapping("/sections/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<CmsSectionDTO> updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(cmsService.updateStatus(id, payload.get("status")));
    }
}
