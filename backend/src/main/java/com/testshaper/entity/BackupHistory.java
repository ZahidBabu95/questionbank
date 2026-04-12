package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "backup_history", indexes = {
        @Index(name = "idx_backup_tenant", columnList = "tenant_id"),
        @Index(name = "idx_backup_status", columnList = "status"),
        @Index(name = "idx_backup_type", columnList = "backup_type")
})
@Getter
@Setter
public class BackupHistory extends BaseEntity {

    @Column(name = "tenant_id")
    private String tenantId; // nullable for FULL system backups

    @Enumerated(EnumType.STRING)
    @Column(name = "backup_type", nullable = false)
    private BackupType type;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize; // in bytes

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BackupStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "triggered_by")
    private String triggeredBy; // User ID or "SYSTEM"

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(nullable = false)
    private boolean encrypted = false;

    public enum BackupType {
        FULL, TENANT, QUESTION, USER, SETTINGS
    }

    public enum BackupStatus {
        IN_PROGRESS, SUCCESS, FAILED
    }
}
