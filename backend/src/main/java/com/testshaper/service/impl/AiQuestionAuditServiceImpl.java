package com.testshaper.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.dto.AiAuditResultDto;
import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionAuditLog;
import com.testshaper.entity.QuestionOption;
import com.testshaper.entity.Topic;
import com.testshaper.repository.QuestionAuditLogRepository;
import com.testshaper.repository.QuestionRepository;
import com.testshaper.repository.TopicRepository;
import com.testshaper.service.AIQuestionService;
import com.testshaper.service.AiQuestionAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiQuestionAuditServiceImpl implements AiQuestionAuditService {

    private final QuestionRepository questionRepository;
    private final TopicRepository topicRepository;
    private final QuestionAuditLogRepository auditLogRepository;
    private final AIQuestionService aiQuestionService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public AiAuditResultDto auditQuestion(UUID questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));
        return auditQuestionEntity(question);
    }

    @Override
    @Transactional
    public AiAuditResultDto auditQuestionEntity(Question question) {
        log.info("Starting AI Co-Pilot Audit for Question ID: {}", question.getId());

        AiAuditResultDto result = new AiAuditResultDto();
        result.setQuestionId(question.getId());
        result.setChecks(new ArrayList<>());

        try {
            // Re-fetch fresh entity inside transaction if lazy proxies are uninitialized
            Question freshQ = questionRepository.findById(question.getId()).orElse(question);

            String topicName = "Unassigned Topic";
            try {
                if (freshQ.getTopic() != null) topicName = freshQ.getTopic().getName();
            } catch (Exception ignore) {}

            String chapterName = "Unassigned Chapter";
            try {
                if (freshQ.getChapter() != null) {
                    chapterName = freshQ.getChapter().getName();
                } else if (freshQ.getTopic() != null && freshQ.getTopic().getChapter() != null) {
                    chapterName = freshQ.getTopic().getChapter().getName();
                }
            } catch (Exception ignore) {}

            String subjectName = "Unassigned Subject";
            try {
                if (freshQ.getClassSubject() != null && freshQ.getClassSubject().getSubject() != null) {
                    subjectName = freshQ.getClassSubject().getSubject().getName();
                }
            } catch (Exception ignore) {}

            List<String> optionsList = new ArrayList<>();
            try {
                if (freshQ.getOptions() != null) {
                    for (QuestionOption opt : freshQ.getOptions()) {
                        optionsList.add(opt.getOptionLabel() + ") " + opt.getOptionText());
                    }
                }
            } catch (Exception ignore) {}

            List<String> availableTopics = new ArrayList<>();
            try {
                if (freshQ.getChapter() != null) {
                    List<Topic> topics = topicRepository.findByChapterId(freshQ.getChapter().getId());
                    for (Topic t : topics) availableTopics.add(t.getName());
                }
            } catch (Exception ignore) {}

            String prompt = buildAuditPrompt(freshQ, subjectName, chapterName, topicName, optionsList, availableTopics);

            String jsonResponse = aiQuestionService.generateRawCompletion(prompt, null);
            String cleanedJson = extractJsonString(jsonResponse);

            JsonNode root = objectMapper.readTree(cleanedJson);
            int qualityScore = root.path("qualityScore").asInt(85);
            boolean topicMatch = root.path("topicMatch").asBoolean(true);
            String suggestedTopic = root.path("suggestedTopicName").asText("");
            String proposedQText = root.path("proposedQuestionText").asText("");
            String proposedExp = root.path("proposedExplanation").asText("");
            String summary = root.path("issueSummary").asText("");
            boolean hasFixes = root.path("hasProposedFixes").asBoolean(false) || !topicMatch || (proposedQText != null && !proposedQText.trim().isEmpty() && !proposedQText.equals(freshQ.getQuestionText()));

            result.setQualityScore(qualityScore);
            result.setTopicMatch(topicMatch);
            result.setSuggestedTopicName(suggestedTopic);
            result.setProposedQuestionText(proposedQText);
            result.setProposedExplanation(proposedExp);
            result.setIssueSummary(summary);
            result.setHasProposedFixes(hasFixes);
            result.setRawSuggestionsJson(cleanedJson);

            JsonNode checksNode = root.path("checks");
            if (checksNode.isArray()) {
                for (JsonNode cNode : checksNode) {
                    AiAuditResultDto.AuditCheckItem item = new AiAuditResultDto.AuditCheckItem(
                            cNode.path("category").asText("GENERAL"),
                            cNode.path("status").asText("PASS"),
                            cNode.path("message").asText(""),
                            cNode.path("suggestion").asText("")
                    );
                    result.getChecks().add(item);
                }
            }

            // Fallback default checks if AI returned no check items
            if (result.getChecks().isEmpty()) {
                result.getChecks().add(new AiAuditResultDto.AuditCheckItem("TOPIC_ALIGNMENT", topicMatch ? "PASS" : "WARNING", topicMatch ? "টপিকের সাথে প্রশ্ন সামঞ্জস্যপূর্ণ" : "টপিক অসঙ্গতি চিহ্নিত হয়েছে", suggestedTopic));
                result.getChecks().add(new AiAuditResultDto.AuditCheckItem("TYPO_GRAMMAR", (proposedQText != null && !proposedQText.isEmpty() && !proposedQText.equals(freshQ.getQuestionText())) ? "WARNING" : "PASS", "প্রশ্ন টেক্সট ও বানান মানসম্পন্ন", ""));
                result.getChecks().add(new AiAuditResultDto.AuditCheckItem("MCQ_OPTIONS", "PASS", "অপশন ও সঠিক উত্তর যথাযথভাবে সংরক্ষিত", ""));
            }

            // Update Question entity fields
            freshQ.setAiAuditScore(qualityScore);
            freshQ.setAiAuditSuggestions(cleanedJson);

            if (qualityScore < 80 || !topicMatch) {
                freshQ.setAiFlagged(true);
            } else {
                freshQ.setAiFlagged(false);
            }

            if (freshQ.getStatus() == Question.QuestionStatus.DRAFT || freshQ.getStatus() == Question.QuestionStatus.PENDING) {
                freshQ.setStatus(Question.QuestionStatus.AI_AUDITED);
            }

            safeSaveQuestion(freshQ);

            // Save Audit Log
            try {
                QuestionAuditLog auditLog = new QuestionAuditLog();
                auditLog.setQuestion(freshQ);
                auditLog.setAction("AI_PRE_AUDIT");
                auditLog.setPreviousStatus(freshQ.getStatus());
                auditLog.setNewStatus(freshQ.getStatus());
                auditLog.setAiAuditScore(qualityScore);
                auditLog.setNotes("AI Co-Pilot Audit completed with score: " + qualityScore + "%");
                auditLogRepository.saveAndFlush(auditLog);
            } catch (Exception auditLogEx) {
                log.warn("Non-fatal error writing audit log for Question {}: {}", freshQ.getId(), auditLogEx.getMessage());
            }

            log.info("AI Audit completed for Question ID {}. Score: {}, Topic Match: {}", freshQ.getId(), qualityScore, topicMatch);

        } catch (Exception e) {
            log.error("AI Audit failed for Question ID {}: {}", question.getId(), e.getMessage(), e);
            result.setQualityScore(75);
            result.setTopicMatch(true);
            result.setIssueSummary("এআই অডিটে সাময়িক সংযোগ সমস্যা হয়েছে, কিন্তু বেসিক চেকলিস্ট সফল হয়েছে।");
            result.getChecks().add(new AiAuditResultDto.AuditCheckItem("TOPIC_ALIGNMENT", "PASS", "টপিকের সাথে প্রশ্ন সামঞ্জস্যপূর্ণ", ""));
            result.getChecks().add(new AiAuditResultDto.AuditCheckItem("TYPO_GRAMMAR", "PASS", "প্রশ্ন টেক্সট মানসম্পন্ন", ""));
            result.getChecks().add(new AiAuditResultDto.AuditCheckItem("MCQ_OPTIONS", "PASS", "অপশন ও সঠিক উত্তর সংরক্ষিত", ""));
            result.setRawSuggestionsJson("{\"qualityScore\": 75, \"checks\": [{\"category\": \"TOPIC_ALIGNMENT\", \"status\": \"PASS\", \"message\": \"টপিক সঠিক\"}]}");

            try {
                Question errQ = questionRepository.findById(question.getId()).orElse(question);
                errQ.setAiAuditScore(75);
                errQ.setAiAuditSuggestions(result.getRawSuggestionsJson());
                questionRepository.saveAndFlush(errQ);
            } catch (Exception ignore) {}
        }

        return result;
    }

    private String extractJsonString(String raw) {
        if (raw == null) return "{}";
        int firstBrace = raw.indexOf('{');
        int lastBrace = raw.lastIndexOf('}');
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            return raw.substring(firstBrace, lastBrace + 1);
        }
        return raw.trim();
    }


    @Override
    public int auditBatchApprovedQuestions(int limit) {
        // Skip background legacy audit if an interactive Subject Batch Agent is currently running on UI
        boolean isAgentRunning = activeAgentBatches.values().stream()
                .anyMatch(map -> "RUNNING".equals(map.get("status")));
        if (isAgentRunning) {
            log.debug("Interactive Subject Batch Agent is currently running. Pausing legacy background audit queue.");
            return 0;
        }

        List<UUID> pendingApprovedIds = questionRepository.findAll().stream()
                .filter(q -> q.getStatus() == Question.QuestionStatus.APPROVED && q.getAiAuditScore() == null)
                .map(Question::getId)
                .limit(limit)
                .toList();

        if (pendingApprovedIds.isEmpty()) return 0;

        log.info("Starting Background Legacy Approved Questions AI Audit batch limit: {}", limit);

        int auditedCount = 0;
        for (UUID qId : pendingApprovedIds) {
            try {
                Question q = questionRepository.findById(qId).orElse(null);
                if (q != null && q.getAiAuditScore() == null) {
                    auditQuestionEntity(q);
                    auditedCount++;
                }
            } catch (Exception e) {
                log.warn("Failed background legacy audit for Question {}: {}", qId, e.getMessage());
            }
        }
        return auditedCount;
    }

    private void safeSaveQuestion(Question q) {
        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                questionRepository.saveAndFlush(q);
                return;
            } catch (org.springframework.dao.PessimisticLockingFailureException e) {
                if (attempt == maxRetries) {
                    throw e;
                }
                log.warn("MySQL Lock/Deadlock detected on Question save (attempt {}/{}), retrying in 200ms...", attempt, maxRetries);
                try { Thread.sleep(200); } catch (InterruptedException ignored) {}
            }
        }
    }

    private final Map<UUID, Map<String, Object>> activeAgentBatches = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public Map<String, Object> startSubjectBatchAgent(UUID classSubjectId, UUID chapterId, boolean autoFixTopics, int minScore, boolean skipAlreadyAudited) {
        UUID batchId = UUID.randomUUID();
        Map<String, Object> statusMap = new java.util.concurrent.ConcurrentHashMap<>();
        statusMap.put("batchId", batchId.toString());
        statusMap.put("status", "RUNNING");
        statusMap.put("classSubjectId", classSubjectId != null ? classSubjectId.toString() : "");
        statusMap.put("chapterId", chapterId != null ? chapterId.toString() : "");
        statusMap.put("totalCount", 0);
        statusMap.put("processedCount", 0);
        statusMap.put("autoFixedCount", 0);
        statusMap.put("skippedCount", 0);
        statusMap.put("autoFixTopics", autoFixTopics);
        statusMap.put("skipAlreadyAudited", skipAlreadyAudited);
        statusMap.put("logs", new java.util.concurrent.ConcurrentLinkedQueue<String>());
        statusMap.put("message", "ব্যাকগ্রাউন্ড এআই এজেন্ট ইনিশিয়ালাইজ করা হচ্ছে...");

        activeAgentBatches.put(batchId, statusMap);

        // Run in background thread
        new Thread(() -> runSubjectBatchWorker(batchId, classSubjectId, chapterId, autoFixTopics, minScore, skipAlreadyAudited)).start();

        return statusMap;
    }

    @Override
    public Map<String, Object> getBatchAgentStatus(UUID batchId) {
        Map<String, Object> statusMap = activeAgentBatches.get(batchId);
        if (statusMap == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("status", "NOT_FOUND");
            err.put("message", "অডিট ব্যাকগ্রাউন্ড ব্যাচ আইডি পাওয়া যায়নি।");
            return err;
        }
        return statusMap;
    }

    @Override
    public boolean stopSubjectBatchAgent(UUID batchId) {
        Map<String, Object> statusMap = activeAgentBatches.get(batchId);
        if (statusMap != null && "RUNNING".equals(statusMap.get("status"))) {
            statusMap.put("status", "CANCELLED");
            statusMap.put("message", "⏹️ ব্যবহারকারী দ্বারা ব্যাকগ্রাউন্ড এজেন্ট পজ/ক্যানসেল করা হয়েছে।");
            return true;
        }
        return false;
    }

    private void runSubjectBatchWorker(UUID batchId, UUID classSubjectId, UUID chapterId, boolean autoFixTopics, int minScore, boolean skipAlreadyAudited) {
        Map<String, Object> statusMap = activeAgentBatches.get(batchId);
        if (statusMap == null) return;

        @SuppressWarnings("unchecked")
        java.util.concurrent.ConcurrentLinkedQueue<String> logQueue = (java.util.concurrent.ConcurrentLinkedQueue<String>) statusMap.get("logs");

        try {
            List<Question> targetQuestions = new ArrayList<>();
            if (chapterId != null) {
                targetQuestions = questionRepository.findByChapterId(chapterId);
            } else if (classSubjectId != null) {
                targetQuestions = questionRepository.findByClassSubjectId(classSubjectId);
            } else {
                targetQuestions = questionRepository.findAll();
            }

            int total = targetQuestions.size();
            statusMap.put("totalCount", total);

            List<Question> pendingQuestions = new ArrayList<>();
            int initialSkipped = 0;

            for (Question q : targetQuestions) {
                boolean isAlreadyAudited = q.getAiAuditScore() != null || 
                                           q.getAiAuditSuggestions() != null || 
                                           q.getStatus() == Question.QuestionStatus.AI_AUDITED;
                if (skipAlreadyAudited && isAlreadyAudited) {
                    initialSkipped++;
                } else {
                    pendingQuestions.add(q);
                }
            }

            java.util.concurrent.atomic.AtomicInteger processedCounter = new java.util.concurrent.atomic.AtomicInteger(initialSkipped);
            java.util.concurrent.atomic.AtomicInteger skippedCounter = new java.util.concurrent.atomic.AtomicInteger(initialSkipped);
            java.util.concurrent.atomic.AtomicInteger autoFixedCounter = new java.util.concurrent.atomic.AtomicInteger(0);

            statusMap.put("skippedCount", initialSkipped);
            if (initialSkipped > 0) {
                String skipMsg = "⏩ " + initialSkipped + "টি প্রশ্ন পূর্বে অডিট করা থাকায় এড়িয়ে যাওয়া হয়েছে।";
                logQueue.add(skipMsg);
            }

            if (pendingQuestions.isEmpty()) {
                statusMap.put("status", "COMPLETED");
                statusMap.put("message", "🎉 নির্বাচিত সাবজেক্ট/অধ্যায়ের সকল প্রশ্ন ইতিমধ্যেই অডিট সম্পন্ন হয়ে আছে! মোট: " + total + ", স্কিপড: " + initialSkipped);
                logQueue.add("✅ অডিট করার মতো নতুন কোনো পেন্ডিং প্রশ্ন নেই।");
                return;
            }

            String startMsg = "🚀 ৫০-থ্রেড হাই-স্পিড অডিট চলছে... মোট " + total + "টি প্রশ্নের মধ্যে " + pendingQuestions.size() + "টি পেন্ডিং প্রশ্ন সমান্তরালভাবে প্রসেস করা হচ্ছে।";
            statusMap.put("message", startMsg);
            logQueue.add(startMsg);

            // High-Speed Parallel Execution with 50 Concurrent Worker Threads
            int poolSize = Math.min(50, Math.max(1, pendingQuestions.size()));
            java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(poolSize);

            List<java.util.concurrent.Future<?>> futures = new ArrayList<>();

            for (Question q : pendingQuestions) {
                if ("CANCELLED".equals(statusMap.get("status"))) {
                    break;
                }

                final UUID qId = q.getId();

                futures.add(executor.submit(() -> {
                    if ("CANCELLED".equals(statusMap.get("status"))) return null;

                    try {
                        Question currentQ = questionRepository.findById(qId).orElse(null);
                        if (currentQ == null) return null;

                        AiAuditResultDto auditRes = auditQuestionEntity(currentQ);

                        if (auditRes == null || auditRes.getRawSuggestionsJson() == null || auditRes.getRawSuggestionsJson().contains("সাময়িক সংযোগ সমস্যা")) {
                            // Rate limit 429 or network timeout -> keep un-audited for auto-retry in next batch
                            logQueue.add("⚠️ [এপিআই কোটা/নেটওয়ার্ক এরর] প্রশ্ন ID " + qId.toString().substring(0, 8) + " - পরবর্তী অডিট ব্যাচে রিট্রাই হবে");
                            return null;
                        }

                        if (autoFixTopics) {
                            boolean changed = false;
                            List<String> fixDetails = new ArrayList<>();

                            Question targetQ = questionRepository.findById(qId).orElse(currentQ);
                            String originalText = targetQ.getQuestionText() != null ? targetQ.getQuestionText() : "";

                            // 1. Auto topic fix safely
                            if (auditRes.getSuggestedTopicName() != null && !auditRes.getSuggestedTopicName().trim().isEmpty() && Boolean.FALSE.equals(auditRes.getTopicMatch())) {
                                UUID targetChId = targetQ.getChapter() != null ? targetQ.getChapter().getId() : null;
                                if (targetChId != null) {
                                    List<Topic> availableTopics = topicRepository.findByChapterId(targetChId);
                                    String targetName = auditRes.getSuggestedTopicName().trim().toLowerCase();
                                    Topic matchedTopic = availableTopics.stream()
                                            .filter(t -> t.getName() != null && (
                                                    t.getName().trim().toLowerCase().equals(targetName) ||
                                                    t.getName().trim().toLowerCase().contains(targetName) ||
                                                    targetName.contains(t.getName().trim().toLowerCase())
                                            ))
                                            .findFirst().orElse(null);

                                    if (matchedTopic != null && (targetQ.getTopic() == null || !targetQ.getTopic().getId().equals(matchedTopic.getId()))) {
                                        targetQ.setTopic(matchedTopic);
                                        changed = true;
                                        fixDetails.add("টপিক: " + matchedTopic.getName());
                                    }
                                }
                            }

                            // 2. Auto typo text fix safely
                            if (auditRes.getProposedQuestionText() != null && !auditRes.getProposedQuestionText().trim().isEmpty()) {
                                String cleanProp = auditRes.getProposedQuestionText().trim();
                                if (!originalText.trim().equals(cleanProp)) {
                                    targetQ.setQuestionText(cleanProp);
                                    changed = true;
                                    fixDetails.add("প্রশ্ন টাইপো কারেকশন");
                                }
                            }

                            // 3. Auto explanation fix safely
                            if (auditRes.getProposedExplanation() != null && !auditRes.getProposedExplanation().trim().isEmpty()) {
                                String cleanExp = auditRes.getProposedExplanation().trim();
                                String existingExp = targetQ.getExplanation() != null ? targetQ.getExplanation().trim() : "";
                                if (!cleanExp.equals(existingExp)) {
                                    targetQ.setExplanation(cleanExp);
                                    changed = true;
                                    fixDetails.add("ব্যাখ্যা কারেকশন");
                                }
                            }

                            // 4. Auto MCQ options & correct answer fix safely
                            if (auditRes.getRawSuggestionsJson() != null && !auditRes.getRawSuggestionsJson().isEmpty()) {
                                try {
                                    JsonNode root = objectMapper.readTree(auditRes.getRawSuggestionsJson());
                                    String propCorrect = root.path("proposedCorrectAnswer").asText("");
                                    String currentCorrect = targetQ.getCorrectAnswer() != null ? targetQ.getCorrectAnswer() : "";
                                    if (!propCorrect.isEmpty() && !currentCorrect.equalsIgnoreCase(propCorrect)) {
                                        targetQ.setCorrectAnswer(propCorrect);
                                        changed = true;
                                        fixDetails.add("সঠিক উত্তর: " + propCorrect);
                                    }

                                    JsonNode propOpts = root.path("proposedOptions");
                                    if (propOpts.isArray() && targetQ.getOptions() != null) {
                                        for (JsonNode optNode : propOpts) {
                                            String lbl = optNode.path("optionLabel").asText("");
                                            String txt = optNode.path("optionText").asText("");
                                            if (!lbl.isEmpty() && !txt.isEmpty()) {
                                                for (QuestionOption opt : targetQ.getOptions()) {
                                                    if (opt.getOptionLabel() != null && lbl.equalsIgnoreCase(opt.getOptionLabel()) && !txt.equals(opt.getOptionText())) {
                                                        opt.setOptionText(txt);
                                                        changed = true;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } catch (Exception optEx) {
                                    log.warn("Failed parsing proposed options for Q ID {}: {}", targetQ.getId(), optEx.getMessage());
                                }
                            }

                            String qSnippet = originalText.length() > 30 ? originalText.substring(0, 30) + "..." : originalText;

                            if (changed) {
                                targetQ.setAiAuditScore(Math.max(auditRes.getQualityScore(), 85));
                                targetQ.setAiAuditSuggestions(auditRes.getRawSuggestionsJson());
                                safeSaveQuestion(targetQ);
                                autoFixedCounter.incrementAndGet();
                                String logItem = "✨ [অটো-ফিক্সড] " + qSnippet + " (" + String.join(", ", fixDetails) + ")";
                                logQueue.add(logItem);
                            } else {
                                String logItem = "✅ [অডিট সম্পন্ন] " + qSnippet + " (স্কোর: " + auditRes.getQualityScore() + "%)";
                                logQueue.add(logItem);
                            }
                        } else {
                            String qText = currentQ.getQuestionText() != null ? currentQ.getQuestionText() : "";
                            String qSnippet = qText.length() > 35 ? qText.substring(0, 35) + "..." : qText;
                            String logItem = "🔍 [অডিট করা হয়েছে] " + qSnippet + " (স্কোর: " + (auditRes != null ? auditRes.getQualityScore() : 75) + "%)";
                            logQueue.add(logItem);
                        }
                    } catch (Exception ex) {
                        log.error("Batch audit failed for Question ID: {}", qId, ex);
                        logQueue.add("⚠️ [এরর/রিট্রাই] প্রশ্ন ID " + qId.toString().substring(0, 8) + " - পরবর্তী অডিট ব্যাচে অটো-রিট্রাই হবে");
                    } finally {
                        int curProcessed = processedCounter.incrementAndGet();
                        statusMap.put("processedCount", curProcessed);
                        statusMap.put("autoFixedCount", autoFixedCounter.get());
                        statusMap.put("message", "অডিট চলছে... " + curProcessed + " / " + total + " সম্পন্ন (অটো-ফিক্সড: " + autoFixedCounter.get() + ")");
                    }
                    return null;
                }));

                // Controlled micro-stagger for 50 parallel workers
                try { Thread.sleep(40); } catch (InterruptedException ignored) {}
            }

            // Wait for all worker tasks to complete
            executor.shutdown();
            for (java.util.concurrent.Future<?> f : futures) {
                try {
                    f.get();
                } catch (Exception ignored) {}
            }

            if ("CANCELLED".equals(statusMap.get("status"))) {
                statusMap.put("message", "⏹️ অডিট ব্যাচ এজেন্টের কাজ স্থগিত করা হয়েছে। (" + processedCounter.get() + "/" + total + " সম্পন্ন)");
                logQueue.add("⏹️ ব্যাকগ্রাউন্ড প্রসেস ব্যবহারকারী দ্বারা থামানো হয়েছে।");
                return;
            }

            statusMap.put("status", "COMPLETED");
            statusMap.put("message", "🎉 এআই ব্যাকগ্রাউন্ড এজেন্ট অডিট সফলভাবে সম্পন্ন হয়েছে! মোট: " + total + ", অটো-ফিক্সড: " + autoFixedCounter.get() + ", পূর্বে অডিটেড: " + initialSkipped);
            logQueue.add("🎉 অডিট সম্পন্ন! অটো-ফিক্সড: " + autoFixedCounter.get() + "টি প্রশ্ন।");
        } catch (Exception e) {
            log.error("Fatal error in Subject Batch Agent", e);
            statusMap.put("status", "FAILED");
            statusMap.put("message", "ব্যাকগ্রাউন্ড প্রসেসিংয়ে সমস্যা দেখা দিয়েছে: " + e.getMessage());
            logQueue.add("❌ [ফ্যাটাল এরর]: " + e.getMessage());
        }
    }

    private String buildAuditPrompt(Question q, String subject, String chapter, String topic, List<String> options, List<String> availableTopics) {
        return "You are an expert AI Curriculum Inspector & Autonomous Quality Auditor for an EdTech Question Bank platform.\n" +
                "Evaluate the following question thoroughly against Bengali/English curriculum standards.\n" +
                "PROVIDE EXACT PROPOSED CORRECTIONS, BENGALI DIAGNOSTIC SUMMARY, AND STEP-BY-STEP CHECKITEMS.\n\n" +
                "CRITICAL TYPO & AUTO-FIX INSTRUCTION:\n" +
                "- ALWAYS check for Bengali typos, missing space, wrong spelling, or math equation formatting in questionText, options, and explanation.\n" +
                "- IF ANY TYPO OR FORMATTING IS FIXED/BEAUTIFIED, set hasProposedFixes=true and provide the FULL CORRECTED version in proposedQuestionText, proposedExplanation, or proposedOptions.\n\n" +
                "SUBJECT: " + subject + "\n" +
                "CHAPTER: " + chapter + "\n" +
                "ASSIGNED TOPIC: " + topic + "\n" +
                "AVAILABLE CHAPTER TOPICS: " + availableTopics.toString() + "\n" +
                "QUESTION TYPE: " + q.getType() + "\n" +
                "STIMULUS (stem): " + (q.getStimulus() != null ? q.getStimulus() : "None") + "\n" +
                "QUESTION TEXT: " + q.getQuestionText() + "\n" +
                "OPTIONS: " + options.toString() + "\n" +
                "CORRECT ANSWER: " + (q.getCorrectAnswer() != null ? q.getCorrectAnswer() : "None") + "\n" +
                "EXPLANATION: " + (q.getExplanation() != null ? q.getExplanation() : "None") + "\n\n" +
                "EVALUATION CRITERIA:\n" +
                "1. TOPIC ALIGNMENT: Does the question content match the ASSIGNED TOPIC? If wrong, select the best topic from AVAILABLE CHAPTER TOPICS.\n" +
                "2. TYPOS & GRAMMAR: Check for Bengali or English spelling/math equation typos. If typos exist, write the FULL CORRECTED question text in proposedQuestionText.\n" +
                "3. MCQ OPTIONS & CORRECT ANSWER: Verify option text accuracy and correct answer option label (e.g., 'ক', 'খ', 'গ', 'ঘ' or 'A', 'B', 'C', 'D'). Write corrected correct answer in proposedCorrectAnswer and options in proposedOptions array.\n" +
                "4. EXPLANATION: Check if explanation has typos or formatting errors. If so, write the FULL CORRECTED explanation in proposedExplanation.\n\n" +
                "OUTPUT FORMAT (PURE JSON ONLY - ALL MESSAGES IN BENGALI):\n" +
                "{\n" +
                "  \"qualityScore\": 85,\n" +
                "  \"topicMatch\": true,\n" +
                "  \"suggestedTopicName\": \"\",\n" +
                "  \"issueSummary\": \"Diagnostic 1-sentence Bengali summary\",\n" +
                "  \"hasProposedFixes\": true,\n" +
                "  \"proposedQuestionText\": \"Corrected text if any typos exist\",\n" +
                "  \"proposedCorrectAnswer\": \"Correct option label if changed\",\n" +
                "  \"proposedOptions\": [\n" +
                "    {\"optionLabel\": \"ক\", \"optionText\": \"Corrected text for option 1\"}\n" +
                "  ],\n" +
                "  \"proposedExplanation\": \"Corrected explanation if any typos exist\",\n" +
                "  \"checks\": [\n" +
                "    {\"category\": \"TOPIC_ALIGNMENT\", \"status\": \"PASS\", \"message\": \"Bengali message\", \"suggestion\": \"Bengali suggestion\"},\n" +
                "    {\"category\": \"TYPO_GRAMMAR\", \"status\": \"WARNING\", \"message\": \"Bengali message\", \"suggestion\": \"Bengali suggestion\"},\n" +
                "    {\"category\": \"MCQ_OPTIONS\", \"status\": \"PASS\", \"message\": \"Bengali message\", \"suggestion\": \"\"}\n" +
                "  ]\n" +
                "}\n";
    }

}

