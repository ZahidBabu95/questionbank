package com.testshaper.dto;

import com.testshaper.entity.Exam;
import com.testshaper.entity.Question;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ExamGenerationRequest {

    @NotBlank(message = "Exam title is required")
    private String title;

    @NotNull(message = "Exam type is required")
    private Exam.ExamType examType;

    @NotNull(message = "Class-Subject mapping is required")
    private UUID classSubjectId;

    // Optional chapter filter
    private List<UUID> chapterIds;

    // Optional topic filter
    private List<UUID> topicIds;

    @NotNull(message = "Total marks is required")
    @Positive(message = "Total marks must be positive")
    private Double totalMarks;

    @NotNull(message = "Total questions is required")
    @Positive(message = "Total questions must be positive")
    private Integer totalQuestions;

    @NotNull(message = "Duration is required")
    @Positive(message = "Duration must be positive")
    private Integer durationMinutes;

    @NotBlank(message = "Language is required")
    private String language = "Bangla";

    // Difficulty distribution (must sum to 100)
    @Min(0)
    @Max(100)
    private Integer easyPercent = 30;

    @Min(0)
    @Max(100)
    private Integer mediumPercent = 50;

    @Min(0)
    @Max(100)
    private Integer hardPercent = 20;

    // Question type distribution
    @NotEmpty(message = "At least one question type rule is required")
    @Valid
    private List<QuestionTypeRule> questionTypeRules;

    // Shuffle settings
    private boolean shuffleQuestions = true;
    private boolean shuffleOptions = true;

    // Paper header
    private String instituteName;
    private String headerText;

    // --- Nested DTO ---
    @Data
    public static class QuestionTypeRule {

        @NotNull
        private Question.QuestionType questionType;

        @NotNull
        @Positive
        private Integer count;

        @NotNull
        @Positive
        private Double marksPerQuestion;
    }
}
