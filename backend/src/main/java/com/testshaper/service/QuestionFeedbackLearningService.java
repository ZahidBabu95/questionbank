package com.testshaper.service;

import com.testshaper.entity.Question;

/**
 * Feedback Learning Loop Service:
 * - When questions are APPROVED → saves as GOOD_EXAMPLE in AI Knowledge Base
 * - When questions are REJECTED (with reason) → saves as BAD_EXAMPLE in AI Knowledge Base
 * - AI uses these examples to improve future question generation
 */
public interface QuestionFeedbackLearningService {

    /**
     * Record an approved question as a GOOD_EXAMPLE for future AI learning.
     */
    void recordApprovedQuestion(java.util.UUID questionId, String approvedBy);

    /**
     * Record a rejected question as a BAD_EXAMPLE with rejection reason.
     */
    void recordRejectedQuestion(java.util.UUID questionId, String rejectionReason, String rejectedBy);

    /**
     * Get learning context for AI prompts — returns formatted good/bad examples.
     */
    String buildLearningContext(String subjectName, String className, int maxExamples);

    /**
     * Get count of learning examples by type.
     */
    long countExamplesByType(String exampleType);
}
