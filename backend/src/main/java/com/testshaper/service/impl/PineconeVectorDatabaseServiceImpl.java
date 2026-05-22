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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.client.HttpStatusCodeException;

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

            if (embedding == null || embedding.isEmpty()) {
                log.error("Embedding generation returned null/empty for chunkId: {}", chunkId);
                return;
            }

            // 2. Add raw text to metadata and sanitize to avoid null values
            Map<String, Object> safeMetadata = new HashMap<>();
            String namespace = ""; // Extract namespace for mass delete later
            
            if (metadata != null) {
                for (Map.Entry<String, Object> entry : metadata.entrySet()) {
                    if (entry.getValue() != null) {
                        safeMetadata.put(entry.getKey(), entry.getValue());
                    }
                }
                if (metadata.containsKey("bookId")) {
                    namespace = "book-" + metadata.get("bookId").toString();
                } else if (metadata.containsKey("docId")) {
                    namespace = "doc-" + metadata.get("docId").toString();
                }
            }
            safeMetadata.put("text", rawText != null ? rawText : "");

            // 3. Prepare Vector payload (Using HashMap to prevent NullPointerException)
            Map<String, Object> vector = new HashMap<>();
            vector.put("id", chunkId);
            vector.put("values", embedding);
            vector.put("metadata", safeMetadata);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("vectors", List.of(vector));
            if (!namespace.isEmpty()) {
                requestBody.put("namespace", namespace);
            }

            // 4. Send request
            String baseUrl = host.startsWith("http") ? host : "https://" + host;
            String url = baseUrl + "/vectors/upsert";
            
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                 log.error("Pinecone Rest API failed with status: {}, body: {}", response.getStatusCode(), response.getBody());
            } else {
                 log.debug("Successfully upserted chunk {} to Pinecone Rest API namespace: {}", chunkId, namespace);
            }

        } catch (HttpStatusCodeException e) {
            log.error("Pinecone API Error during upsert: {} - Body: {}", e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Failed to upsert chunk {} to Pinecone: {}", chunkId, e.getMessage(), e);
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

            if (queryVector == null || queryVector.isEmpty()) {
                log.error("Embedding generation failed for query");
                return List.of();
            }

            // 2. Prepare Match request
            Map<String, Object> requestBody = new HashMap<>(); // Using imported HashMap
            requestBody.put("vector", queryVector);
            requestBody.put("topK", limit);
            requestBody.put("includeMetadata", true);
            requestBody.put("includeValues", false);

            List<String> inactiveChapterIds = null;
            String namespace = "";
            if (filterMetadata != null && !filterMetadata.isEmpty()) {
                Map<String, Object> safeFilters = new HashMap<>(filterMetadata);
                if (safeFilters.containsKey("_inactiveChapterIds")) {
                    Object val = safeFilters.remove("_inactiveChapterIds");
                    if (val instanceof List) {
                        inactiveChapterIds = (List<String>) val;
                    }
                }
                if (!safeFilters.isEmpty()) {
                    requestBody.put("filter", safeFilters);
                }
                if (filterMetadata.containsKey("bookId")) {
                    namespace = "book-" + filterMetadata.get("bookId").toString();
                } else if (filterMetadata.containsKey("docId")) {
                    namespace = "doc-" + filterMetadata.get("docId").toString();
                }
            }
            
            if (!namespace.isEmpty()) {
                requestBody.put("namespace", namespace);
            }

            // 3. Send request
            String baseUrl = host.startsWith("http") ? host : "https://" + host;
            String url = baseUrl + "/query";
            
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("Pinecone Query API failed with status: {}, body: {}", response.getStatusCode(), response.getBody());
            }

            // 4. Parse response JSON
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode matches = root.path("matches");

            List<String> contextList = new ArrayList<>();
            if (matches.isArray()) {
                for (JsonNode match : matches) {
                    // Check if chapterId metadata exists and matches inactive chapters list
                    if (inactiveChapterIds != null && !inactiveChapterIds.isEmpty()) {
                        JsonNode chapIdNode = match.path("metadata").path("chapterId");
                        if (!chapIdNode.isMissingNode() && !chapIdNode.isNull()) {
                            String chapIdStr = chapIdNode.asText();
                            if (inactiveChapterIds.contains(chapIdStr)) {
                                log.debug("Filtering out search result chunk with inactive chapterId: {}", chapIdStr);
                                continue;
                            }
                        }
                    }

                    JsonNode textNode = match.path("metadata").path("text");
                    if (!textNode.isMissingNode() && !textNode.isNull()) {
                        contextList.add(textNode.asText());
                    }
                }
            }
            return contextList;
        } catch (HttpStatusCodeException e) {
            log.error("Pinecone API Error during query: {} - Body: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return List.of();
        } catch (Exception e) {
            log.error("Similarity search failed: {}", e.getMessage(), e);
            return List.of();
        }
    }

    @Override
    public void deleteDocumentChunks(String docId) {
         if (!isConfigured()) return;
         if (docId == null || docId.isBlank()) return;
         
         log.info("Deleting all vector chunks for Document ID: {}", docId);
         try {
             // Let's assume namespace could be doc- or book- prefix. For safety, try deleting both.
             String[] namespacesToDelete = {"book-" + docId, "doc-" + docId};
             String baseUrl = host.startsWith("http") ? host : "https://" + host;
             String url = baseUrl + "/vectors/delete";
             
             for (String namespace : namespacesToDelete) {
                 Map<String, Object> requestBody = new HashMap<>();
                 requestBody.put("deleteAll", true);
                 requestBody.put("namespace", namespace);
                 
                 HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), createHeaders());
                 restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
             }
             
             log.debug("Successfully issued mass delete for namespaces related to docId: {}", docId);
         } catch (HttpStatusCodeException e) {
             log.error("Pinecone API Error during mass delete: {} - Body: {}", e.getStatusCode(), e.getResponseBodyAsString());
         } catch (Exception e) {
             log.error("Failed to delete document chunks for docId {}: {}", docId, e.getMessage(), e);
         }
    }

    @Override
    public void deleteByMetadata(Map<String, Object> filterMetadata, String namespace) {
         if (!isConfigured() || filterMetadata == null || filterMetadata.isEmpty()) return;
         
         log.info("Deleting vector chunks with metadata filter {} in namespace {}", filterMetadata, namespace);
         try {
             String baseUrl = host.startsWith("http") ? host : "https://" + host;
             String url = baseUrl + "/vectors/delete";
             
             Map<String, Object> requestBody = new HashMap<>();
             requestBody.put("filter", filterMetadata);
             if (namespace != null && !namespace.isBlank()) {
                 requestBody.put("namespace", namespace);
             }
             
             HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), createHeaders());
             restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
             
             log.debug("Successfully issued metadata delete to Pinecone");
         } catch (HttpStatusCodeException e) {
             log.error("Pinecone API Error during metadata delete: {} - Body: {}", e.getStatusCode(), e.getResponseBodyAsString());
         } catch (Exception e) {
             log.error("Failed to delete vector chunks by metadata: {}", e.getMessage(), e);
         }
    }
}
