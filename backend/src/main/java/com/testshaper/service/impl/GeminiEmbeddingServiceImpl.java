package com.testshaper.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.service.EmbeddingService;
import com.testshaper.service.GeneralSettingService;
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
public class GeminiEmbeddingServiceImpl implements EmbeddingService {

    private static final String GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent?key=%s";
    private static final String DEFAULT_EMBED_MODEL = "gemini-embedding-001";

    private final GeneralSettingService generalSettingService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30_000);
        factory.setReadTimeout(60_000); 
        return new RestTemplate(factory);
    }

    @Value("${app.gemini.api-key:}")
    private String fallbackApiKey;

    @Value("${app.pinecone.dimension:768}")
    private int embeddingDimension;

    private String getApiKey() {
        Map<String, String> settings = generalSettingService.getGlobalSettings(com.testshaper.entity.GeneralSetting.SettingCategory.AI);
        String dbKey = settings.getOrDefault("ai_api_key", "");
        if (!dbKey.isBlank() && !dbKey.equals("******")) return dbKey;
        return fallbackApiKey;
    }

    @Override
    public List<Float> generateEmbedding(String text) {
        String apiKey = getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("Gemini API Key is missing. Cannot generate embeddings.");
        }

        try {
            String url = String.format(GEMINI_EMBED_URL, DEFAULT_EMBED_MODEL, apiKey);

            Map<String, Object> requestBody = Map.of(
                "model", "models/" + DEFAULT_EMBED_MODEL,
                "content", Map.of("parts", List.of(Map.of("text", text))),
                "outputDimensionality", embeddingDimension
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Gemini Embed API call failed: " + response.getStatusCode());
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode valuesNode = root.path("embedding").path("values");

            if (valuesNode.isArray()) {
                List<Float> embeddings = new ArrayList<>();
                for (JsonNode val : valuesNode) {
                    embeddings.add((float) val.asDouble());
                }
                return embeddings;
            }

            throw new RuntimeException("Empty or invalid response from Gemini Embed API");

        } catch (Exception e) {
            log.error("Failed to generate embedding for text: {}", e.getMessage());
            throw new RuntimeException("Embedding generation failed", e);
        }
    }

    @Override
    public List<List<Float>> generateEmbeddings(List<String> texts) {
        // Implement Batch Embedding later if needed. For now, sequential.
        List<List<Float>> results = new ArrayList<>();
        for (String text : texts) {
            results.add(generateEmbedding(text));
        }
        return results;
    }
}
