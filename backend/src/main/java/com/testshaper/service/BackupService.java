package com.testshaper.service;

import com.testshaper.entity.BackupHistory;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

public interface BackupService {

    CompletableFuture<BackupHistory> triggerManualBackup(String tenantId, BackupHistory.BackupType type,
            String triggeredBy);

    List<BackupHistory> getBackupHistory(String tenantId);

    void deleteBackup(UUID id);

    byte[] getBackupFile(UUID id); // For download/restore

    void restoreBackup(UUID id);
}
