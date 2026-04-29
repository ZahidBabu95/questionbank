package com.testshaper.dto;

import com.testshaper.entity.Exam;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class ManualExamRequest {

    @NotBlank(message = "Exam title is required")
    private String title;

    @NotNull(message = "Exam type is required")
    private Exam.ExamType examType = Exam.ExamType.MODEL_TEST;

    @NotNull(message = "Class-Subject mapping is required")
    private UUID classSubjectId;

    @NotNull(message = "Total marks is required")
    @Positive
    private Double totalMarks;

    @NotNull(message = "Duration is required")
    @Positive
    private Integer durationMinutes;

    @NotBlank(message = "Language is required")
    private String language = "Bangla";

    private String instructions;
    private String instituteName;
    private String headerText;
    
    private boolean shuffleQuestions = false;
    private boolean shuffleOptions = false;

    // Nexus Engine fields
    private String editorMode;
    private String rawContent;
    private String docSettingsJson;

    private List<SectionRequest> sections = new ArrayList<>();

    @Data
    public static class SectionRequest {
        private String sectionName;
        private Integer sectionOrder;
        private String instructions;
    }
}
