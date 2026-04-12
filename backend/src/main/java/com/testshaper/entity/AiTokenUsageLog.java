package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.UUID;

@Entity
@Table(name = "ai_token_usage_logs", indexes = {
    @Index(name = "idx_ai_log_user", columnList = "user_id"),
    @Index(name = "idx_ai_log_institute", columnList = "institute_id"),
    @Index(name = "idx_ai_log_model", columnList = "model_name")
})
@Getter
@Setter
@NoArgsConstructor
public class AiTokenUsageLog extends BaseEntity {

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "institute_id")
    private UUID instituteId;

    @Column(name = "feature_name", nullable = false)
    private String featureName; // e.g., "QUESTION_GENERATION", "OCR", "TRANSLATION"

    @Column(name = "model_name", nullable = false)
    private String modelName; // e.g., "gemini-1.5-pro-latest", "ollama/llama3"

    @Column(name = "input_tokens", nullable = false)
    private int inputTokens = 0;

    @Column(name = "output_tokens", nullable = false)
    private int outputTokens = 0;

    @Column(name = "total_tokens", nullable = false)
    private int totalTokens = 0;

    @Column(name = "actual_cost_usd", nullable = false)
    private double actualCostUsd = 0.0; // The real API cost 

    @Column(name = "billed_credits", nullable = false)
    private int billedCredits = 0; // Number of tokens/credits deducted from the user quota
}
