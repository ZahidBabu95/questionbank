package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "exams", indexes = {
        @Index(name = "idx_exam_tenant", columnList = "tenant_id"),
        @Index(name = "idx_exam_class_subject", columnList = "class_subject_id"),
        @Index(name = "idx_exam_creator_deleted", columnList = "created_by, deleted")
})
@Getter
@Setter
public class Exam extends BaseTenantEntity {

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "exam_type", nullable = false)
    private ExamType examType;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "total_marks", nullable = false)
    private Double totalMarks;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;

    @Column(nullable = false)
    private String language = "Bangla";

    @Column(name = "shuffle_questions")
    private boolean shuffleQuestions = true;

    @Column(name = "shuffle_options")
    private boolean shuffleOptions = true;

    // Difficulty distribution (percentages, must sum to 100)
    @Column(name = "easy_percent")
    private Integer easyPercent = 30;

    @Column(name = "medium_percent")
    private Integer mediumPercent = 50;

    @Column(name = "hard_percent")
    private Integer hardPercent = 20;

    // Academic mapping
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_subject_id")
    private ClassSubject classSubject;

    // Paper template fields
    @Column(name = "institute_name")
    private String instituteName;

    @Column(name = "header_text", columnDefinition = "TEXT")
    private String headerText;

    @Column(name = "footer_text", columnDefinition = "TEXT")
    private String footerText;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ExamStatus status = ExamStatus.DRAFT;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "is_manual")
    private boolean isManual = false;

    @Column(name = "created_by")
    private String createdBy;

    // Nexus Paper Engine (V2) Fields
    @Enumerated(EnumType.STRING)
    @Column(name = "editor_mode", nullable = false)
    private ExamEditorMode editorMode = ExamEditorMode.STRICT_LINKED;

    @Column(name = "raw_content", columnDefinition = "LONGTEXT")
    private String rawContent;

    @Column(name = "doc_settings_json", columnDefinition = "LONGTEXT")
    private String docSettingsJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private ExamTemplate examTemplate;

    // AI-Ready fields
    @Column(name = "ai_generated")
    private boolean aiGenerated = false;

    @Column(name = "ai_model_used")
    private String aiModelUsed;

    @Column(name = "ai_prompt", columnDefinition = "TEXT")
    private String aiPrompt;

    @Column(name = "ai_confidence_score")
    private Double aiConfidenceScore;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionOrder ASC")
    private List<ExamQuestion> examQuestions = new ArrayList<>();

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sectionOrder ASC")
    private List<ExamSection> examSections = new ArrayList<>();

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExamGenerationRule> generationRules = new ArrayList<>();

    public enum ExamType {
        CLASS_TEST, MODEL_TEST, FINAL, PRACTICE
    }

    public enum ExamStatus {
        DRAFT, PUBLISHED, ARCHIVED, ONLINE_EXAM
    }
}
