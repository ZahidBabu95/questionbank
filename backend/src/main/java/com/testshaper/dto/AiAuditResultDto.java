package com.testshaper.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiAuditResultDto {

    private UUID questionId;
    private Integer qualityScore; // 0 to 100
    private Boolean topicMatch;
    private UUID suggestedTopicId;
    private String suggestedTopicName;
    private String proposedQuestionText;
    private String proposedExplanation;
    private String issueSummary;
    private Boolean hasProposedFixes;
    private List<AuditCheckItem> checks;

    private String rawSuggestionsJson;


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditCheckItem {
        private String category; // TOPIC_ALIGNMENT, MCQ_OPTIONS, CQ_RUBRIC, TYPO_GRAMMAR, BLOOM_LEVEL
        private String status; // PASS, WARNING, FAIL
        private String message;
        private String suggestion;
    }
}
