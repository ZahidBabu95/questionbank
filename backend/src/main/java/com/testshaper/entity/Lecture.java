package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lectures", indexes = {
        @Index(name = "idx_lecture_tenant", columnList = "tenant_id"),
        @Index(name = "idx_lecture_class_subject", columnList = "class_subject_id")
})
@Getter
@Setter
public class Lecture extends BaseTenantEntity {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String language = "Bangla";

    @Column(name = "difficulty_level")
    private String difficultyLevel;

    @Column(name = "lecture_time_minutes")
    private Integer lectureTimeMinutes;

    @Column(name = "tags")
    private String tags;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private LectureStatus status = LectureStatus.DRAFT;

    @Column(name = "created_by")
    private String createdBy;

    // Academic Mappings
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_subject_id")
    private ClassSubject classSubject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id")
    private Chapter chapter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    // Ordered Sections
    @OneToMany(mappedBy = "lecture", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sectionOrder ASC")
    private List<LectureSection> sections = new ArrayList<>();

    // Uncategorized or overall questions
    @OneToMany(mappedBy = "lecture", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionOrder ASC")
    private List<LectureQuestion> questions = new ArrayList<>();

    // AI-Ready fields
    @Column(name = "ai_generated")
    private boolean aiGenerated = false;

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    public enum LectureStatus {
        DRAFT, PUBLISHED, ARCHIVED
    }
}
