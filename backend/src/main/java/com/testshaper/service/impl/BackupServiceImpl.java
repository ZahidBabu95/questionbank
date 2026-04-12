package com.testshaper.service.impl;

import com.testshaper.entity.BackupHistory;
import com.testshaper.repository.BackupHistoryRepository;
import com.testshaper.service.BackupService;
import com.testshaper.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackupServiceImpl implements BackupService {

    private final BackupHistoryRepository repository;
    private final EncryptionUtil encryptionUtil;

    @Value("${app.backup.storage-path:./backups}")
    private String storagePath;

    @Value("${spring.datasource.username}")
    private String dbUser;

    @Value("${spring.datasource.password}")
    private String dbPassword;

    @Value("${spring.datasource.url}")
    private String dbUrl; // e.g., jdbc:mysql://localhost:3306/mydb

    private static final String MYSQL_DUMP_CMD = "mysqldump"; // Assumes in PATH

    @Override
    @Async
    @Transactional
    public CompletableFuture<BackupHistory> triggerManualBackup(String tenantId, BackupHistory.BackupType type,
            String triggeredBy) {
        log.info("Starting backup: Type={}, Tenant={}, TriggeredBy={}", type, tenantId, triggeredBy);

        BackupHistory history = new BackupHistory();
        history.setTenantId(tenantId);
        history.setType(type);
        history.setStatus(BackupHistory.BackupStatus.IN_PROGRESS);
        history.setStartedAt(LocalDateTime.now());
        history.setTriggeredBy(triggeredBy);
        history.setFilePath("PENDING"); // Temporary
        history = repository.save(history);

        try {
            // 1. Prepare Paths
            File storageDir = new File(storagePath);
            if (!storageDir.exists() && !storageDir.mkdirs()) {
                throw new IOException("Failed to create backup directory: " + storagePath);
            }

            String fileName = String.format("backup_%s_%s_%s.sql",
                    type,
                    tenantId != null ? tenantId : "FULL",
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")));

            Path finalPath = Paths.get(storagePath, fileName);

            // 2. Execute Dump
            if (type == BackupHistory.BackupType.FULL) {
                executeFullBackup(finalPath);
            } else {
                throw new UnsupportedOperationException("Only FULL backup is supported in this version.");
                // TODO: Implement other types (Tenant, Question, etc.)
            }

            // 3. Encrypt (Optional - skipping file encryption for MVP speed, using standard
            // dump)
            // Ideally we encrypt here before saving `finalPath` to DB.

            // 4. Update History
            history.setStatus(BackupHistory.BackupStatus.SUCCESS);
            history.setCompletedAt(LocalDateTime.now());
            history.setFilePath(finalPath.toString());
            history.setFileSize(Files.size(finalPath));
            repository.save(history);

            log.info("Backup completed successfully: {}", fileName);

        } catch (Exception e) {
            log.error("Backup failed", e);
            history.setStatus(BackupHistory.BackupStatus.FAILED);
            history.setErrorMessage(e.getMessage());
            history.setCompletedAt(LocalDateTime.now());
            repository.save(history);
        }

        return CompletableFuture.completedFuture(history);
    }

    private void executeFullBackup(Path targetPath) throws IOException, InterruptedException {
        // Parse DB name from URL (jdbc:mysql://localhost:3306/mydb -> mydb)
        String dbName = dbUrl.substring(dbUrl.lastIndexOf("/") + 1);
        if (dbName.contains("?"))
            dbName = dbName.substring(0, dbName.indexOf("?"));

        ProcessBuilder pb = new ProcessBuilder(
                MYSQL_DUMP_CMD,
                "-u" + dbUser,
                "-p" + dbPassword,
                "--single-transaction",
                "--routines",
                "--triggers",
                dbName);

        // Redirect output to file
        pb.redirectOutput(targetPath.toFile());

        Process process = pb.start();
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            throw new IOException("mysqldump failed with exit code: " + exitCode);
        }
    }

    @Override
    public List<BackupHistory> getBackupHistory(String tenantId) {
        if (tenantId == null) {
            return repository.findAllByOrderByStartedAtDesc();
        }
        return repository.findByTenantId(tenantId); // Need to add sorting in repo if needed
    }

    @Override
    public void deleteBackup(UUID id) {
        BackupHistory history = repository.findById(id).orElseThrow(() -> new RuntimeException("Backup not found"));
        try {
            Files.deleteIfExists(Paths.get(history.getFilePath()));
            repository.delete(history);
        } catch (IOException e) {
            log.error("Failed to delete backup file", e);
            throw new RuntimeException("Failed to delete backup file");
        }
    }

    @Override
    public byte[] getBackupFile(UUID id) {
        BackupHistory history = repository.findById(id).orElseThrow(() -> new RuntimeException("Backup not found"));
        try {
            return Files.readAllBytes(Paths.get(history.getFilePath()));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read backup file", e);
        }
    }

    private static final String MYSQL_RESTORE_CMD = "mysql";

    @Override
    public void restoreBackup(UUID id) {
        BackupHistory history = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Backup not found"));

        if (!Files.exists(Paths.get(history.getFilePath()))) {
            throw new RuntimeException("Backup file not found on disk: " + history.getFilePath());
        }

        try {
            log.info("Starting restore for backup ID: {}", id);

            // Parse DB name
            String dbName = dbUrl.substring(dbUrl.lastIndexOf("/") + 1);
            if (dbName.contains("?"))
                dbName = dbName.substring(0, dbName.indexOf("?"));

            ProcessBuilder pb = new ProcessBuilder(
                    MYSQL_RESTORE_CMD,
                    "-u" + dbUser,
                    "-p" + dbPassword,
                    dbName);

            // Redirect input from backup file
            pb.redirectInput(new File(history.getFilePath()));

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                // Capture error output
                String errors = new String(process.getErrorStream().readAllBytes());
                throw new IOException("Restore failed with exit code: " + exitCode + ". Error: " + errors);
            }

            log.info("Restore completed successfully for backup ID: {}", id);

        } catch (Exception e) {
            log.error("Restore failed", e);
            throw new RuntimeException("Failed to restore backup: " + e.getMessage());
        }
    }
}
