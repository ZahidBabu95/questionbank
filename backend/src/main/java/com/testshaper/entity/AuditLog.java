package com.testshaper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
public class AuditLog extends BaseEntity {

    @Column(nullable = false)
    private String action; // CREATE, UPDATE, DELETE

    @Column(nullable = false)
    private String entityName; // User, Institute, etc.

    @Column(nullable = false)
    private String entityId;

    @Column(name = "performed_by")
    private String performedBy; // Username or Email

    @Column(columnDefinition = "TEXT")
    private String details;
}
