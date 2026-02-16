package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "questions")
@Getter
@Setter
public class Question extends BaseTenantEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType type; // MCQ, CQ, SHORT, TRUE_FALSE

    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DifficultyLevel difficulty;

    @Column(nullable = false)
    private Double marks;

    @Column(name = "negative_marks")
    private Double negativeMarks;

    @Column(name = "bloom_level")
    private String bloomLevel;

    @Column(columnDefinition = "LONGTEXT")
    private String explanation;

    @Column(name = "source_reference")
    private String sourceReference;

    @Column(nullable = false)
    private String language; // Bangla / English

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionStatus status; // DRAFT, PENDING, APPROVED, REJECTED

    // AI Fields (Future Ready)
    @Column(name = "ai_generated")
    private Boolean aiGenerated;

    @Column(name = "ai_model_name")
    private String aiModelName;

    @Column(name = "ai_confidence_score")
    private Double aiConfidenceScore;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    // Academic Mapping
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_subject_id")
    private ClassSubject classSubject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id")
    private Chapter chapter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    public enum QuestionType {
        MCQ, CQ, SHORT, TRUE_FALSE
    }

    public enum DifficultyLevel {
        EASY, MEDIUM, HARD
    }

    public enum QuestionStatus {
        DRAFT, PENDING, APPROVED, REJECTED
    }
}
