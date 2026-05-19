package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "questions", indexes = {
    @Index(name = "idx_q_tenant_status", columnList = "tenant_id, status"),
    @Index(name = "idx_q_academic", columnList = "class_subject_id, chapter_id, topic_id"),
    @Index(name = "idx_q_type_diff", columnList = "type, difficulty")
})
@Getter
@Setter
public class Question extends BaseTenantEntity {

    @Column(nullable = false)
    private String type; // Replaced enum with String for dynamic types (e.g., MCQ, CQ, FILL_BLANKS)

    @Column(name = "parent_id")
    private UUID parentId;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "dynamic_data", columnDefinition = "json")
    private String dynamicData;

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

    @Column(name = "correct_answer", columnDefinition = "TEXT")
    private String correctAnswer;

    @Column(columnDefinition = "LONGTEXT")
    private String explanation;

    @Column(name = "source_reference")
    private String sourceReference;

    @Column(nullable = false)
    private String language; // Bangla / English

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionStatus status; // DRAFT, PENDING, APPROVED, REJECTED

    @Column(columnDefinition = "LONGTEXT")
    private String stimulus; // For Bangladeshi "Stimulus/Stem" based questions

    @org.hibernate.annotations.BatchSize(size = 100)
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("optionLabel ASC")
    private java.util.List<QuestionOption> options = new java.util.ArrayList<>();

    @org.hibernate.annotations.BatchSize(size = 100)
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<QuestionSource> sources = new java.util.ArrayList<>();

    @Column(name = "mcq_type")
    private String mcqType; // SIMPLE, MULTIPLE_COMPLETION, SITUATION_SET

    @Column(columnDefinition = "TEXT")
    @Convert(converter = com.testshaper.util.StringListConverter.class)
    private java.util.List<String> statements = new java.util.ArrayList<>();

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

    // Revision / Pull Request System
    @Column(name = "parent_question_id")
    private UUID parentQuestionId; // If null, this is an original question. If set, this is a draft revision.

    @Column(name = "version_comment", columnDefinition = "TEXT")
    private String versionComment; // "Fixed typo in option 3", etc.

    // Revision tracking
    @Column(name = "revised_by")
    private String revisedBy;

    @Column(name = "revised_at")
    private LocalDateTime revisedAt;

    @Column(name = "revision_count")
    private Integer revisionCount = 0;

    // Community Feedback Counters (Denormalized for Speed)
    @Column(name = "likes_count")
    private Integer likesCount = 0;

    @Column(name = "favorites_count")
    private Integer favoritesCount = 0;

    public Integer getLikesCount() {
        return likesCount == null ? 0 : likesCount;
    }

    public Integer getFavoritesCount() {
        return favoritesCount == null ? 0 : favoritesCount;
    }

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

    @Transient
    private String topicName;

    @Transient
    private String chapterName;

    public enum QuestionType {
        MCQ, CQ, SHORT, TRUE_FALSE
    }

    public enum DifficultyLevel {
        EASY, MEDIUM, HARD
    }

    public enum QuestionStatus {
        DRAFT, PENDING, APPROVED, REJECTED, REVISED
    }
}
