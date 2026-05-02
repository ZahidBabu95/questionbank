package com.testshaper.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import com.testshaper.service.ApiKeyRotationService;
import com.testshaper.entity.AiApiKey;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiToolScannerService {

    private final RequestMappingHandlerMapping requestMappingHandlerMapping;
    private final ApiKeyRotationService apiKeyRotationService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.gemini.api-key:YOUR_GEMINI_API_KEY_HERE}")
    private String geminiApiKey;

    @Value("${app.gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    public String generateSchemaForRoute(String frontendPath, String customPrompt, String sampleJson) {
        // 1. Extract all backend endpoints
        String endpointsContext = extractBackendEndpoints();

        // 2. Build the AI Prompt
        String systemInstruction = "You are an expert Frontend Developer and UI/UX Designer. " +
                "You are helping to generate a React JSX Component for a 'Dynamic Tool Chat Widget'.\n" +
                "The widget uses this React code to render a step-by-step form or UI.\n" +
                "Here is the standard structure you MUST follow:\n" +
                "1. Use Tailwind CSS for styling.\n" +
                "2. Use lucide-react icons.\n" +
                "3. Manage state using React.useState.\n" +
                "4. Make API calls using the 'axios' instance available in the scope. IMPORTANT: The axios instance already has a baseURL of '/api', so you MUST NOT start your endpoint paths with '/api'. For example, if the backend endpoint is '/api/v1/users', use axios.get('/v1/users').\n" +
                "5. The code MUST end with 'render(<YourComponentName />);'\n" +
                "6. Do NOT include import statements (React, useState, axios, lucide icons are already in scope).\n" +
                "7. Return ONLY raw React JSX code. Do not include markdown code block markers like ```jsx.\n" +
                "8. Be highly defensive when rendering API data. You DO NOT know the exact JSON schema. Always use fallback chains for labels (e.g., {item.name || item.title || item.subjectName || item.className || 'Unknown'}) to prevent rendering blank UI.";

        String userPrompt = "The frontend path is: " + frontendPath + "\n\n";
        
        if (customPrompt != null && !customPrompt.isBlank()) {
            userPrompt += "USER CUSTOM INSTRUCTIONS: " + customPrompt + "\n\n";
        }
        
        if (sampleJson != null && !sampleJson.isBlank()) {
            userPrompt += "100% DATA ACCURACY GUARANTEE - HERE IS THE EXACT API RESPONSE SCHEMA/DATA TO USE:\n" + sampleJson + "\n\n" +
                          "IMPORTANT: You MUST use the exact field names provided in the sample JSON above when mapping data in your React code!\n\n";
        }
        
        userPrompt += "Here are the available backend API endpoints:\n" + endpointsContext + "\n\n" +
                "Based on the frontend path and endpoints, predict which endpoints are needed and generate the schema.";

        // 3. Call Gemini
        return callGeminiApi(systemInstruction + "\n\n" + userPrompt);
    }

    private String extractBackendEndpoints() {
        try {
            return requestMappingHandlerMapping.getHandlerMethods().entrySet().stream()
                    .filter(entry -> !entry.getValue().getBeanType().getName().contains("springfox") && 
                                     !entry.getValue().getBeanType().getName().contains("error"))
                    .map(entry -> {
                        String methods = entry.getKey().getMethodsCondition().getMethods().toString();
                        String patterns = entry.getKey().getPatternValues().toString();
                        String beanName = entry.getValue().getBeanType().getSimpleName();
                        return String.format("[%s] %s -> %s", methods, patterns, beanName);
                    })
                    .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            log.error("Failed to extract endpoints", e);
            return "Could not extract endpoints.";
        }
    }

    public List<Map<String, String>> getBackendEndpointsList() {
        try {
            return requestMappingHandlerMapping.getHandlerMethods().entrySet().stream()
                    .filter(entry -> !entry.getValue().getBeanType().getName().contains("springfox") && 
                                     !entry.getValue().getBeanType().getName().contains("error"))
                    .flatMap(entry -> {
                        String methods = entry.getKey().getMethodsCondition().getMethods().toString();
                        String beanName = entry.getValue().getBeanType().getSimpleName();
                        return entry.getKey().getPatternValues().stream().map(pattern -> {
                            Map<String, String> map = new HashMap<>();
                            map.put("method", methods.replaceAll("\\[|\\]", ""));
                            // strip /api prefix for the UI
                            map.put("path", pattern.replaceFirst("^/api", ""));
                            map.put("controller", beanName);
                            return map;
                        });
                    })
                    // Filter out non-api endpoints or internal ones if desired, keeping it simple for now
                    .filter(m -> m.get("path").startsWith("/v1/"))
                    .sorted((a, b) -> a.get("path").compareTo(b.get("path")))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to extract endpoints list", e);
            return new ArrayList<>();
        }
    }

    private String callGeminiApi(String prompt) {
        String apiKeyToUse = geminiApiKey;
        String modelToUse = geminiModel;

        // If local API key is missing, fetch from database via rotation service
        if (apiKeyToUse == null || apiKeyToUse.isBlank() || apiKeyToUse.contains("YOUR_GEMINI")) {
            try {
                AiApiKey dbKey = apiKeyRotationService.getNextAvailableKey();
                if (dbKey != null) {
                    apiKeyToUse = dbKey.getApiKey();
                    if (dbKey.getModel() != null && !dbKey.getModel().isBlank()) {
                        modelToUse = dbKey.getModel();
                    } else {
                        modelToUse = "gemini-2.5-flash"; // Force 2.5 flash model
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to get API key from database: " + e.getMessage());
            }
        }

        if (apiKeyToUse == null || apiKeyToUse.isBlank() || apiKeyToUse.contains("YOUR_GEMINI")) {
            log.warn("Gemini API key is missing. Returning a mock schema.");
            return "{ \"title\": \"Mock Generated Schema\", \"steps\": [] }";
        }

        try {
            // Ensure we use a capable model for this complex task
            if (modelToUse == null || modelToUse.isBlank()) {
                modelToUse = "gemini-2.5-flash";
            }
            String url = String.format(GEMINI_API_URL, modelToUse, apiKeyToUse);

            Map<String, Object> part = new HashMap<>();
            part.put("text", prompt);

            Map<String, Object> content = new HashMap<>();
            content.put("parts", List.of(part));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", List.of(content));

            // Set generation config to plain text instead of JSON so it can return JSX
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("response_mime_type", "text/plain");
            requestBody.put("generationConfig", generationConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            
            if (response.getBody() != null) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> contentObj = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) contentObj.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        String text = (String) parts.get(0).get("text");
                        // Clean up markdown markers
                        if (text.startsWith("```jsx")) {
                            text = text.substring(6);
                        } else if (text.startsWith("```javascript")) {
                            text = text.substring(13);
                        } else if (text.startsWith("```")) {
                            text = text.substring(3);
                        }
                        if (text.endsWith("```")) {
                            text = text.substring(0, text.length() - 3);
                        }
                        return text.trim();
                    }
                }
            }
            return "{}";
        } catch (Exception e) {
            log.error("Failed to call Gemini API", e);
            throw new RuntimeException("AI generation failed: " + e.getMessage());
        }
    }
}
