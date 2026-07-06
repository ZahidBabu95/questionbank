package com.testshaper.dto;

import lombok.Data;

import java.util.UUID;

/**
 * Lightweight question search params for the manual exam builder's left panel.
 */
@Data
public class QuestionSearchParams {
    private UUID classSubjectId;
    private UUID chapterId;
    private UUID topicId;
    private String type; // MCQ | CQ | SHORT | TRUE_FALSE
    private String difficulty; // EASY | MEDIUM | HARD
    private String language;
    private String keyword;
    private String sourceMode = "ALL"; // ALL, FAVORITES, LECTURE_SHEETS
    private java.util.List<UUID> lectureIds;
    private java.util.List<String> boards;
    private java.util.List<Integer> years;
    private java.util.List<String> schools;
    private int page = 0;
    private int size = 20;
    private String sort = "createdAt,desc";
}
