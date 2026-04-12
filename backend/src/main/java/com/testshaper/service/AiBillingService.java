package com.testshaper.service;

public interface AiBillingService {
    
    /**
     * Check if the current user's institute has enough AI tokens/credits.
     * Throws InsufficientQuotaException if limits are reached.
     */
    void checkAiQuota();

    /**
     * Check if the current user's institute can create the specified number of manual/standard questions.
     * Throws InsufficientQuotaException if limits are reached.
     */
    void checkQuestionQuota(int requestedCount);

    /**
     * Deducts consumed AI tokens from the institute's current month usage limit.
     */
    void deductTokens(int tokensCost);

    /**
     * Deducts the questions created from the standard manual question limit.
     */
    void deductQuestionQuota(int generatedQuestionsCount);
    /**
     * Records the system-wide AI token usage log for tracking costs, regardless of limits.
     * Use this for Knowledge Hub, Chatbots, and Super Admin logs.
     */
    void recordSystemAiUsage(String module, String action, int inputTokens, int outputTokens, long processingTimeMs, boolean success, String errorMessage);
}
