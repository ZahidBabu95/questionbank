package com.testshaper.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.entity.AiApiKey;
import com.testshaper.entity.AiKnowledgeBase;
import com.testshaper.entity.GeneralSetting;
import com.testshaper.repository.AiKnowledgeBaseRepository;
import com.testshaper.service.AIQuestionService;
import com.testshaper.service.ApiKeyRotationService;
import com.testshaper.service.GeneralSettingService;
import com.testshaper.service.QuestionFeedbackLearningService;
import com.testshaper.service.AiBillingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class AIQuestionServiceImpl implements AIQuestionService {

    private final GeneralSettingService generalSettingService;
    private final ApiKeyRotationService keyRotationService;
    private final QuestionFeedbackLearningService feedbackLearningService;
    private final AiKnowledgeBaseRepository knowledgeBaseRepository;
    private final AiBillingService aiBillingService;

    @Value("${app.gemini.api-key:}")
    private String fallbackApiKey;

    @Value("${app.gemini.model:gemini-2.5-flash}")
    private String fallbackModel;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_UNQUOTED_CONTROL_CHARS, true)
            .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER, true);
    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30_000);
        factory.setReadTimeout(300_000); // 5 min for large PDF chunks
        return new RestTemplate(factory);
    }

    // Gemini native
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    // OpenAI-compatible (AgentRouter, OpenRouter, etc.)
    private static final String DEFAULT_OPENAI_URL = "https://openrouter.ai/api/v1";

    // ═══════════════════ Settings ═══════════════════

    private Map<String, String> getAiSettings() {
        try {
            return generalSettingService.getGlobalSettings(GeneralSetting.SettingCategory.AI);
        } catch (Exception e) {
            log.debug("Could not load AI settings: {}", e.getMessage());
            return Map.of();
        }
    }

    private String getProvider() {
        return getAiSettings().getOrDefault("ai_provider", "Google");
    }

    // Thread-safe: each request thread tracks its own pool key
    private final ThreadLocal<AiApiKey> currentKeyEntityThreadLocal = new ThreadLocal<>();

    private String getApiKey() {
        Map<String, String> settings = getAiSettings();
        String billingMode = settings.getOrDefault("ai_billing_mode", "FREE_POOL");

        // Try multi-key rotation pool first if in FREE_POOL mode
        if ("FREE_POOL".equals(billingMode)) {
            try {
                AiApiKey key = keyRotationService.getNextAvailableKey();
                if (key != null && key.getApiKey() != null && !key.getApiKey().isBlank()) {
                    currentKeyEntityThreadLocal.set(key);
                    log.info("Using pool key '{}' [provider={}] (round-robin)",
                            key.getKeyName(), key.getProvider());
                    return key.getApiKey();
                }
            } catch (Exception e) {
                log.debug("Key rotation fallback: {}", e.getMessage());
            }
        }

        currentKeyEntityThreadLocal.remove();
        // Fallback or Dedicated Paid Mode: single ai_api_key from global settings
        String dbKey = settings.getOrDefault("ai_api_key", "");
        if (!dbKey.isBlank() && !dbKey.equals("******")) return dbKey;
        return fallbackApiKey;
    }

    /** Returns the pool key entity for this thread (null if using global key) */
    private AiApiKey getCurrentKeyEntity() {
        return currentKeyEntityThreadLocal.get();
    }

    private String getModel() {
        String dbModel = getAiSettings().getOrDefault("ai_model", "");
        if (!dbModel.isBlank()) return dbModel;
        return fallbackModel;
    }

    private String getBaseUrl() {
        String dbUrl = getAiSettings().getOrDefault("ai_base_url", "");
        if (!dbUrl.isBlank()) return dbUrl;
        return DEFAULT_OPENAI_URL;
    }

    /** Provider: use pool key's provider if set, else fall back to global setting */
    private String getEffectiveProvider() {
        AiApiKey key = getCurrentKeyEntity();
        if (key != null && key.getProvider() != null && !key.getProvider().isBlank()) {
            return key.getProvider();
        }
        return getProvider();
    }

    /** Base URL: use pool key's baseUrl if set, else fall back to global setting */
    private String getEffectiveBaseUrl() {
        AiApiKey key = getCurrentKeyEntity();
        if (key != null && key.getBaseUrl() != null && !key.getBaseUrl().isBlank()) {
            return key.getBaseUrl();
        }
        return getBaseUrl();
    }

    /** Model: use pool key's model if set, else fall back to global setting */
    private String getEffectiveModel() {
        AiApiKey key = getCurrentKeyEntity();
        if (key != null && key.getModel() != null && !key.getModel().isBlank()) {
            return key.getModel();
        }
        return getModel();
    }

    // ═══════════════════ Public API ═══════════════════

    @Override
    public List<Map<String, Object>> scrapeQuestions(MultipartFile file, String questionType) throws Exception {
        String apiKey = getApiKey();
        String model = getEffectiveModel();
        String provider = getEffectiveProvider();
        String baseUrl = getEffectiveBaseUrl();
        validateApiKey(apiKey);

        String prompt = buildScrapePrompt(questionType);

        String responseJson;
        if (isOpenAICompatible(provider)) {
            String base64Data = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType();
            responseJson = callOpenAICompatibleApi(prompt, base64Data, mimeType, apiKey, model, baseUrl);
        } else {
            String base64Data = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType();
            Map<String, Object> requestBody = buildGeminiRequest(prompt, base64Data, mimeType);
            responseJson = callGeminiApi(requestBody, apiKey, model);
        }

        return parseQuestionsFromResponse(responseJson);
    }

    @Override
    public Map<String, Object> scrapeWithMetadata(MultipartFile file, String questionType) throws Exception {
        return scrapeWithMetadata(file, questionType, Map.of());
    }

    @Override
    public Map<String, Object> scrapeWithMetadata(MultipartFile file, String questionType,
                                                   Map<String, String> knownContext) throws Exception {
        String apiKey = getApiKey();
        String model = getEffectiveModel();
        String provider = getEffectiveProvider();
        String baseUrl = getEffectiveBaseUrl();
        validateApiKey(apiKey);

        Map<String, String> ctx = (knownContext != null) ? knownContext : Map.of();
        String prompt = buildScrapePrompt(questionType, ctx);

        String responseJson;
        if (isOpenAICompatible(provider)) {
            String base64Data = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType();
            responseJson = callOpenAICompatibleApi(prompt, base64Data, mimeType, apiKey, model, baseUrl);
        } else {
            String base64Data = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType();
            Map<String, Object> requestBody = buildGeminiRequest(prompt, base64Data, mimeType);
            responseJson = callGeminiApi(requestBody, apiKey, model);
        }

        Map<String, Object> result = parseFullResponse(responseJson);

        // Merge: known context fields override/fill missing AI-detected fields
        if (!ctx.isEmpty()) {
            @SuppressWarnings("unchecked")
            Map<String, Object> aiMeta = (Map<String, Object>) result.computeIfAbsent("metadata", k -> new LinkedHashMap<>());
            ctx.forEach((k, v) -> {
                if (v != null && !v.isBlank()) {
                    Object existing = aiMeta.get(k);
                    // Only overwrite if AI left the field blank
                    if (existing == null || existing.toString().isBlank()) {
                        aiMeta.put(k, v);
                    }
                }
            });
        }

        return result;
    }

    @Override
    public Map<String, Object> scrapeWithMetadataAndText(MultipartFile file, String extractedText, String questionType,
                                                         Map<String, String> knownContext) throws Exception {
        String apiKey = getApiKey();
        String model = getEffectiveModel();
        String provider = getEffectiveProvider();
        String baseUrl = getEffectiveBaseUrl();
        validateApiKey(apiKey);

        Map<String, String> ctx = (knownContext != null) ? knownContext : Map.of();
        String prompt = buildScrapePrompt(questionType, ctx);
        
        if (extractedText != null && !extractedText.isBlank()) {
            prompt += "\n\n=== EXTRACTED PDF TEXT & ATTACHMENTS ===\n" + extractedText + "\n=== END EXTRACTED TEXT ===\n";
            prompt += "\nINSTRUCTION: The above block contains the text and any ATTACHED IMAGE URLs from the PDF.";
            prompt += "\nCRITICAL RULE FOR IMAGES (IMAGE POSITION FIXER): You MUST intelligently map ANY attached image URLs to their EXACT logical position.";
            prompt += "\n- Analyze the context (e.g., 'নিচের চিত্রটি লক্ষ করো', 'চিত্রে', or visual cues like tables/graphs).";
            prompt += "\n- Embed the image directly into `stimulus`, `questionText`, or `options[n].text` using Markdown format: `![চিত্র](image_url_here)`.";
            prompt += "\n- DO NOT blindly dump images into the first question. Map EACH image to the SPECIFIC question or option it belongs to.";
            prompt += "\n- If an image is a general stimulus for multiple questions, put it in the `stimulus` field for ALL those related questions.";
        }

        String responseJson;
        if (isOpenAICompatible(provider)) {
            String base64Data = null;
            String mimeType = null;
            if (file != null && !file.isEmpty()) {
                base64Data = Base64.getEncoder().encodeToString(file.getBytes());
                mimeType = file.getContentType();
            }
            responseJson = callOpenAICompatibleApi(prompt, base64Data, mimeType, apiKey, model, baseUrl);
        } else {
            String base64Data = null;
            String mimeType = null;
            if (file != null && !file.isEmpty()) {
                base64Data = Base64.getEncoder().encodeToString(file.getBytes());
                mimeType = file.getContentType();
            }
            Map<String, Object> requestBody = buildGeminiRequest(prompt, base64Data, mimeType);
            responseJson = callGeminiApi(requestBody, apiKey, model);
        }

        Map<String, Object> result = parseFullResponse(responseJson);

        // Merge: known context fields override/fill missing AI-detected fields
        if (!ctx.isEmpty()) {
            @SuppressWarnings("unchecked")
            Map<String, Object> aiMeta = (Map<String, Object>) result.computeIfAbsent("metadata", k -> new LinkedHashMap<>());
            ctx.forEach((k, v) -> {
                if (v != null && !v.isBlank()) {
                    Object existing = aiMeta.get(k);
                    // Only overwrite if AI left the field blank
                    if (existing == null || existing.toString().isBlank()) {
                        aiMeta.put(k, v);
                    }
                }
            });
        }

        return result;
    }

    @Override
    public List<Map<String, Object>> generateQuestions(MultipartFile file, String topic, String questionType,
                                                       int count, String difficulty, String bloomLevel) throws Exception {
        String apiKey = getApiKey();
        String model = getEffectiveModel();
        String provider = getEffectiveProvider();
        String baseUrl = getEffectiveBaseUrl();
        validateApiKey(apiKey);

        // 🔄 Feedback Learning Loop: inject approved/rejected examples as context
        String learningContext = "";
        try {
            learningContext = feedbackLearningService.buildLearningContext(topic, "", 5);
        } catch (Exception ex) {
            log.debug("Could not load learning context: {}", ex.getMessage());
        }

        String prompt = buildGeneratePrompt(topic, questionType, count, difficulty, bloomLevel, learningContext);

        String responseJson;
        if (isOpenAICompatible(provider)) {
            String base64Data = null;
            String mimeType = null;
            if (file != null && !file.isEmpty()) {
                base64Data = Base64.getEncoder().encodeToString(file.getBytes());
                mimeType = file.getContentType();
            }
            responseJson = callOpenAICompatibleApi(prompt, base64Data, mimeType, apiKey, model, baseUrl);
        } else {
            Map<String, Object> requestBody;
            if (file != null && !file.isEmpty()) {
                String base64Data = Base64.getEncoder().encodeToString(file.getBytes());
                String mimeType = file.getContentType();
                requestBody = buildGeminiRequest(prompt, base64Data, mimeType);
            } else {
                requestBody = buildGeminiRequest(prompt, null, null);
            }
            responseJson = callGeminiApi(requestBody, apiKey, model);
        }

        return parseQuestionsFromResponse(responseJson);
    }

    @Override
    public String generateRawCompletion(String prompt, MultipartFile file) throws Exception {
        String apiKey = getApiKey();
        String model = getEffectiveModel();
        String provider = getEffectiveProvider();
        String baseUrl = getEffectiveBaseUrl();
        validateApiKey(apiKey);

        String responseJson;
        if (isOpenAICompatible(provider)) {
            String base64Data = null;
            String mimeType = null;
            if (file != null && !file.isEmpty()) {
                base64Data = Base64.getEncoder().encodeToString(file.getBytes());
                mimeType = file.getContentType();
            }
            responseJson = callOpenAICompatibleApi(prompt, base64Data, mimeType, apiKey, model, baseUrl);
        } else {
            Map<String, Object> requestBody;
            if (file != null && !file.isEmpty()) {
                String base64Data = Base64.getEncoder().encodeToString(file.getBytes());
                String mimeType = file.getContentType();
                requestBody = buildGeminiRequest(prompt, base64Data, mimeType);
            } else {
                requestBody = buildGeminiRequest(prompt, null, null);
            }
            responseJson = callGeminiApi(requestBody, apiKey, model);
        }
        
        // Track the usage directly
        int inTokens = 150, outTokens = 100;
        Map<String, Integer> usage = tokenUsageLocal.get();
        if (usage != null) {
            inTokens = usage.getOrDefault("inputTokens", inTokens);
            outTokens = usage.getOrDefault("outputTokens", outTokens);
            tokenUsageLocal.remove();
        }
        
        long timeTaken = 1500L; // placeholder since there is no timer in this method unless we wrap it
        String module = prompt.contains("Copilot") ? "CHATBOT" : "KNOWLEDGE_HUB";
        aiBillingService.recordSystemAiUsage(module, "generateRawCompletion", inTokens, outTokens, timeTaken, true, null);

        // Strip markdown backticks if any
        return cleanResponse(responseJson);
    }

    // ═══════════════════ Provider Check ═══════════════════

    private boolean isOpenAICompatible(String provider) {
        if (provider == null) return false;
        return provider.equalsIgnoreCase("OpenAI")
                || provider.equalsIgnoreCase("Anthropic")
                || provider.equalsIgnoreCase("AgentRouter")
                || provider.equalsIgnoreCase("OpenRouter")
                || provider.equalsIgnoreCase("Custom");
    }

    // ═══════════════════ Validation ═══════════════════

    private void validateApiKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank() || "YOUR_GEMINI_API_KEY_HERE".equals(apiKey)) {
            throw new RuntimeException("API Key সেট করা হয়নি। Settings → AI Config থেকে API Key যুক্ত করুন।");
        }
    }

    // ═══════════════════ Prompts ═══════════════════

    private String buildScrapePrompt(String questionType) {
        return buildScrapePrompt(questionType, Map.of());
    }

    private String buildScrapePrompt(String questionType, Map<String, String> knownContext) {
        // Build known context section to reduce AI token usage
        StringBuilder ctxSection = new StringBuilder();
        if (knownContext != null && !knownContext.isEmpty()) {
            ctxSection.append("\nKNOWN CONTEXT (already confirmed by user — do NOT re-detect these):\n");
            String cn = knownContext.getOrDefault("className", "");
            String sub = knownContext.getOrDefault("subject", "");
            String ch  = knownContext.getOrDefault("chapter", "");
            String tp  = knownContext.getOrDefault("topic", "");
            String lvl = knownContext.getOrDefault("classLevel", "");
            if (!cn.isBlank())  ctxSection.append("  - className: ").append(cn).append("\n");
            if (!lvl.isBlank()) ctxSection.append("  - classLevel: ").append(lvl).append("\n");
            if (!sub.isBlank()) ctxSection.append("  - subject: ").append(sub).append("\n");
            if (!ch.isBlank())  ctxSection.append("  - chapter: ").append(ch).append("\n");
            if (!tp.isBlank())  ctxSection.append("  - topic: ").append(tp).append("\n");
            ctxSection.append("Use the above values directly in metadata JSON. Only detect fields NOT listed above.\n");
        }

        // ★ CURRICULUM RULE INJECTION: Look up a saved scraping rule for this subject
        StringBuilder curriculumRuleSection = new StringBuilder();
        try {
            String subject = knownContext != null ? knownContext.getOrDefault("subject", "") : "";
            if (!subject.isBlank()) {
                String subjectTag = "RULE_FOR_" + subject.replaceAll("\\s", "");
                List<AiKnowledgeBase> rules = knowledgeBaseRepository.findActiveCurriculumRules(subjectTag);
                if (!rules.isEmpty()) {
                    AiKnowledgeBase rule = rules.get(0);
                    curriculumRuleSection.append("\n═══════ CURRICULUM PARSING RULE (set by admin) ═══════\n");
                    curriculumRuleSection.append("The admin has configured the following expected question format for this subject.\n");
                    curriculumRuleSection.append("Use this as the EXPECTED PATTERN when extracting questions. Follow the question types, marks, and structure closely.\n");
                    curriculumRuleSection.append("RULE CONTENT:\n").append(rule.getContent()).append("\n");
                    curriculumRuleSection.append("════════════════════════════════════════════════════\n");
                    log.info("✅ Curriculum Rule '{}' injected into prompt for subject: {}", rule.getTitle(), subject);
                }
            }
        } catch (Exception e) {
            log.warn("Could not load curriculum rule for prompt (non-fatal): {}", e.getMessage());
        }

        String specificRules = "";
        String schema = "";

        if ("CQ".equalsIgnoreCase(questionType) || "SHORT".equalsIgnoreCase(questionType)) {
            specificRules = """
                1. Extract EVERY question. This is a descriptive/creative question.
                2. Do NOT create or look for MCQ options. Leave 'options' array empty or omit it.
                3. Include stimulus/uddipok (উদ্দীপক) if present. If sub-questions (ক, খ, গ, ঘ) share one stimulus, combine them or extract them logically.
                """;
            schema = """
                {"metadata":{"className":"","classLevel":"","subject":"","chapter":"","chapterNo":"","topic":"","sourceUrl":""},"questions":[{"questionText":"text WITHOUT serial number","sourcePage":1,"stimulus":"দিয়ে উদ্দীপক","imageUrl":"","options":[],"correctAnswer":"short answer or empty","bloomLevel":"","difficulty":"","explanation":"","source":""}]}
                """;
        } else {
            specificRules = """
                1. Extract EVERY question. For regular MCQ: extract question text, exactly 4 options (ক/খ/গ/ঘ), and the correct answer if visible.
            2. For Multiple Completion MCQ (বহুপদী সমাপ্তিসূচক: questions with i, ii, iii statements):
               - Set `mcqType` to "MULTIPLE_COMPLETION"
               - Put the statements (i, ii, iii) in the `statements` array
               - Options usually are combinations like "i ও ii", "i ও iii" etc.
            3. If the correct answer is explicitly marked, set isCorrect: true for that option, and write its full text in correctAnswer.
            """;
        schema = """
            {"metadata":{"className":"","classLevel":"","subject":"","chapter":"","chapterNo":"","topic":"","sourceUrl":""},"questions":[{"questionText":"text WITHOUT serial number","sourcePage":1,"mcqType":"SIMPLE or MULTIPLE_COMPLETION","statements":["i. statement 1", "ii. statement 2"],"stimulus":"","imageUrl":"","options":[{"label":"ক","text":"","isCorrect":false}],"correctAnswer":"","bloomLevel":"","difficulty":"","explanation":"বাংলায় সংক্ষিপ্ত ব্যাখ্যা","source":""}]}
            """;
    }

        String customPromptInjection = "";
        if (knownContext != null && knownContext.containsKey("customPrompt")) {
            String cp = knownContext.get("customPrompt");
            if (cp != null && !cp.isBlank()) {
                customPromptInjection = "\n\n═══════ USER ADVANCED INSTRUCTIONS (MUST FOLLOW) ═══════\n" +
                                        cp +
                                        "\n════════════════════════════════════════════════════════\n";
            }
        }

    return """
        You are an expert Bangladeshi education data parser. Extract ALL questions from the document.
        """ + customPromptInjection + """
        
        RULES:
        """ + specificRules + """
        3. REMOVE serial numbers from question text (e.g. "৯. রাজা" -> "রাজা")
        4. Preserve original text exactly as-is. For ANY mathematical equations, formulas, or scientific symbols, you MUST format them in LaTeX notation within `$$...$$` (block) or `$...$` (inline).
        5. Set bloomLevel: KNOWLEDGE|COMPREHENSION|APPLICATION|HIGHER_ORDER
        6. Set difficulty: EASY|MEDIUM|HARD
        7. Write explanation in BANGLA only. Keep it short.
        8. Detect metadata fields if available.
        9. CRITICAL RULE FOR IMAGES (IMAGE POSITION FIXER): You MUST intelligently map ANY attached image URLs to their EXACT logical position.
           - Analyze the context (e.g., "নিচের চিত্রটি লক্ষ করো", "চিত্রে", or visual cues like tables/graphs).
           - Embed the image directly into `stimulus`, `questionText`, or `options[n].text` using Markdown format: `![চিত্র](image_url_here)`.
           - DO NOT blindly dump images into the first question. Map EACH image to the SPECIFIC question or option it belongs to.
           - If an image is a general stimulus for multiple questions, put it in the `stimulus` field for ALL those related questions.
           - Additionally, keep the image URL in the `imageUrl` field (if applicable).
        10. Determine the exact PAGE NUMBER of the original document where this question is located. Set `sourcePage` to that page number (integer). If unknown or if it's a single image, set to 1.
        """ + ctxSection + curriculumRuleSection + """

            Question Type Target: """ + questionType + """

            RESPOND EXACTLY with this JSON structure (and absolutely no markdown formatting or extra text outside JSON):
            """ + schema;
    }

    private String buildGeneratePrompt(String topic, String questionType, int count, String difficulty, String bloomLevel, String learningContext) {
        String difficultyInstruction = "MIXED".equals(difficulty) ? "mix of EASY, MEDIUM, and HARD" : difficulty;
        String bloomInstruction = "MIXED".equals(bloomLevel) ? "mix of KNOWLEDGE, COMPREHENSION, APPLICATION, and HIGHER_ORDER" : bloomLevel;

        String learningSection = "";
        if (learningContext != null && !learningContext.isBlank()) {
            learningSection = """

            ═══════ FEEDBACK LEARNING (পূর্ববর্তী অভিজ্ঞতা থেকে শিখুন) ═══════
            নিচে আগে APPROVED (ভালো) এবং REJECTED (ভুল) প্রশ্নের উদাহরণ দেওয়া হয়েছে।
            APPROVED প্রশ্নগুলোর মতো মান বজায় রাখুন।
            REJECTED প্রশ্নগুলোর ভুলগুলো পুনরায় করবেন না।
            """ + learningContext;
        }

        return """
            You are an expert Bangladeshi education question generator following NCTB curriculum standards.

            TASK: Generate %d %s questions about the following topic.

            TOPIC/CONTENT: %s

            If an image/PDF is attached, use it as the source material to generate questions.

            RULES:
            1. Generate questions in Bengali (Bangla) language
            2. Follow Bangladesh HSC/SSC exam patterns
            3. Difficulty level: %s
            4. Bloom's taxonomy level: %s
            5. For MCQ: create 4 options (ক, খ, গ, ঘ), exactly one correct.
            6. For Multiple Completion MCQ (বহুপদী সমাপ্তিসূচক): 
               - Set `mcqType` to "MULTIPLE_COMPLETION"
               - Put the statements (i. statement 1, ii. statement 2, iii. statement 3) in the `statements` array
               - Options are combinations like "i ও ii", "i ও iii" etc.
            7. Each distractor (wrong option) must be plausible
            8. Write ALL explanations in BANGLA (বাংলা) language ONLY. Do NOT write in English.
            9. Make questions factually accurate and educationally valuable
            10. Vary the questioning style (direct, negative, scenario-based)
            %s

            RESPOND ONLY with a valid JSON array. No markdown, no explanation. Each element:
            {
              "questionText": "question in Bangla",
              "mcqType": "SIMPLE or MULTIPLE_COMPLETION",
              "statements": ["i. statement 1", "ii. statement 2"],
              "stimulus": "stimulus if applicable, else empty string",
              "options": [
                {"label": "ক", "text": "option text", "isCorrect": true/false},
                {"label": "খ", "text": "option text", "isCorrect": true/false},
                {"label": "গ", "text": "option text", "isCorrect": true/false},
                {"label": "ঘ", "text": "option text", "isCorrect": true/false}
              ],
              "correctAnswer": "the correct option's full text",
              "bloomLevel": "KNOWLEDGE|COMPREHENSION|APPLICATION|HIGHER_ORDER",
              "difficulty": "EASY|MEDIUM|HARD",
              "explanation": "ব্যাখ্যা বাংলায় লিখুন"
            }
            """.formatted(count, questionType, topic, difficultyInstruction, bloomInstruction, learningSection);
    }

    // ═══════════════════ Gemini Native API ═══════════════════

    private Map<String, Object> buildGeminiRequest(String prompt, String base64Data, String mimeType) {
        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", prompt));

        if (base64Data != null && mimeType != null) {
            parts.add(Map.of("inline_data", Map.of("mime_type", mimeType, "data", base64Data)));
        }

        Map<String, Object> content = Map.of("parts", parts);
        Map<String, Object> generationConfig = Map.of(
                "temperature", 0.3, "topP", 0.95, "maxOutputTokens", 65536,
                "responseMimeType", "application/json"
        );

        return Map.of("contents", List.of(content), "generationConfig", generationConfig);
    }

    public static final ThreadLocal<Map<String, Integer>> tokenUsageLocal = new ThreadLocal<>();

    private String callGeminiApi(Map<String, Object> requestBody, String apiKey, String model) throws Exception {
        int maxRetries = 3;
        String currentKey = apiKey;

        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                String url = String.format(GEMINI_API_URL, model, currentKey);
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);

                log.info("Calling Gemini API (attempt {}/{}) model: {}", attempt + 1, maxRetries + 1, model);
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

                if (!response.getStatusCode().is2xxSuccessful()) {
                    throw new RuntimeException("Gemini API call failed: " + response.getStatusCode());
                }

                JsonNode root = objectMapper.readTree(response.getBody());
                
                // Track Actual Token Cost
                JsonNode usage = root.path("usageMetadata");
                if (!usage.isMissingNode()) {
                    int inTokens = usage.path("promptTokenCount").asInt(0);
                    int outTokens = usage.path("candidatesTokenCount").asInt(0);
                    tokenUsageLocal.set(Map.of("inputTokens", inTokens, "outputTokens", outTokens));
                }

                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    JsonNode content = candidates.get(0).path("content").path("parts");
                    if (content.isArray() && content.size() > 0) {
                        // Record successful usage
                        AiApiKey activeKey = getCurrentKeyEntity();
                        if (activeKey != null) {
                            keyRotationService.recordUsage(activeKey.getId());
                        }
                        return content.get(0).path("text").asText();
                    }
                }
                throw new RuntimeException("Empty response from Gemini API");

            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                String errBody = e.getResponseBodyAsString();
                int statusCode = e.getStatusCode().value();
                
                if ((statusCode == 429 || statusCode == 500 || statusCode == 502 || statusCode == 503 || statusCode == 504) && attempt < maxRetries) {
                    // Parse retry delay from error
                    int waitSec = (statusCode >= 500) ? 10 : 30; // Shorter default wait for 5xx errors
                    try {
                        java.util.regex.Matcher m = java.util.regex.Pattern.compile("retry in (\\d+)").matcher(errBody);
                        if (m.find()) waitSec = Integer.parseInt(m.group(1)) + 5;
                    } catch (Exception ignored) {}

                    log.warn("Gemini API {} error hit. Waiting {}s before retry {}...", statusCode, waitSec, attempt + 2);

                    // Try rotating to another key from the Free Pool (Fallback) if it's a rate limit or quota issue
                    if (statusCode == 429 || errBody.contains("quota")) {
                        try {
                            String nextKey = keyRotationService.getNextApiKeyString();
                            if (nextKey != null && !nextKey.isBlank() && !nextKey.equals(currentKey)) {
                                currentKey = nextKey;
                                log.info("Rate limit hit. Rotating from current key to a Free Pool key (Fallback) for retry.");
                                waitSec = 5; // shorter wait when successfully switching keys
                            } else {
                                log.warn("No separate fallback Free Pool keys available to rotate to. Must wait {}s on current key...", waitSec);
                            }
                        } catch (Exception ex) {
                            log.warn("Could not fetch a fallback key. Must wait {}s...", waitSec);
                        }
                    }

                    Thread.sleep(waitSec * 1000L);
                    continue;
                }
                throw new RuntimeException(e.getStatusCode().value() + " " + e.getStatusText() + ": " + errBody);
            } catch (org.springframework.web.client.ResourceAccessException e) {
                if (attempt < maxRetries) {
                    log.warn("Gemini API network timeout/failure. Waiting 10s before retry {}...", attempt + 2);
                    Thread.sleep(10000L);
                    continue;
                }
                throw new RuntimeException("Network error connecting to Gemini API: " + e.getMessage());
            }
        }
        throw new RuntimeException("Max retries exceeded for Gemini API call");
    }

    // ═══════════════════ OpenAI-Compatible API (AgentRouter, OpenRouter, etc.) ═══════════════════

    private String callOpenAICompatibleApi(String prompt, String base64Data, String mimeType,
                                            String apiKey, String model, String baseUrl) throws Exception {
        // Ensure URL ends with /chat/completions
        String url = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";

        log.info("Calling OpenAI-compatible API: {} with model: {}", baseUrl, model);

        // Build messages
        List<Map<String, Object>> contentParts = new ArrayList<>();

        // Text content
        contentParts.add(Map.of("type", "text", "text", prompt));

        // Image content (if provided)
        if (base64Data != null && mimeType != null) {
            String dataUri = "data:" + mimeType + ";base64," + base64Data;
            contentParts.add(Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", dataUri)
            ));
        }

        Map<String, Object> userMessage = Map.of("role", "user", "content", contentParts);

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", List.of(userMessage));
        requestBody.put("temperature", 0.3);
        requestBody.put("max_tokens", 8192);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("API call failed: " + response.getStatusCode());
        }

        // Parse OpenAI-format response
        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode choices = root.path("choices");
        if (choices.isArray() && choices.size() > 0) {
            String text = choices.get(0).path("message").path("content").asText();
            if (!text.isBlank()) return text;
        }

        throw new RuntimeException("Empty response from API");
    }

    // ═══════════════════ Response Parser ═══════════════════

    private Map<String, Object> parseFullResponse(String responseText) {
        try {
            String cleaned = cleanResponse(responseText);
            JsonNode root = objectMapper.readTree(cleaned);

            Map<String, Object> result = new LinkedHashMap<>();

            if (root.isObject() && root.has("questions")) {
                // New format: {metadata: {...}, questions: [...]}
                if (root.has("metadata")) {
                    result.put("metadata", objectMapper.convertValue(root.get("metadata"),
                            new TypeReference<Map<String, Object>>() {}));
                }
                List<Map<String, Object>> questions = objectMapper.convertValue(root.get("questions"),
                        new TypeReference<>() {});
                for (int i = 0; i < questions.size(); i++) {
                    questions.get(i).put("id", i + 1);
                    questions.get(i).put("status", "ready");
                    questions.get(i).put("aiExplanation", true); // Mark as AI-generated
                }
                result.put("questions", questions);
            } else if (root.isArray()) {
                // Old format: plain array of questions
                List<Map<String, Object>> questions = objectMapper.readValue(cleaned, new TypeReference<>() {});
                for (int i = 0; i < questions.size(); i++) {
                    questions.get(i).put("id", i + 1);
                    questions.get(i).put("status", "ready");
                    questions.get(i).put("aiExplanation", true);
                }
                result.put("metadata", Map.of());
                result.put("questions", questions);
            } else {
                throw new RuntimeException("Unexpected AI response format");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> qs = (List<Map<String, Object>>) result.get("questions");
            // Post-process: strip serial numbers from question text
            for (Map<String, Object> q : qs) {
                String text = (String) q.get("questionText");
                if (text != null) {
                    q.put("questionText", stripSerialNumber(text));
                }
            }
            log.info("Parsed {} questions from AI response", qs.size());
            return result;
        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", responseText, e);
            throw new RuntimeException("AI response parsing failed. Please try again.");
        }
    }

    private List<Map<String, Object>> parseQuestionsFromResponse(String responseText) {
        Map<String, Object> full = parseFullResponse(responseText);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> questions = (List<Map<String, Object>>) full.get("questions");
        return questions;
    }

    private String cleanResponse(String responseText) {
        String cleaned = responseText.trim();
        // Remove thinking tags from Gemini 2.5 models
        if (cleaned.contains("<think>")) {
            int thinkEnd = cleaned.indexOf("</think>");
            if (thinkEnd > 0) {
                cleaned = cleaned.substring(thinkEnd + 8).trim();
            }
        }
        
        // Extract json between first {/[ and last }/]
        int firstBrace = cleaned.indexOf('{');
        int firstBracket = cleaned.indexOf('[');
        int startIndex = -1;
        if (firstBrace >= 0 && firstBracket >= 0) {
            startIndex = Math.min(firstBrace, firstBracket);
        } else if (firstBrace >= 0) {
            startIndex = firstBrace;
        } else if (firstBracket >= 0) {
            startIndex = firstBracket;
        }

        int lastBrace = cleaned.lastIndexOf('}');
        int lastBracket = cleaned.lastIndexOf(']');
        int endIndex = Math.max(lastBrace, lastBracket);

        if (startIndex >= 0 && endIndex > startIndex) {
            cleaned = cleaned.substring(startIndex, endIndex + 1);
        } else {
            // Fallback to old method
            if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
            else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
            if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length() - 3);
            cleaned = cleaned.trim();
        }

        // Repair truncated JSON: if response was cut off, try to recover partial data
        cleaned = repairTruncatedJson(cleaned);

        return cleaned;
    }

    /**
     * Attempts to repair truncated JSON by finding the last complete question object
     * and properly closing the JSON structure.
     */
    private String repairTruncatedJson(String json) {
        try {
            objectMapper.readTree(json);
            return json; // Valid JSON, no repair needed
        } catch (Exception e) {
            log.warn("JSON is incomplete/truncated, attempting repair...");
        }

        // Find the last complete question object by looking for the pattern: }, {
        // or },\n    { which indicates boundary between question objects
        int lastCompleteObj = -1;
        int braceDepth = 0;
        boolean inString = false;
        boolean escape = false;

        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (escape) { escape = false; continue; }
            if (c == '\\') { escape = true; continue; }
            if (c == '"') { inString = !inString; continue; }
            if (inString) continue;

            if (c == '{') braceDepth++;
            else if (c == '}') {
                braceDepth--;
                if (braceDepth == 2) { // depth 2 = end of a question object inside "questions" array
                    lastCompleteObj = i;
                }
            }
        }

        if (lastCompleteObj > 0) {
            String repaired = json.substring(0, lastCompleteObj + 1) + "]}";
            try {
                objectMapper.readTree(repaired);
                log.info("JSON repair successful! Recovered partial response.");
                return repaired;
            } catch (Exception e2) {
                log.warn("First repair attempt failed, trying alternative...");
            }
        }

        // Alternative: try to find last complete array element
        int lastBracket = json.lastIndexOf("}]");
        if (lastBracket > 0) {
            String repaired = json.substring(0, lastBracket + 2) + "}";
            try {
                objectMapper.readTree(repaired);
                log.info("JSON repair (alt) successful!");
                return repaired;
            } catch (Exception e3) {
                // fall through
            }
        }

        return json; // Return as-is, let caller handle the error
    }


    /**
     * Remove serial numbers from question text.
     * Handles Bangla and English serial number prefixes.
     */
    private String stripSerialNumber(String text) {
        if (text == null) return text;
        String result = text.trim();
        // Remove leading English digits followed by dot or bracket: 27. 9)
        result = result.replaceFirst("^\\d+[.)]\\s*", "");
        // Remove leading Bangla digits followed by dot/dari/bracket
        result = result.replaceFirst("^[\\u09E6-\\u09EF]+[.\\u09F7)]\\s*", "");
        return result.trim();
    }
}

