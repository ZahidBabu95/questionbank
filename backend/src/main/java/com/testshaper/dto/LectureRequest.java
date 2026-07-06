package com.testshaper.dto;

import com.testshaper.entity.Lecture;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class LectureRequest {

    @NotBlank(message = "Lecture title is required")
    private String title;

    private UUID classSubjectId;
    private UUID chapterId;
    private UUID topicId;

    private String language = "Bangla";
    private String difficultyLevel;
    private Integer lectureTimeMinutes;
    private String tags;

    private List<LectureSectionRequest> sections = new ArrayList<>();
    private List<UUID> questionIds = new ArrayList<>();

    @Data
    public static class LectureSectionRequest {
        private UUID id;
        @NotBlank(message = "Section title is required")
        private String sectionTitle;
        private String content;
        private Integer sectionOrder;
        private List<UUID> questionIds = new ArrayList<>();
    }
}
