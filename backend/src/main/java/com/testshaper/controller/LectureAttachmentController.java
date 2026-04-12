package com.testshaper.controller;

import com.testshaper.dto.AttachmentResponseDTO;
import com.testshaper.service.LectureAttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lectures/attachments")
@RequiredArgsConstructor
public class LectureAttachmentController {

    private final LectureAttachmentService attachmentService;

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<AttachmentResponseDTO> uploadAttachment(
            @RequestParam("lectureId") UUID lectureId,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        return ResponseEntity.ok(attachmentService.uploadAttachment(lectureId, title, description, file, auth.getName()));
    }

    @PostMapping("/link")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<AttachmentResponseDTO> addExternalLink(
            @RequestBody Map<String, String> payload,
            Authentication auth) {
        UUID lectureId = UUID.fromString(payload.get("lectureId"));
        String title = payload.get("title");
        String description = payload.get("description");
        String url = payload.get("url");
        return ResponseEntity.ok(attachmentService.addExternalLink(lectureId, title, description, url, auth.getName()));
    }

    @GetMapping("/lecture/{lectureId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<List<AttachmentResponseDTO>> getAttachments(@PathVariable UUID lectureId) {
        return ResponseEntity.ok(attachmentService.getAttachments(lectureId));
    }

    @DeleteMapping("/{attachmentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Void> deleteAttachment(@PathVariable UUID attachmentId) {
        attachmentService.deleteAttachment(attachmentId);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{attachmentId}/rename")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<AttachmentResponseDTO> renameAttachment(
            @PathVariable UUID attachmentId,
            @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(attachmentService.renameAttachment(attachmentId, payload.get("title")));
    }

    @PatchMapping("/reorder")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Void> reorderAttachments(@RequestBody List<UUID> attachmentIds) {
        attachmentService.reorderAttachments(attachmentIds);
        return ResponseEntity.ok().build();
    }
}
