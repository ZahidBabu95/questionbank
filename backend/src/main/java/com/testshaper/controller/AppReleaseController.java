package com.testshaper.controller;

import com.testshaper.dto.cms.AppReleaseDTO;
import com.testshaper.dto.cms.AppReleaseRequest;
import com.testshaper.service.AppReleaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cms/apps")
@RequiredArgsConstructor
public class AppReleaseController {

    private final AppReleaseService appReleaseService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<AppReleaseDTO>> getAllReleases() {
        return ResponseEntity.ok(appReleaseService.getAllReleases());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AppReleaseDTO> createRelease(@RequestBody AppReleaseRequest request) {
        return ResponseEntity.ok(appReleaseService.createRelease(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AppReleaseDTO> updateRelease(@PathVariable UUID id, @RequestBody AppReleaseRequest request) {
        return ResponseEntity.ok(appReleaseService.updateRelease(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteRelease(@PathVariable UUID id) {
        appReleaseService.deleteRelease(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> uploadReleaseFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("platform") String platform) {
        try {
            String fileUrl = appReleaseService.uploadReleaseFile(file, platform);
            return ResponseEntity.ok(Collections.singletonMap("url", fileUrl));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", "Upload failed: " + e.getMessage()));
        }
    }
}
