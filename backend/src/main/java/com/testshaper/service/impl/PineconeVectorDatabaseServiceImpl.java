package com.testshaper.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.service.EmbeddingService;
import com.testshaper.service.VectorDatabaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PineconeVectorDatabaseServiceImpl implements VectorDatabaseService {

    @Value("${app.pinecone.api-key:}")
    private String apiKey;

    @Value("${app.pinecone.host:}")
    private String host;

    @Value("${app.pinecone.index-name:questionshaper-index}")
    private String indexName;

    private final EmbeddingService embeddingService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30_000);
        factory.setReadTimeout(90_000); 
        return new RestTemplate(factory);
    }

    private boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.contains("YOUR_") 
               && host != null && !host.isBlank();
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Api-Key", apiKey);
        return headers;
    }

    @Override
    public void upsertChunk(String chunkId, String rawText, Map<String, Object> metadata) {
        if (!isConfigured()) {
            log.warn("Pinecone API Key or Host not configured. Skipping Vector DB Upsert.");
            return;
        }

        try {
            // 1. Generate text embeddings
            List<Float> embedding = embeddingService.generateEmbedding(rawText);

            // 2. Add raw text to metadata and sanitize to avoid null values
            Map<String, Object> safeMetadata = new java.util.HashMap<>();
            if (metadata != null) {
                for (Map.Entry<String, Object> entry : metadata.entrySet()) {
                    if (entry.getValue() != null) {
                        safeMetadata.put(entry.getKey(), entry.getValue());
                    }
                }
            }
            safeMetadata.put("text", rawText);

            // 3. Prepare Vector payload
            Map<String, Object> vector = Map.of(
                "id", chunkId,
                "values", embedding,
                "metadata", safeMetadata
            );

            Map<String, Object> requestBody = Map.of(
                "vectors", List.of(vector)
            );

            // 4. Send request
            String url = host + "/vectors/upsert";
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Pinecone Rest API failed: " + response.getStatusCode());
            }

            log.debug("Successfully upserted chunk {} to Pinecone Rest API", chunkId);

        } catch (Exception e) {
            log.error("Failed to upsert chunk {} to Pinecone: {}", chunkId, e.getMessage());
        }
    }

    @Override
    public List<String> similaritySearch(String query, int limit, Map<String, Object> filterMetadata) {
        if (!isConfigured()) {
            log.warn("Pinecone API Key or Host not configured. Returning empty search results.");
            return List.of();
        }

        try {
            // 1. Generate query embedding
            List<Float> queryVector = embeddingService.generateEmbedding(query);

            // 2. Prepare Match request
            Map<String, Object> requestBody = new java.util.HashMap<>();
            requestBody.put("vector", queryVector);
            requestBody.put("topK", limit);
            requestBody.put("includeMetadata", true);
            requestBody.put("includeValues", false);

            if (filterMetadata != null && !filterMetadata.isEmpty()) {
                requestBody.put("filter", filterMetadata);
            }

            // 3. Send request
            String url = host + "/query";
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Pinecone Query API failed: " + response.getStatusCode());
            }

            // 4. Parse response JSON
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode matches = root.path("matches");

            List<String> contextList = new ArrayList<>();
            if (matches.isArray()) {
                for (JsonNode match : matches) {
                    JsonNode textNode = match.path("metadata").path("text");
                    if (!textNode.isMissingNode() && !textNode.isNull()) {
                        contextList.add(textNode.asText());
                    }
                }
            }
            return contextList;
        } catch (Exception e) {
            log.error("Similarity search failed: {}", e.getMessage());
            return List.of();
        }
    }

    @Override
    public void deleteDocumentChunks(String docId) {
         if (!isConfigured()) return;
         log.info("Pinecone REST API does not support mass delete uniformly on Starter tiers. Skipping Document clear for doc: {}", docId);
    }
}
