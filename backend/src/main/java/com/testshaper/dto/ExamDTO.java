package com.testshaper.dto;

import com.testshaper.entity.Exam;
import com.testshaper.entity.ExamEditorMode;
import com.testshaper.entity.Question;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ExamDTO {

    private UUID id;
    private String title;
    private Exam.ExamType examType;
    private Exam.ExamStatus status;
    private String language;
    private Integer durationMinutes;
    private Double totalMarks;
    private Integer totalQuestions;
    private Integer easyPercent;
    private Integer mediumPercent;
    private Integer hardPercent;
    private boolean shuffleQuestions;
    private boolean shuffleOptions;
    private String instituteName;
    private String headerText;
    private String footerText;
    private String instructions;
    private boolean aiGenerated;
    private String createdBy;
    private LocalDateTime createdAt;

    // Nexus Engine fields
    private ExamEditorMode editorMode;
    private String rawContent;
    private String docSettingsJson;
    private UUID templateId;
    private UUID classSubjectId;
    private UUID subjectId;
    private UUID classId;

    // Academic info
    private String subjectName;
    private String className;

    // Questions
    private List<ExamQuestionDTO> questions;

    @Data
    public static class ExamQuestionDTO {
        private UUID id;
        private UUID originalQuestionId;
        private Integer order;
        private Double marks;
        private String questionText;
        private String stimulus;
        private String type;
        private String mcqType;
        private java.util.List<String> statements;
        private Question.DifficultyLevel difficulty;
        private String bloomLevel;
        private String language;
        private String explanation;
        private String correctAnswer;
        private String dynamicData;
        private UUID sectionId;
        private List<OptionDTO> options;
    }

    @Data
    public static class OptionDTO {
        private UUID id;
        private String optionText;
        private boolean correct;
    }
}
