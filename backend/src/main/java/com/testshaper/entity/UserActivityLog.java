package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Audit trail for admin actions on users.
 * Not soft-deleted (no BaseEntity) so history is always preserved.
 */
@Entity
@Table(name = "user_activity_logs", indexes = {
    @Index(name = "idx_ual_target_user", columnList = "target_user_id"),
    @Index(name = "idx_ual_actor",       columnList = "actor_id"),
    @Index(name = "idx_ual_created",     columnList = "created_at")
})
@Getter
@Setter
public class UserActivityLog {

    @Id
    @GeneratedValue
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "CHAR(36)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "actor_id", columnDefinition = "CHAR(36)")
    private UUID actorId;

    @Column(name = "actor_name")
    private String actorName;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "target_user_id", columnDefinition = "CHAR(36)")
    private UUID targetUserId;

    @Column(name = "target_user_name")
    private String targetUserName;

    @Column(name = "action", nullable = false, length = 80)
    private String action; // CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE, RESET_PASSWORD, IMPORT, etc.

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
