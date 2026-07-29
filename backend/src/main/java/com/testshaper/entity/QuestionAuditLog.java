package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "question_audit_logs", indexes = {
    @Index(name = "idx_qal_question", columnList = "question_id"),
    @Index(name = "idx_qal_reviewer", columnList = "reviewer_id"),
    @Index(name = "idx_qal_created_at", columnList = "created_at")
})
@Getter
@Setter
public class QuestionAuditLog extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"options", "sources"})
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    @Column(nullable = false)
    private String action; // AI_PRE_AUDIT, APPROVE, REVISE, REJECT, LEGACY_BACKGROUND_AUDIT

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status")
    private Question.QuestionStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status")
    private Question.QuestionStatus newStatus;

    @Column(name = "ai_audit_score")
    private Integer aiAuditScore;

    @Column(name = "time_spent_seconds")
    private Integer timeSpentSeconds;

    @Column(columnDefinition = "LONGTEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
