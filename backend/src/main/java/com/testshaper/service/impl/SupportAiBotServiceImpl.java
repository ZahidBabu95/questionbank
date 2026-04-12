package com.testshaper.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.entity.GeneralSetting;
import com.testshaper.entity.SupportTicket;
import com.testshaper.entity.TicketMessage;
import com.testshaper.repository.SupportTicketRepository;
import com.testshaper.repository.TicketMessageRepository;
import com.testshaper.service.AiKnowledgeBaseService;
import com.testshaper.service.GeneralSettingService;
import com.testshaper.service.SupportAiBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class SupportAiBotServiceImpl implements SupportAiBotService {

    private final SupportTicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;
    private final GeneralSettingService generalSettingService;
    private final AiKnowledgeBaseService knowledgeBaseService;
    private final com.testshaper.repository.AppNotificationRepository notificationRepo;


    @Value("${app.gemini.api-key:}")
    private String fallbackApiKey;

    @Value("${app.gemini.model:gemini-2.5-flash}")
    private String fallbackModel;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    private static final String DEFAULT_OPENAI_URL = "https://openrouter.ai/api/v1/chat/completions";

    private Map<String, String> getAiSettings() {
        try {
            return generalSettingService.getGlobalSettings(GeneralSetting.SettingCategory.AI);
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String getApiKey() {
        String dbKey = getAiSettings().getOrDefault("ai_api_key", "");
        if (!dbKey.isBlank() && !dbKey.equals("******")) return dbKey;
        return fallbackApiKey;
    }

    private String getModel() {
        String dbModel = getAiSettings().getOrDefault("ai_model", "");
        if (!dbModel.isBlank()) return dbModel;
        return fallbackModel;
    }

    private String getProvider() {
        return getAiSettings().getOrDefault("ai_provider", "Google");
    }

    @Async
    @Override
    @Transactional
    public void processNewTicket(SupportTicket ticket, String initialMessage) {
        try {
            String apiKey = getApiKey();
            if (apiKey == null || apiKey.isBlank()) {
                log.warn("AI Support Bot skipped: No API Key configured.");
                return;
            }

            String provider = getProvider();
            String model = getModel();
            
            // 1. Fetch dynamic Platform Knowledge Base Context
            String dynamicContext = getKnowledgeBaseContext();
            
            // 2. Build the System Prompt
            String prompt = buildPrompt(ticket, initialMessage, dynamicContext);
            String aiResponseText = "";

            if (provider.equalsIgnoreCase("OpenAI") || provider.equalsIgnoreCase("OpenRouter") || provider.equalsIgnoreCase("AgentRouter")) {
                aiResponseText = callOpenAICompatibleApi(prompt, apiKey, model);

            } else {
                aiResponseText = callGeminiApi(prompt, apiKey, model);
            }

            handleAiResponse(ticket, aiResponseText);

        } catch (Exception e) {
            log.error("AI Support Bot failed to process ticket ID: {}", ticket.getId(), e);
        }
    }

    private String getKnowledgeBaseContext() {
        try {
            return knowledgeBaseService.getActiveKnowledge().stream()
                    .map(kb -> "- " + kb.getTitle() + ":\n" + kb.getContent() + "\n")
                    .collect(java.util.stream.Collectors.joining("\n"));
        } catch (Exception e) {
            log.error("Failed to load AI knowledge base context", e);
            return "";
        }
    }

    private String buildPrompt(SupportTicket ticket, String message, String dynamicContext) {
        return """
            You are 'QuestionShaper AI Edu-Assistant', an expert Bangladeshi school/college Teacher and Problem Solver.
            Your role is to help Students and Teachers by clearing academic doubts, explaining subject topics, and solving their educational problems with step-by-step clarity.
            
            --- CURRICULUM & KNOWLEDGE BASE ---
            (These are the Textbooks, Guidebooks, and Syllabuses uploaded to our platform)
            %s
            -------------------------------
            
            User's Class/Category Context: %s
            Subject/Topic: %s
            User's Question/Doubt: "%s"
            
            RULES & TONE (Act as a Teacher):
            1. PRIORITY RULE: Your absolute FIRST priority must be to find the answer or explanation from the 'CURRICULUM & KNOWLEDGE BASE' provided above. You must base your answer on the textbooks/guidebooks uploaded here.
            2. If and ONLY if the answer cannot be found in the provided Curriculum & Knowledge Base, you may use your own general knowledge to deduce and explain the topic, keeping it strictly relevant to the context.
            3. Greet the student or teacher politely (e.g., "হ্যালো!" or "প্রিয় শিক্ষার্থী/শিক্ষক,").
            4. If the user asks a subject-related question, explain the concept clearly, step by step. Show derivations or formulas for Math/Science.
            5. Use easy-to-understand Bengali (or English if the question is in English). Focus strictly on the academic problem.
            6. If the question is about how to use the "QuestionShaper" software/platform, answer it strictly using the 'CURRICULUM & KNOWLEDGE BASE'.
            7. If the user asks about a bug or payment issue, politely say you are forwarding this to the Admin.
            
            ACTION TAG RULES (Mandatory):
            - If you successfully explained the topic or solved the doubt, end your message with exactly: <ACTION:RESOLVED>
            - If it requires a human Admin (bug/payment/system issue), end your message with exactly: <ACTION:OPEN>
            
            Write EXACTLY your reply message followed by the Action tag. Do not use markdown code blocks (```) around your response.
            """.formatted(dynamicContext.isBlank() ? "No specific knowledge available." : dynamicContext, ticket.getCategory().name(), ticket.getSubject(), message);
    }


    private void handleAiResponse(SupportTicket rawTicket, String aiResponse) {
        // Re-fetch ticket to ensure we're inside the async transaction properly managed
        SupportTicket ticket = ticketRepository.findById(rawTicket.getId()).orElse(null);
        if (ticket == null) return;

        boolean resolveAction = aiResponse.contains("<ACTION:RESOLVED>");
        String cleanMessage = aiResponse.replaceAll("<ACTION:(OPEN|RESOLVED)>", "").trim();

        TicketMessage aiMsg = new TicketMessage();
        aiMsg.setTicket(ticket);
        aiMsg.setSenderType(TicketMessage.SenderType.AI);
        aiMsg.setMessage(cleanMessage);
        
        messageRepository.save(aiMsg);

        ticket.setAiHandled(true);
        if (resolveAction) {
            ticket.setStatus(SupportTicket.TicketStatus.RESOLVED);
            
            // Optionally, add a system message clarifying closure
            TicketMessage sysMsg = new TicketMessage();
            sysMsg.setTicket(ticket);
            sysMsg.setSenderType(TicketMessage.SenderType.SYSTEM);
            sysMsg.setMessage("Ticket was marked as RESOLVED by AI. If you still need help, reply to reopen the ticket.");
            messageRepository.save(sysMsg);
        }
        
        ticketRepository.save(ticket);
        
        // Notify the user
        com.testshaper.entity.AppNotification aiNotif = new com.testshaper.entity.AppNotification();
        aiNotif.setUser(ticket.getUser());
        aiNotif.setTitle("AI Support Bot Responded");
        aiNotif.setMessage(resolveAction ? "AI resolved your ticket: " + ticket.getSubject() : "AI replied to your ticket: " + ticket.getSubject());
        aiNotif.setType(com.testshaper.entity.AppNotification.NotificationType.SYSTEM);
        aiNotif.setRelatedEntityId(ticket.getId().toString());
        notificationRepo.save(aiNotif);

        log.info("AI Support Bot processed ticket {}; Action: {}", ticket.getId(), resolveAction ? "RESOLVED" : "LEFT OPEN");
    }

    private String callGeminiApi(String prompt, String apiKey, String model) throws Exception {
        String url = String.format(GEMINI_API_URL, model, apiKey);

        Map<String, Object> content = Map.of("parts", List.of(Map.of("text", prompt)));
        Map<String, Object> requestBody = Map.of("contents", List.of(content));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
    }

    private String callOpenAICompatibleApi(String prompt, String apiKey, String model) throws Exception {
        String baseUrl = getAiSettings().getOrDefault("ai_base_url", DEFAULT_OPENAI_URL);
        String url = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", List.of(Map.of("role", "user", "content", prompt)));
        requestBody.put("temperature", 0.3);
        requestBody.put("max_tokens", 1024);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("choices").get(0).path("message").path("content").asText();
    }
}
