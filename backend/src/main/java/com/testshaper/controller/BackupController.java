package com.testshaper.controller;

import com.testshaper.entity.BackupHistory;
import com.testshaper.service.BackupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/v1/settings/backup")
@RequiredArgsConstructor
public class BackupController {

    private final BackupService backupService;

    @PostMapping("/manual")
    @PreAuthorize("hasRole('SUPER_ADMIN')") // Only Super Admin for now
    public CompletableFuture<ResponseEntity<BackupHistory>> triggerManualBackup(
            @RequestParam(defaultValue = "FULL") BackupHistory.BackupType type,
            @RequestParam(required = false) String tenantId) {

        // TODO: Get current user ID from security context
        String triggeredBy = "ADMIN";

        return backupService.triggerManualBackup(tenantId, type, triggeredBy)
                .thenApply(ResponseEntity::ok);
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<BackupHistory>> getHistory(@RequestParam(required = false) String tenantId) {
        return ResponseEntity.ok(backupService.getBackupHistory(tenantId));
    }

    @DeleteMapping("/history/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteBackup(@PathVariable UUID id) {
        backupService.deleteBackup(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/download/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<byte[]> downloadBackup(@PathVariable UUID id) {
        byte[] data = backupService.getBackupFile(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"backup_" + id + ".sql\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(data);
    }

    @PostMapping("/restore/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> restoreBackup(@PathVariable UUID id) {
        backupService.restoreBackup(id);
        return ResponseEntity.ok("Restore initiated successfully.");
    }
}
