package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "exam_results", indexes = {
    @Index(name = "idx_exam_result_exam", columnList = "exam_id"),
    @Index(name = "idx_exam_result_student", columnList = "student_username"),
    @Index(name = "idx_exam_result_tenant", columnList = "tenant_id")
})
@Getter
@Setter
@NoArgsConstructor
public class ExamResult extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @Column(name = "student_username", nullable = false)
    private String studentUsername;

    @Column(name = "score", nullable = false)
    private Double score;

    @Column(name = "total_marks", nullable = false)
    private Double totalMarks;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @OneToMany(mappedBy = "examResult", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExamResultAnswer> answers = new ArrayList<>();
}
