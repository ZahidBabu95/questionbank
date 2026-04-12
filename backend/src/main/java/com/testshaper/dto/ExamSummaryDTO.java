package com.testshaper.dto;

import com.testshaper.entity.Exam;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ExamSummaryDTO {
    private UUID id;
    private String title;
    private Exam.ExamType examType;
    private Exam.ExamStatus status;
    private String language;
    private Integer durationMinutes;
    private Double totalMarks;
    private Integer totalQuestions;
    private String subjectName;
    private String className;
    private String createdBy;
    private LocalDateTime createdAt;
}
