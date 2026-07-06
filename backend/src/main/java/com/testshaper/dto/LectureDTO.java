package com.testshaper.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class LectureDTO {
    private UUID id;
    private String title;
    private String language;
    private String difficultyLevel;
    private Integer lectureTimeMinutes;
    private String tags;
    private String status;
    private String createdBy;
    private LocalDateTime createdAt;

    // Academic fields
    private UUID classId;
    private UUID classSubjectId;
    private UUID chapterId;
    private UUID topicId;
    private String className;
    private String subjectName;
    private String chapterName;
    private String topicName;

    // AI fields
    private boolean aiGenerated;
    private String aiSummary;

    private List<LectureSectionDTO> sections;
    private List<LectureQuestionDTO> questions;

    @Data
    public static class LectureSectionDTO {
        private UUID id;
        private String sectionTitle;
        private String content;
        private Integer sectionOrder;
        private List<LectureQuestionDTO> sectionQuestions;
    }

    @Data
    public static class LectureQuestionDTO {
        private UUID id;
        private UUID questionId;
        private Integer questionOrder;

        // Inline Question Data
        private String questionText;
        private String type;
        private String difficulty;
        private Double marks;
        private String mcqType;
        private java.util.List<String> statements;
        private String stimulus;
        private String explanation;
        private String correctAnswer;
        private String chapterName;
        private List<LectureQuestionOptionDTO> options;
    }

    @Data
    public static class LectureQuestionOptionDTO {
        private String optionLabel;
        private String optionText;
        private boolean isCorrect;

        public boolean getIsCorrect() {
            return isCorrect;
        }

        public boolean getCorrect() {
            return isCorrect;
        }
    }
}
