package com.testshaper.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.common.ApiResponse;
import com.testshaper.entity.AiApiKey;
import com.testshaper.entity.AiUsageLog;
import com.testshaper.entity.GeneralSetting;
import com.testshaper.repository.AiApiKeyRepository;
import com.testshaper.repository.AiUsageLogRepository;
import com.testshaper.service.GeneralSettingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Slf4j
public class AiUsageController {

    private final AiUsageLogRepository repo;
    private final AiApiKeyRepository keyRepository;
    private final GeneralSettingService generalSettingService;

    @Value("${app.gemini.api-key:}")
    private String fallbackApiKey;

    @Value("${app.gemini.model:gemini-2.5-flash}")
    private String fallbackModel;

    private static final double BDT_PER_USD = 121.0;
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    /**
     * Test Gemini API connection with the configured key.
     * Sends a trivial prompt and checks if the API responds.
     */
    @PostMapping("/test-connection")
    public ResponseEntity<?> testConnection(@RequestParam(defaultValue = "") String provider) {
        long startTime = System.currentTimeMillis();

        // Resolve settings — prefer explicit provider param, else use active provider
        String resolvedProvider = (provider != null && !provider.isBlank()) ? provider : resolveProvider();
        String apiKey  = resolveApiKeyForProvider(resolvedProvider);
        String model   = resolveModelForProvider(resolvedProvider);
        String baseUrl = resolveBaseUrlForProvider(resolvedProvider);
        boolean isOpenAI = isOpenAICompatible(resolvedProvider);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("model", model);
        result.put("provider", isOpenAI ? resolvedProvider : "Google Gemini");

        if (apiKey == null || apiKey.isBlank() || "YOUR_GEMINI_API_KEY_HERE".equals(apiKey)) {
            result.put("connected", false);
            result.put("error", "API Key সেট করা হয়নি। উপরে API Key ফিল্ডে আপনার API Key দিন এবং Save করুন।");
            result.put("responseTimeMs", System.currentTimeMillis() - startTime);
            return ResponseEntity.ok(ApiResponse.success(result, "API Key missing"));
        }

        try {
            ObjectMapper om = new ObjectMapper();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            RestTemplate rt = new RestTemplate();

            String url;
            String requestJson;

            if (isOpenAI) {
                // OpenAI-compatible format (AgentRouter, OpenRouter, OpenAI, etc.)
                url = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";

                Map<String, Object> userMsg = Map.of(
                        "role", "user",
                        "content", "Reply with exactly: CONNECTED_OK"
                );
                Map<String, Object> body = Map.of(
                        "model", model,
                        "messages", List.of(userMsg),
                        "temperature", 0,
                        "max_tokens", 20
                );
                requestJson = om.writeValueAsString(body);
                headers.setBearerAuth(apiKey);
            } else {
                // Gemini native format
                url = String.format(GEMINI_API_URL, model, apiKey);
                Map<String, Object> textPart = Map.of("text", "Reply with exactly: CONNECTED_OK");
                Map<String, Object> content = Map.of("parts", List.of(textPart));
                Map<String, Object> genConfig = Map.of("temperature", 0, "maxOutputTokens", 20);
                Map<String, Object> body = Map.of("contents", List.of(content), "generationConfig", genConfig);
                requestJson = om.writeValueAsString(body);
            }

            HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);
            ResponseEntity<String> response = rt.exchange(url, HttpMethod.POST, entity, String.class);

            long elapsed = System.currentTimeMillis() - startTime;

            if (response.getStatusCode().is2xxSuccessful()) {
                String body = response.getBody();

                // Check if the response is HTML (wrong URL)
                if (body != null && body.trim().startsWith("<")) {
                    result.put("connected", false);
                    result.put("error", "❌ Base URL ভুল! API endpoint-এর বদলে ওয়েবসাইটের HTML page রিটার্ন হয়েছে। সঠিক API Base URL দিন (যেমন: https://api.example.com/v1)।");
                    result.put("responseTimeMs", elapsed);
                    return ResponseEntity.ok(ApiResponse.success(result, "Wrong Base URL"));
                }

                JsonNode root = om.readTree(body);
                String aiReply = "";
                int promptTokens = 0, completionTokens = 0, totalTokens = 0;

                if (isOpenAI) {
                    // Parse OpenAI format
                    JsonNode choices = root.path("choices");
                    if (choices.isArray() && choices.size() > 0) {
                        aiReply = choices.get(0).path("message").path("content").asText("").trim();
                    }
                    JsonNode usage = root.path("usage");
                    promptTokens = usage.path("prompt_tokens").asInt(0);
                    completionTokens = usage.path("completion_tokens").asInt(0);
                    totalTokens = usage.path("total_tokens").asInt(0);
                } else {
                    // Parse Gemini format
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && candidates.size() > 0) {
                        JsonNode parts = candidates.get(0).path("content").path("parts");
                        if (parts.isArray() && parts.size() > 0) {
                            aiReply = parts.get(0).path("text").asText("").trim();
                        }
                    }
                    JsonNode usageMetadata = root.path("usageMetadata");
                    promptTokens = usageMetadata.path("promptTokenCount").asInt(0);
                    completionTokens = usageMetadata.path("candidatesTokenCount").asInt(0);
                    totalTokens = usageMetadata.path("totalTokenCount").asInt(0);
                }

                result.put("connected", true);
                result.put("aiResponse", aiReply);
                result.put("responseTimeMs", elapsed);
                result.put("promptTokens", promptTokens);
                result.put("completionTokens", completionTokens);
                result.put("totalTokens", totalTokens);

                return ResponseEntity.ok(ApiResponse.success(result, "✅ API সফলভাবে কানেক্ট হয়েছে!"));
            } else {
                result.put("connected", false);
                result.put("error", "API responded with status: " + response.getStatusCode());
                result.put("responseTimeMs", elapsed);
                return ResponseEntity.ok(ApiResponse.success(result, "API connection failed"));
            }

        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            log.error("API test connection failed: ", e);

            String errorMsg = e.getMessage();
            if (errorMsg != null && errorMsg.contains("Unexpected character ('<'")) {
                errorMsg = "❌ Base URL ভুল! API endpoint-এর বদলে HTML page রিটার্ন হয়েছে। সঠিক API Base URL দিন।";
            } else if (errorMsg != null && (errorMsg.contains("400") && errorMsg.contains("API key not valid"))) {
                errorMsg = "❌ API Key ভুল। সঠিক API Key কপি করে সেট করুন।";
            } else if (errorMsg != null && errorMsg.contains("400")) {
                errorMsg = "❌ ভুল রিকুয়েস্ট (400 Bad Request)। API Key বা Model চেক করুন।";
            } else if (errorMsg != null && errorMsg.contains("401")) {
                errorMsg = "❌ Invalid API Key (401 Unauthorized)। সঠিক API Key দিন।";
            } else if (errorMsg != null && errorMsg.contains("403")) {
                errorMsg = "❌ API Key-তে অনুমতি নেই (403 Forbidden)।";
            } else if (errorMsg != null && errorMsg.contains("429")) {
                errorMsg = "⏳ Rate Limit exceeded (429)। কিছুক্ষণ পর আবার চেষ্টা করুন।";
            } else if (errorMsg != null && (errorMsg.contains("UnknownHostException") || errorMsg.contains("ConnectException"))) {
                errorMsg = "❌ সার্ভারে সংযোগ হচ্ছে না। Base URL চেক করুন বা ইন্টারনেট কানেকশন দেখুন।";
            }

            result.put("connected", false);
            result.put("error", errorMsg);
            result.put("responseTimeMs", elapsed);
            return ResponseEntity.ok(ApiResponse.success(result, "API test failed"));
        }
    }

    @GetMapping("/usage/dashboard")
    public ResponseEntity<?> getDashboard() {
        long totalCalls = repo.countSuccessful();
        long totalQuestions = repo.totalQuestionsGenerated();
        long totalTokens = repo.totalTokensUsed();
        double totalCostUsd = repo.totalCostUsd();
        double totalCostBdt = totalCostUsd * BDT_PER_USD;
        double costPerQuestion = totalQuestions > 0 ? totalCostUsd / totalQuestions : 0;

        List<Map<String, Object>> userSummary = repo.getUserWiseSummary();
        // TupleBackedMap from JPA is immutable — copy to mutable map
        List<Map<String, Object>> mutableUserSummary = new ArrayList<>();
        for (Map<String, Object> u : userSummary) {
            Map<String, Object> m = new LinkedHashMap<>(u);
            Object costObj = m.get("totalCost");
            double cost = costObj instanceof Number ? ((Number) costObj).doubleValue() : 0.0;
            m.put("totalCostBdt", cost * BDT_PER_USD);
            mutableUserSummary.add(m);
        }

        List<Map<String, Object>> actionSummary = repo.getActionWiseSummary();

        List<AiUsageLog> recentLogs = repo.findAllByOrderByCreatedAtDesc();
        if (recentLogs.size() > 50) recentLogs = recentLogs.subList(0, 50);

        List<Map<String, Object>> modelSummary = repo.getModelWiseSummary();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalCalls", totalCalls);
        data.put("totalQuestions", totalQuestions);
        data.put("totalTokens", totalTokens);
        data.put("totalCostUsd", Math.round(totalCostUsd * 10000.0) / 10000.0);
        data.put("totalCostBdt", Math.round(totalCostBdt * 100.0) / 100.0);
        data.put("costPerQuestionUsd", Math.round(costPerQuestion * 100000.0) / 100000.0);
        data.put("costPerQuestionBdt", Math.round(costPerQuestion * BDT_PER_USD * 1000.0) / 1000.0);
        data.put("bdtRate", BDT_PER_USD);
        data.put("userSummary", mutableUserSummary);
        data.put("actionSummary", actionSummary);
        data.put("modelSummary", modelSummary);
        data.put("recentLogs", recentLogs);

        return ResponseEntity.ok(ApiResponse.success(data, "AI Usage Dashboard"));
    }

    @GetMapping("/usage/logs")
    public ResponseEntity<org.springframework.data.domain.Page<AiUsageLog>> getAiLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        
        org.springframework.data.domain.Sort sort = direction.equalsIgnoreCase("asc") ? 
            org.springframework.data.domain.Sort.by(sortBy).ascending() : 
            org.springframework.data.domain.Sort.by(sortBy).descending();
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, sort);
        return ResponseEntity.ok(repo.findAll(pageable));
    }


    // ─── Provider-aware resolve methods ─────────────────────────────────────

    private Map<String, String> getAiSettings() {
        try {
            return generalSettingService.getGlobalSettings(GeneralSetting.SettingCategory.AI);
        } catch (Exception e) { return Map.of(); }
    }

    /** Resolve API key for a specific provider — per-provider dedicated key > first active pool key > fallback */
    private String resolveApiKeyForProvider(String provider) {
        Map<String, String> s = getAiSettings();
        String pKey = provider == null ? "google" : provider.toLowerCase();

        // 1. Per-provider dedicated key from settings
        String dedicatedKey = s.getOrDefault("ai_" + pKey + "_dedicated_key", "");
        if (!dedicatedKey.isBlank() && !dedicatedKey.equals("******")) return dedicatedKey;

        // 2. First active pool key for this provider
        try {
            List<AiApiKey> poolKeys = keyRepository.findByDeletedFalseOrderByPriorityAsc();
            return poolKeys.stream()
                    .filter(k -> k.isActive() && pKey.equalsIgnoreCase(k.getProvider() != null ? k.getProvider() : "google"))
                    .map(AiApiKey::getApiKey)
                    .filter(k -> k != null && !k.isBlank())
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) { /* ignore */ }

        // 3. Legacy global key (Gemini only)
        if ("google".equals(pKey)) {
            String globalKey = s.getOrDefault("ai_api_key", "");
            if (!globalKey.isBlank() && !globalKey.equals("******")) return globalKey;
            return fallbackApiKey;
        }
        return null;
    }

    /** Resolve model for a specific provider — per-provider setting > pool key model > provider default */
    private String resolveModelForProvider(String provider) {
        Map<String, String> s = getAiSettings();
        String pKey = provider == null ? "google" : provider.toLowerCase();

        // 1. Per-provider explicit model setting
        String perProviderModel = s.getOrDefault("ai_" + pKey + "_model", "");
        if (!perProviderModel.isBlank()) return perProviderModel;

        // 2. First active pool key for this provider has a model
        try {
            List<AiApiKey> poolKeys = keyRepository.findByDeletedFalseOrderByPriorityAsc();
            Optional<String> poolModel = poolKeys.stream()
                    .filter(k -> k.isActive() && pKey.equalsIgnoreCase(k.getProvider() != null ? k.getProvider() : "google"))
                    .map(AiApiKey::getModel)
                    .filter(m -> m != null && !m.isBlank())
                    .findFirst();
            if (poolModel.isPresent()) return poolModel.get();
        } catch (Exception e) { /* ignore */ }

        // 3. Provider-specific defaults (NEVER use global ai_model for non-Google providers!)
        if (!"google".equals(pKey)) {
            return switch (pKey) {
                case "openai"      -> "gpt-4o-mini";
                case "anthropic"   -> "claude-3-5-haiku-20241022";
                case "openrouter"  -> "google/gemini-flash-1.5";
                case "agentrouter" -> "gpt-5";
                default            -> "gpt-4o-mini";
            };
        }

        // 4. For Google only — use global model or Spring fallback
        String globalModel = s.getOrDefault("ai_model", "");
        if (!globalModel.isBlank()) return globalModel;
        return fallbackModel;
    }

    /** Resolve base URL for a specific provider */
    private String resolveBaseUrlForProvider(String provider) {
        if (provider == null || provider.isBlank() || provider.equalsIgnoreCase("Google")) return "";
        Map<String, String> s = getAiSettings();
        String pKey = provider.toLowerCase();
        String perProviderUrl = s.getOrDefault("ai_" + pKey + "_base_url", "");
        if (!perProviderUrl.isBlank()) return perProviderUrl;
        // Default base URLs per provider
        return switch (pKey) {
            case "openai"      -> "https://api.openai.com/v1";
            case "anthropic"   -> "https://api.anthropic.com/v1";
            case "openrouter"  -> "https://openrouter.ai/api/v1";
            case "agentrouter" -> "https://agentrouter.org/v1";
            default            -> s.getOrDefault("ai_base_url", "");
        };
    }

    /** Resolve active provider from settings */
    private String resolveProvider() {
        Map<String, String> s = getAiSettings();
        // ai_active_provider = which tab was set as active
        String active = s.getOrDefault("ai_active_provider", "");
        if (!active.isBlank()) return active;
        return s.getOrDefault("ai_provider", "Google");
    }

    // ─── Legacy single-arg resolvers (kept for backward compat) ─────────────
    private String resolveApiKey() { return resolveApiKeyForProvider(resolveProvider()); }
    private String resolveModel()  { return resolveModelForProvider(resolveProvider()); }
    private String resolveBaseUrl(){ return resolveBaseUrlForProvider(resolveProvider()); }

    private boolean isOpenAICompatible(String provider) {
        if (provider == null) return false;
        return provider.equalsIgnoreCase("OpenAI")
                || provider.equalsIgnoreCase("Anthropic")
                || provider.equalsIgnoreCase("AgentRouter")
                || provider.equalsIgnoreCase("OpenRouter")
                || provider.equalsIgnoreCase("Custom");
    }
}
