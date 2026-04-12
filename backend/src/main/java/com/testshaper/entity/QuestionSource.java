package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Tracks where a question appeared — board exams, university admission,
 * institution tests, job exams, etc.
 * Multiple sources can be linked to a single question (ManyToOne).
 */
@Entity
@Table(name = "question_sources")
@Getter
@Setter
public class QuestionSource extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Question question;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private SourceType sourceType;

    /** Year the question appeared (e.g. 2023, 2024) */
    @Column(name = "exam_year")
    private Integer examYear;

    /** Board name / University name / Institution name / Organization name */
    @Column(name = "organization_name")
    private String organizationName;

    /** Specific exam name (e.g. "HSC পরীক্ষা", "মেডিকেল ভর্তি পরীক্ষা", "৩৮তম BCS") */
    @Column(name = "exam_name")
    private String examName;

    /** Optional session (e.g. "2023-2024") */
    @Column(name = "session")
    private String session;

    /** Optional free-text note */
    @Column(name = "note")
    private String note;

    public enum SourceType {
        BOARD_EXAM,           // বোর্ড পরীক্ষা (ঢাকা বোর্ড, রাজশাহী বোর্ড, ...)
        UNIVERSITY_ADMISSION, // বিশ্ববিদ্যালয় ভর্তি পরীক্ষা
        INSTITUTION_TEST,     // প্রাতিষ্ঠানিক টেস্ট পরীক্ষা
        JOB_EXAM,             // চাকরির পরীক্ষা (BCS, Bank, ...)
        MODEL_TEST,           // মডেল টেস্ট
        OTHER                 // অন্যান্য
    }
}
