package com.testshaper.controller;

import com.testshaper.dto.AiKnowledgeBaseDTO;
import com.testshaper.service.AiKnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/support/knowledge")
@RequiredArgsConstructor
public class AiKnowledgeBaseController {

    private final AiKnowledgeBaseService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AiKnowledgeBaseDTO>> getAll() {
        return ResponseEntity.ok(service.getAllKnowledge());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<AiKnowledgeBaseDTO> create(@RequestBody AiKnowledgeBaseDTO request, Authentication auth) {
        return ResponseEntity.ok(service.createKnowledge(request, auth.getName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<AiKnowledgeBaseDTO> update(@PathVariable UUID id, @RequestBody AiKnowledgeBaseDTO request) {
        return ResponseEntity.ok(service.updateKnowledge(id, request));
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<AiKnowledgeBaseDTO> toggleStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(service.toggleStatus(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deleteKnowledge(id);
        return ResponseEntity.ok().build();
    }
}
