package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_usage_logs", indexes = {
        @Index(name = "idx_ai_usage_user", columnList = "user_id"),
        @Index(name = "idx_ai_usage_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "user_name")
    private String userName;

    /** SCRAPE or GENERATE */
    @Column(nullable = false)
    private String action;

    /** MCQ, CQ, SHORT */
    @Column(name = "question_type")
    private String questionType;

    /** Number of questions returned by AI */
    @Column(name = "questions_count")
    private Integer questionsCount;

    /** AI model used e.g. gemini-2.0-flash */
    @Column(name = "model_used")
    private String modelUsed;

    /** Input tokens consumed */
    @Column(name = "input_tokens")
    private Integer inputTokens;

    /** Output tokens consumed */
    @Column(name = "output_tokens")
    private Integer outputTokens;

    /** Total tokens */
    @Column(name = "total_tokens")
    private Integer totalTokens;

    /** Estimated cost in USD  */
    @Column(name = "cost_usd")
    private Double costUsd;

    /** Processing time in milliseconds */
    @Column(name = "processing_time_ms")
    private Long processingTimeMs;

    /** Whether the call was successful */
    @Column(nullable = false)
    private boolean success;

    /** Error message if failed */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /** Original filename if file was uploaded */
    @Column(name = "file_name")
    private String fileName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
