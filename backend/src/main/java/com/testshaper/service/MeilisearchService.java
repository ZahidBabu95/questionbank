package com.testshaper.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meilisearch.sdk.Client;
import com.meilisearch.sdk.Index;
import com.meilisearch.sdk.SearchRequest;
import com.meilisearch.sdk.model.SearchResult;
import com.meilisearch.sdk.model.Searchable;
import com.meilisearch.sdk.model.Settings;
import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class MeilisearchService {

    private static final Logger log = LoggerFactory.getLogger(MeilisearchService.class);
    public static final String INDEX_NAME = "questions";

    private final Client meilisearchClient;
    private final ObjectMapper objectMapper;

    @Value("${app.meilisearch.enabled:true}")
    private boolean enabled;

    public MeilisearchService(Client meilisearchClient, ObjectMapper objectMapper) {
        this.meilisearchClient = meilisearchClient;
        this.objectMapper = objectMapper;
    }

    public boolean isAvailable() {
        if (!enabled) return false;
        try {
            return meilisearchClient.isHealthy();
        } catch (Exception e) {
            log.debug("Meilisearch health check failed: {}", e.getMessage());
            return false;
        }
    }

    public void initIndexSettings() {
        if (!isAvailable()) return;
        try {
            Index index = meilisearchClient.index(INDEX_NAME);
            Settings settings = new Settings();
            
            settings.setSearchableAttributes(new String[]{
                "questionText", "sourceReference", "optionsText", "topicName", "chapterName", "subjectName"
            });
            settings.setFilterableAttributes(new String[]{
                "tenantId", "classSubjectId", "chapterId", "type", "difficulty", "language", "status", "deleted"
            });
            
            index.updateSettings(settings);
            log.info("✅ Meilisearch 'questions' index settings updated successfully.");
        } catch (Exception e) {
            log.warn("Failed to update Meilisearch index settings: {}", e.getMessage());
        }
    }

    public void indexQuestion(Question question, List<QuestionOption> options) {
        if (!isAvailable() || question == null) return;
        try {
            Map<String, Object> doc = buildDocument(question, options);
            String json = objectMapper.writeValueAsString(Collections.singletonList(doc));
            meilisearchClient.index(INDEX_NAME).addDocuments(json);
        } catch (Exception e) {
            log.warn("Failed to index question [{}] in Meilisearch: {}", question.getId(), e.getMessage());
        }
    }

    public void deleteQuestionIndex(UUID questionId) {
        if (!isAvailable() || questionId == null) return;
        try {
            meilisearchClient.index(INDEX_NAME).deleteDocument(questionId.toString());
        } catch (Exception e) {
            log.warn("Failed to delete question [{}] from Meilisearch: {}", questionId, e.getMessage());
        }
    }

    public int bulkIndexDocuments(List<Map<String, Object>> documents) {
        if (!isAvailable() || documents == null || documents.isEmpty()) return 0;
        try {
            String json = objectMapper.writeValueAsString(documents);
            meilisearchClient.index(INDEX_NAME).addDocuments(json);
            return documents.size();
        } catch (Exception e) {
            log.warn("Failed to bulk index documents in Meilisearch: {}", e.getMessage());
            return 0;
        }
    }

    public Map<String, Object> searchQuestions(String query, String tenantId, String classSubjectId, 
                                                String chapterId, String type, String difficulty, 
                                                int page, int size) {
        Map<String, Object> response = new HashMap<>();
        if (!isAvailable()) {
            response.put("available", false);
            return response;
        }

        try {
            Index index = meilisearchClient.index(INDEX_NAME);
            SearchRequest request = new SearchRequest(query != null ? query : "");
            request.setLimit(size > 0 ? size : 20);
            request.setOffset(Math.max(0, page * size));

            List<String> filters = new ArrayList<>();
            filters.add("deleted = false");
            
            if (tenantId != null && !tenantId.trim().isEmpty()) {
                filters.add("tenantId = '" + tenantId + "'");
            }
            if (classSubjectId != null && !classSubjectId.trim().isEmpty()) {
                filters.add("classSubjectId = '" + classSubjectId + "'");
            }
            if (chapterId != null && !chapterId.trim().isEmpty()) {
                filters.add("chapterId = '" + chapterId + "'");
            }
            if (type != null && !type.trim().isEmpty()) {
                filters.add("type = '" + type + "'");
            }
            if (difficulty != null && !difficulty.trim().isEmpty()) {
                filters.add("difficulty = '" + difficulty + "'");
            }

            request.setFilter(filters.toArray(new String[0]));

            Searchable searchable = index.search(request);
            response.put("available", true);

            if (searchable instanceof SearchResult) {
                SearchResult result = (SearchResult) searchable;
                response.put("hits", result.getHits());
                response.put("totalHits", result.getEstimatedTotalHits());
                response.put("processingTimeMs", result.getProcessingTimeMs());
            } else {
                response.put("hits", Collections.emptyList());
                response.put("totalHits", 0);
                response.put("processingTimeMs", 0);
            }
            return response;

        } catch (Exception e) {
            log.warn("Meilisearch search execution failed: {}", e.getMessage());
            response.put("available", false);
            return response;
        }
    }

    public Map<String, Object> buildDocument(Question question, List<QuestionOption> options) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", question.getId().toString());
        map.put("questionText", question.getQuestionText() != null ? question.getQuestionText() : "");
        map.put("type", question.getType() != null ? question.getType() : "MCQ");
        map.put("difficulty", question.getDifficulty() != null ? question.getDifficulty().name() : "MEDIUM");
        map.put("language", question.getLanguage() != null ? question.getLanguage() : "Bangla");
        map.put("status", question.getStatus() != null ? question.getStatus() : "APPROVED");
        map.put("deleted", question.isDeleted());
        map.put("tenantId", question.getTenantId() != null ? question.getTenantId() : "DEFAULT");

        if (question.getClassSubject() != null && question.getClassSubject().getSubject() != null) {
            map.put("classSubjectId", question.getClassSubject().getId().toString());
            map.put("subjectName", question.getClassSubject().getSubject().getName());
        }
        if (question.getChapter() != null) {
            map.put("chapterId", question.getChapter().getId().toString());
            map.put("chapterName", question.getChapter().getName());
        }

        map.put("sourceReference", question.getSourceReference() != null ? question.getSourceReference() : "");

        StringBuilder optionsText = new StringBuilder();
        if (options != null) {
            for (QuestionOption opt : options) {
                if (opt.getOptionText() != null) {
                    optionsText.append(opt.getOptionText()).append(" ");
                }
            }
        }
        map.put("optionsText", optionsText.toString());

        return map;
    }
}
