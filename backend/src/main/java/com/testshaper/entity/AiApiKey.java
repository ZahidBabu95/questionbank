package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Stores multiple AI API keys for rotation.
 * Free tier keys can be rotated to distribute rate limits.
 */
@Entity
@Table(name = "ai_api_keys")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class AiApiKey extends BaseTenantEntity {

    @Column(name = "key_name", nullable = false)
    private String keyName; // "Free Key 1", "Paid Key"

    @Column(name = "api_key", nullable = false, length = 512)
    private String apiKey;

    @Column(name = "provider")
    private String provider; // "Google", "OpenRouter"

    @Column(name = "is_active")
    private boolean active = true;

    @Column(name = "requests_today")
    private int requestsToday;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Column(name = "last_error")
    private String lastError;

    @Column(name = "daily_limit")
    private int dailyLimit; // 0 = unlimited

    @Column(name = "rpm_limit")
    private int rpmLimit; // requests per minute limit. 0 = no limit

    @Column(name = "total_requests")
    private long totalRequests;

    @Column(name = "last_reset_date")
    private String lastResetDate; // YYYY-MM-DD for daily counter reset

    @Column(name = "priority")
    private int priority; // lower = higher priority

    @Column(name = "base_url", length = 512)
    private String baseUrl; // For OpenAI-compatible providers: https://api.openai.com/v1

    @Column(name = "model", length = 100)
    private String model; // Optional per-key model override (e.g. gpt-4o-mini)

    @Column(name = "is_paid", columnDefinition = "boolean default false")
    private Boolean isPaid = false; // Indicates if this is a paid API key

    public boolean isPaidTier() {
        return isPaid != null ? isPaid : false;
    }

    public boolean isAvailable() {
        if (!active) return false;
        if (lastError != null && lastError.contains("API_KEY_INVALID")) return false;
        boolean paid = isPaid != null ? isPaid : false;
        if (requestsToday >= 999000 && !paid) return false; // Hard exhausted due to 429 errors (only for free)
        if (dailyLimit > 0 && requestsToday >= dailyLimit && !paid) return false;
        return true;
    }
}
