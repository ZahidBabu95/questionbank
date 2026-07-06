package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "exam_generation_rules")
@Getter
@Setter
public class ExamGenerationRule {

    @Id
    @GeneratedValue
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "CHAR(36)")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @Column(name = "question_type", nullable = false)
    private String questionType;

    @Column(name = "question_count", nullable = false)
    private Integer questionCount;

    @Column(name = "marks_per_question", nullable = false)
    private Double marksPerQuestion;

    @Column(name = "questions_to_answer")
    private Integer questionsToAnswer;

    // Optional: Difficulty distribution override per type
    @Column(name = "easy_count")
    private Integer easyCount;

    @Column(name = "medium_count")
    private Integer mediumCount;

    @Column(name = "hard_count")
    private Integer hardCount;
}
