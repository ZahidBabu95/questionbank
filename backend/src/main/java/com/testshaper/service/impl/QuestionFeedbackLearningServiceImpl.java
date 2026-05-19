package com.testshaper.service.impl;

import com.testshaper.entity.AiKnowledgeBase;
import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import com.testshaper.entity.User;
import com.testshaper.repository.AiKnowledgeBaseRepository;
import com.testshaper.repository.QuestionOptionRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.QuestionFeedbackLearningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * AI Feedback Learning Loop Implementation:
 * 
 * APPROVED questions → GOOD_EXAMPLE (AI শেখে "ভালো প্রশ্ন কেমন হয়")
 * REJECTED questions (with reason) → BAD_EXAMPLE (AI শেখে "কী ভুল ছিল")
 * 
 * This data is then injected into AI prompts as context, creating a
 * self-improving question generation system.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class QuestionFeedbackLearningServiceImpl implements QuestionFeedbackLearningService {

    private final AiKnowledgeBaseRepository knowledgeRepository;
    private final QuestionOptionRepository optionRepository;
    private final UserRepository userRepository;
    private final com.testshaper.repository.QuestionRepository questionRepository;

    private static final int MAX_GOOD_EXAMPLES_PER_SUBJECT = 20;
    private static final int MAX_BAD_EXAMPLES_PER_SUBJECT = 10;

    @Override
    @Async
    @Transactional
    public void recordApprovedQuestion(java.util.UUID questionId, String approvedBy) {
        Question question = questionRepository.findById(questionId).orElse(null);
        if (question == null || !Boolean.TRUE.equals(question.getAiGenerated())) {
            return; // Only learn from AI-generated questions
        }

        try {
            String subjectTag = buildSubjectTag(question);
            String existingTag = "GOOD_EXAMPLE";

            // Check if we already have too many examples for this subject
            List<AiKnowledgeBase> existing = knowledgeRepository
                    .findByIsActiveTrueAndTagsContaining(subjectTag + "," + existingTag);
            if (existing.size() >= MAX_GOOD_EXAMPLES_PER_SUBJECT) {
                // Remove oldest to maintain cap
                AiKnowledgeBase oldest = existing.get(0);
                try {
                    knowledgeRepository.delete(oldest);
                    log.debug("Removed oldest GOOD_EXAMPLE for {} to maintain cap", subjectTag);
                } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
                    log.debug("Optimistic lock: Another thread already deleted the oldest GOOD_EXAMPLE");
                }
            }

            // Build formatted question content
            String content = formatQuestionForLearning(question, null);

            AiKnowledgeBase kb = new AiKnowledgeBase();
            kb.setTitle("[✅ ভালো প্রশ্ন] " + truncateText(question.getQuestionText(), 80));
            kb.setContent(content);
            kb.setTags(subjectTag + "," + existingTag + ",FEEDBACK_LOOP," + question.getType());
            kb.setActive(true);

            // Set created by if user found
            setCreatedBy(kb, approvedBy);

            knowledgeRepository.save(kb);
            log.info("✅ GOOD_EXAMPLE recorded for subject: {} | question: {}", subjectTag,
                    truncateText(question.getQuestionText(), 50));
        } catch (Exception e) {
            log.error("Failed to record approved question feedback", e);
        }
    }

    @Override
    @Async
    @Transactional
    public void recordRejectedQuestion(java.util.UUID questionId, String rejectionReason, String rejectedBy) {
        Question question = questionRepository.findById(questionId).orElse(null);
        if (question == null || !Boolean.TRUE.equals(question.getAiGenerated())) {
            return; // Only learn from AI-generated questions
        }

        try {
            String subjectTag = buildSubjectTag(question);
            String existingTag = "BAD_EXAMPLE";

            // Check cap
            List<AiKnowledgeBase> existing = knowledgeRepository
                    .findByIsActiveTrueAndTagsContaining(subjectTag + "," + existingTag);
            if (existing.size() >= MAX_BAD_EXAMPLES_PER_SUBJECT) {
                AiKnowledgeBase oldest = existing.get(0);
                try {
                    knowledgeRepository.delete(oldest);
                } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
                    log.debug("Optimistic lock: Another thread already deleted the oldest BAD_EXAMPLE");
                }
            }

            String content = formatQuestionForLearning(question, rejectionReason);

            AiKnowledgeBase kb = new AiKnowledgeBase();
            kb.setTitle("[❌ ভুল প্রশ্ন] " + truncateText(question.getQuestionText(), 80));
            kb.setContent(content);
            kb.setTags(subjectTag + "," + existingTag + ",FEEDBACK_LOOP," + question.getType());
            kb.setActive(true);

            setCreatedBy(kb, rejectedBy);

            knowledgeRepository.save(kb);
            log.info("❌ BAD_EXAMPLE recorded for subject: {} | reason: {}", subjectTag,
                    truncateText(rejectionReason, 50));
        } catch (Exception e) {
            log.error("Failed to record rejected question feedback", e);
        }
    }

    @Override
    public String buildLearningContext(String subjectName, String className, int maxExamples) {
        StringBuilder context = new StringBuilder();

        // 1. Fetch GOOD examples for this subject
        String subjectTag = normalizeTag(subjectName);
        List<AiKnowledgeBase> goodExamples = knowledgeRepository
                .findByIsActiveTrueAndTagsContaining("GOOD_EXAMPLE");

        // Filter by subject tag
        List<AiKnowledgeBase> subjectGood = goodExamples.stream()
                .filter(kb -> kb.getTags() != null && kb.getTags().contains(subjectTag))
                .limit(Math.min(maxExamples, 5))
                .collect(Collectors.toList());

        if (!subjectGood.isEmpty()) {
            context.append("\n\n═══════ ভালো প্রশ্নের উদাহরণ (APPROVED — এরকম প্রশ্ন তৈরি করুন) ═══════\n");
            for (AiKnowledgeBase kb : subjectGood) {
                context.append(kb.getContent()).append("\n---\n");
            }
        }

        // 2. Fetch BAD examples for this subject
        List<AiKnowledgeBase> badExamples = knowledgeRepository
                .findByIsActiveTrueAndTagsContaining("BAD_EXAMPLE");

        List<AiKnowledgeBase> subjectBad = badExamples.stream()
                .filter(kb -> kb.getTags() != null && kb.getTags().contains(subjectTag))
                .limit(Math.min(maxExamples, 3))
                .collect(Collectors.toList());

        if (!subjectBad.isEmpty()) {
            context.append("\n\n═══════ ভুল প্রশ্নের উদাহরণ (REJECTED — এই ভুলগুলো এড়িয়ে চলুন) ═══════\n");
            for (AiKnowledgeBase kb : subjectBad) {
                context.append(kb.getContent()).append("\n---\n");
            }
        }

        return context.toString();
    }

    @Override
    public long countExamplesByType(String exampleType) {
        return knowledgeRepository.findByIsActiveTrueAndTagsContaining(exampleType).size();
    }

    // ═══════════════════ Private Helpers ═══════════════════

    private String formatQuestionForLearning(Question question, String rejectionReason) {
        StringBuilder sb = new StringBuilder();

        sb.append("প্রশ্নের ধরন: ").append(question.getType()).append("\n");
        sb.append("প্রশ্ন: ").append(question.getQuestionText()).append("\n");

        if (question.getStimulus() != null && !question.getStimulus().isBlank()) {
            sb.append("উদ্দীপক: ").append(question.getStimulus()).append("\n");
        }

        // Add options for MCQ
        if (question.getType().equals(Question.QuestionType.MCQ.name())) {
            try {
                List<QuestionOption> options = optionRepository.findByQuestionIdOrderByOptionLabelAsc(question.getId());
                if (options != null) {
                    sb.append("অপশন:\n");
                    for (QuestionOption opt : options) {
                        String mark = opt.isCorrect() ? " ✅" : "";
                        sb.append("  ").append(opt.getOptionLabel()).append(") ")
                                .append(opt.getOptionText()).append(mark).append("\n");
                    }
                }
            } catch (Exception e) {
                log.debug("Could not load options for question {}", question.getId());
            }
        }

        sb.append("সঠিক উত্তর: ").append(question.getCorrectAnswer() != null ? question.getCorrectAnswer() : "N/A").append("\n");
        sb.append("কঠিনতা: ").append(question.getDifficulty()).append("\n");
        sb.append("ব্লুম: ").append(question.getBloomLevel() != null ? question.getBloomLevel() : "N/A").append("\n");
        sb.append("নম্বর: ").append(question.getMarks()).append("\n");

        if (question.getExplanation() != null && !question.getExplanation().isBlank()) {
            sb.append("ব্যাখ্যা: ").append(question.getExplanation()).append("\n");
        }

        if (rejectionReason != null && !rejectionReason.isBlank()) {
            sb.append("\n❌ রিজেকশনের কারণ: ").append(rejectionReason).append("\n");
        }

        return sb.toString();
    }

    private String buildSubjectTag(Question question) {
        String subject = "UNKNOWN";
        if (question.getClassSubject() != null && question.getClassSubject().getSubject() != null) {
            subject = question.getClassSubject().getSubject().getName();
        }
        return normalizeTag(subject);
    }

    private String normalizeTag(String name) {
        if (name == null) return "UNKNOWN";
        return name.replaceAll("\\s+", "_").toUpperCase();
    }

    private String truncateText(String text, int maxLen) {
        if (text == null) return "";
        text = text.replaceAll("\\n", " ").trim();
        return text.length() > maxLen ? text.substring(0, maxLen) + "..." : text;
    }

    private void setCreatedBy(AiKnowledgeBase kb, String email) {
        if (email == null) return;
        try {
            userRepository.findByEmail(email).ifPresent(kb::setCreatedBy);
        } catch (Exception e) {
            log.debug("Could not find user by email: {}", email);
        }
    }
}
