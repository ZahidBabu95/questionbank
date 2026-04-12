package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "exam_questions", indexes = {
        @Index(name = "idx_eq_exam", columnList = "exam_id"),
        @Index(name = "idx_eq_question", columnList = "question_id")
})
@Getter
@Setter
public class ExamQuestion {

    @Id
    @GeneratedValue
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "CHAR(36)")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    private ExamSection section;

    @Column(name = "marks", nullable = false)
    private Double marks;

    @Column(name = "question_order", nullable = false)
    private Integer questionOrder;

    @Column(name = "override_question_text", columnDefinition = "TEXT")
    private String overrideQuestionText;

    @Column(name = "override_options_json", columnDefinition = "TEXT")
    private String overrideOptionsJson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
