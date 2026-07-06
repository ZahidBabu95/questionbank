package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "exam_sections", indexes = {
        @Index(name = "idx_section_exam", columnList = "exam_id")
})
@Getter
@Setter
public class ExamSection {

    @Id
    @GeneratedValue
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "CHAR(36)")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @Column(name = "section_name", nullable = false)
    private String sectionName; // e.g. "Section A — MCQ"

    @Column(name = "section_order", nullable = false)
    private Integer sectionOrder;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "questions_to_answer")
    private Integer questionsToAnswer;

    @Column(name = "marks_per_question")
    private Double marksPerQuestion;

    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = false)
    @OrderBy("questionOrder ASC")
    private List<ExamQuestion> questions = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
