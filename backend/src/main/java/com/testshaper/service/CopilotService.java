package com.testshaper.service;

import com.testshaper.entity.CurriculumDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class CopilotService {

    private final VectorDatabaseService vectorDatabaseService;
    private final com.testshaper.service.AIQuestionService aiQuestionService;
    private final com.testshaper.repository.CurriculumDocumentRepository curriculumDocumentRepository;
    private final com.testshaper.repository.QuestionRepository questionRepository;
    private final com.testshaper.repository.ClassSubjectRepository classSubjectRepository;
    private final com.testshaper.repository.GeneralSettingRepository generalSettingRepository;
    private final ObjectMapper objectMapper;

    /**
     * Executes the RAG pipeline:
     * 1. Vector Search for related chunks.
     * 2. Prompts Gemini with extracted background context.
     * 3. Returns Markdown formatted answer.
     */
    public String askCopilot(String query, java.util.List<com.testshaper.entity.AiChatMessage> history, String docId, String subjectClassLevelFilter, String filterId, String mode, String tone, String providedToneInstruction) {
        log.info("Copilot received query: {} (Mode: {}, Tone: {})", query, mode, tone);

        String tenantId = com.testshaper.security.TenantContext.getTenantId();
        if (tenantId == null) tenantId = "DEFAULT";

        // Format Chat History
        StringBuilder historyText = new StringBuilder();
        if (history != null && !history.isEmpty()) {
            historyText.append("\n--- CHAT HISTORY ---\n");
            int start = Math.max(0, history.size() - 8); // Last 8 messages
            for (int i = start; i < history.size(); i++) {
                com.testshaper.entity.AiChatMessage msg = history.get(i);
                historyText.append(msg.getRole().toUpperCase()).append(": ");
                if ("ai".equals(msg.getRole()) && msg.getActionableData() != null) {
                    historyText.append(msg.getActionableData()).append("\n");
                } else {
                    historyText.append(msg.getContent()).append("\n");
                }
            }
            historyText.append("--------------------\n");
        }

        // Fetch dynamic Base Prompt
        com.testshaper.entity.GeneralSetting promptSetting = generalSettingRepository.findByTenantIdAndKey(tenantId, "workspace_base_prompt").orElse(null);
        if (promptSetting == null && !tenantId.equals("DEFAULT")) {
            promptSetting = generalSettingRepository.findByTenantIdAndKey("DEFAULT", "workspace_base_prompt").orElse(null);
        }
        String basePrompt = (promptSetting != null && promptSetting.getValue() != null) 
            ? promptSetting.getValue() 
            : "You are a highly intelligent and helpful \"Learning Copilot\" and \"Doubt Solver\" assistant for an EdTech platform. Use Bengali (বাংলা) for the response since most users are from Bangladesh, unless requested otherwise. Format everything beautifully using Markdown (bold, lists, etc.). Use LaTeX ($$ math $$) if there are physics or math equations to write.";

        // Fetch dynamic Subject-Specific Schemas
        String subjectSchemaRule = "";
        com.testshaper.entity.GeneralSetting schemasSetting = generalSettingRepository.findByTenantIdAndKey(tenantId, "workspace_json_schemas").orElse(null);
        if (schemasSetting == null && !tenantId.equals("DEFAULT")) {
            schemasSetting = generalSettingRepository.findByTenantIdAndKey("DEFAULT", "workspace_json_schemas").orElse(null);
        }
        if (schemasSetting != null && schemasSetting.getValue() != null && subjectClassLevelFilter != null) {
            try {
                List<Map<String, String>> schemas = objectMapper.readValue(schemasSetting.getValue(), new TypeReference<List<Map<String, String>>>(){});
                String lowerFilter = subjectClassLevelFilter.toLowerCase();
                for (Map<String, String> schema : schemas) {
                    if (schema.get("subject") != null && lowerFilter.contains(schema.get("subject").toLowerCase())) {
                        subjectSchemaRule = "\nIMPORTANT SUBJECT RULE: " + schema.get("schema");
                        break;
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse workspace_json_schemas", e);
            }
        }

        // 1. Build Search Query (enhanced for semantic search)
        String searchQuery = query;
        if (subjectClassLevelFilter != null && !subjectClassLevelFilter.isBlank()) {
            searchQuery = "প্রসঙ্গ: " + subjectClassLevelFilter + ". প্রশ্ন: " + query;
        }

        List<String> contextChunks = new ArrayList<>();

        // 2. Resolve document IDs and Query Namespaces
        if (docId != null && !docId.isBlank()) {
            Map<String, Object> filters = new HashMap<>();
            filters.put("docId", docId);
            contextChunks.addAll(vectorDatabaseService.similaritySearch(searchQuery, 4, filters));
        } else if (subjectClassLevelFilter != null && !subjectClassLevelFilter.isBlank()) {
            // Parse subject filter string (e.g., "৬ষ্ঠ শ্রেণি - বাংলা ১ম পত্র (১st Paper)")
            String classN = null;
            String subjN = subjectClassLevelFilter;
            int hyphenIdx = subjectClassLevelFilter.indexOf(" - ");
            if (hyphenIdx > 0) {
                classN = subjectClassLevelFilter.substring(0, hyphenIdx).trim();
                subjN = subjectClassLevelFilter.substring(hyphenIdx + 3).trim();
                
                // Strip out parenthesis (e.g., "(1st Paper)") to match database string
                int parenIdx = subjN.indexOf("(");
                if (parenIdx > 0) {
                    subjN = subjN.substring(0, parenIdx).trim();
                }
            }
            
            List<CurriculumDocument> docs = curriculumDocumentRepository.search(null, null, null, classN, subjN);
            if (docs.isEmpty() && classN != null) {
                // Fallback: search the whole string as subject
                docs = curriculumDocumentRepository.search(null, null, null, null, subjectClassLevelFilter);
            }
            
            log.info("Namespace Resolution: Found {} documents for class '{}', subject '{}'", docs.size(), classN, subjN);
            
            // Query namespaces for up to 3 most relevant books in this subject
            int limit = Math.min(docs.size(), 3);
            for (int i = 0; i < limit; i++) {
                Map<String, Object> filters = new HashMap<>();
                filters.put("docId", docs.get(i).getId().toString());
                contextChunks.addAll(vectorDatabaseService.similaritySearch(searchQuery, 2, filters));
            }
        } else {
            // Global search (if no namespace is targeted)
            contextChunks.addAll(vectorDatabaseService.similaritySearch(searchQuery, 4, new HashMap<>()));
        }

        // If strict mode, and no context found, return error
        boolean isStrict = "strict".equalsIgnoreCase(mode);
        boolean isQuestionRequest = query.matches("(?i).*(প্রশ্ন|mcq|cq|সৃজনশীল|বহুনির্বাচনি|question|questions|জেনারেট|তৈরি).*");
        boolean isParameterResponse = historyText.toString().contains("\"parameter_request\"") && query.length() < 20;

        // Hybrid Question Generation Context Injection
        if (isQuestionRequest && ((subjectClassLevelFilter != null && !subjectClassLevelFilter.isBlank()) || (filterId != null && !filterId.isBlank()))) {
            try {
                java.util.UUID parsedFilterId = null;
                if (filterId != null && !filterId.isBlank()) {
                    try {
                        parsedFilterId = java.util.UUID.fromString(filterId);
                    } catch (Exception e) {
                        log.warn("Invalid filterId format: {}", filterId);
                    }
                }
                
                java.util.UUID classSubjectId = parsedFilterId;
                
                // Fallback to string parsing if no ID is passed
                if (classSubjectId == null && subjectClassLevelFilter != null) {
                    String classN = null;
                    String subjN = subjectClassLevelFilter;
                    int hyphenIdx = subjectClassLevelFilter.indexOf(" - ");
                    if (hyphenIdx > 0) {
                        classN = subjectClassLevelFilter.substring(0, hyphenIdx).trim();
                        subjN = subjectClassLevelFilter.substring(hyphenIdx + 3).trim();
                        int parenIdx = subjN.indexOf("(");
                        if (parenIdx > 0) {
                            subjN = subjN.substring(0, parenIdx).trim();
                        }
                    }
                    
                    if (classN != null) {
                        log.info("Hybrid Question Gen: Trying to find ClassSubject for classN='{}', subjN='{}', tenantId='{}'", classN, subjN, tenantId);
                        List<com.testshaper.entity.ClassSubject> csList = classSubjectRepository.findByNames(tenantId.equals("DEFAULT") ? "DEFAULT" : tenantId, classN, subjN);
                        if (csList.isEmpty() && !tenantId.equals("DEFAULT")) {
                            csList = classSubjectRepository.findByNames("DEFAULT", classN, subjN);
                        }
                        if (!csList.isEmpty()) {
                            classSubjectId = csList.get(0).getId();
                        } else {
                            log.warn("ClassSubject not found for '{}' and '{}'", classN, subjN);
                        }
                    }
                }
                
                if (classSubjectId != null) {
                    log.info("Found ClassSubject ID: {}", classSubjectId);
                    org.springframework.data.domain.Page<com.testshaper.entity.Question> qPage = questionRepository.searchApproved(
                            tenantId, classSubjectId, null, null, null, null, null, null, org.springframework.data.domain.PageRequest.of(0, 15));
                            
                    log.info("Fetched {} approved questions from QuestionRepository", qPage.getNumberOfElements());
                    if (qPage.hasContent()) {
                        StringBuilder qb = new StringBuilder("--- SYSTEM QUESTION BANK ---\n");
                        for (com.testshaper.entity.Question q : qPage.getContent()) {
                            qb.append("[ID: ").append(q.getId()).append("] Q: ").append(q.getQuestionText()).append("\n");
                            if (q.getOptions() != null && !q.getOptions().isEmpty()) {
                                q.getOptions().forEach(o -> qb.append("- ").append(o.getOptionLabel()).append("\n"));
                            }
                            qb.append("\n");
                        }
                        contextChunks.add(qb.toString());
                    } else {
                        log.warn("No approved questions found for ClassSubject ID {}", classSubjectId);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch questions for Hybrid Question Generation", e);
            }
        }

        if (isStrict && contextChunks.isEmpty() && !isParameterResponse) {
            return "দুঃখিত, আমি কারিকুলাম বা প্রশ্নব্যাংকে এই বিষয়ের সাথে সম্পর্কিত কোনো প্রাসঙ্গিক অংশ খুঁজে পাইনি। অনুগ্রহ করে প্রশ্নটি পরিষ্কারভাবে লিখুন।";
        }


        // 3. Merge contexts
        StringBuilder contextBuilder = new StringBuilder();
        if (!contextChunks.isEmpty()) {
            for (int i = 0; i < contextChunks.size(); i++) {
                contextBuilder.append("\n--- সূত্র ").append(i + 1).append(" ---\n");
                contextBuilder.append(contextChunks.get(i));
            }
        }
        
        String finalContext = contextBuilder.toString();

        // 4. Determine Tone and Mode Instructions
        String toneInstruction;
        if (providedToneInstruction != null && !providedToneInstruction.isBlank()) {
            toneInstruction = providedToneInstruction;
        } else {
            toneInstruction = "Answer clearly and precisely.";
            if ("friendly".equalsIgnoreCase(tone)) {
                toneInstruction = "Answer in a very friendly, encouraging, and supportive tone like a great mentor.";
            } else if ("professional".equalsIgnoreCase(tone)) {
                toneInstruction = "Answer in a highly professional, academic, and formal tone.";
            } else if ("socratic".equalsIgnoreCase(tone)) {
                toneInstruction = "Use the Socratic method: instead of just giving the answer, gently ask guiding questions to help the student figure it out themselves. Be very encouraging.";
            }
        }

        String modeInstruction = "You MUST formulate your answer using strictly this context. If the answer cannot be found completely in the provided context, state that explicitly and offer whatever partial truth you can derive. NEVER invent unverified facts.";
        if ("creative".equalsIgnoreCase(mode)) {
            modeInstruction = "Use the provided context as a primary reference, but you may use your general knowledge to provide a comprehensive and helpful answer.";
        }

        if (isParameterResponse) {
            modeInstruction = "The user has provided a short parameter response to your previous question. Acknowledge it, update your internal state, and continue the task without enforcing strict context validation for this specific message.";
        }

        if (isQuestionRequest || isParameterResponse) {
            modeInstruction += "\n\n--- AGENTIC TOOL CALLING: EXAM CONFIGURATION ---\n" +
                    "You are in an interactive Exam Generation flow. You MUST follow these STRICT steps:\n" +
                    "1. Review the CHAT HISTORY to see what parameters (Subject/Topic, Chapter, Question Type, Number of Questions, Difficulty) you already have.\n" +
                    "2. If ANY parameter is still missing, DO NOT generate questions. You MUST ask ONE missing parameter at a time by outputting ONLY a JSON block with the 'parameter_request' schema. Provide multiple-choice options for the user to select. Example:\n" +
                    "{\n" +
                    "  \"actionable_type\": \"parameter_request\",\n" +
                    "  \"data\": {\n" +
                    "    \"message\": \"আপনি কয়টি প্রশ্ন চান?\",\n" +
                    "    \"options\": [\"৫টি\", \"১০টি\", \"১৫টি\"]\n" +
                    "  }\n" +
                    "}\n" +
                    "DO NOT output any conversational text before or after this JSON block if you are asking for a parameter.\n" +
                    "3. If the user's latest message is a short answer (e.g., '১টি'), treat it as a parameter for your previous question. Do NOT search the syllabus for this word.\n" +
                    "4. ONCE YOU HAVE ALL PARAMETERS, you MUST output a JSON block containing the structured configuration for the Auto Exam Generator. DO NOT generate the actual questions. You only extract the parameters and pass them back. The JSON must strictly follow this schema at the VERY END of your response enclosed in ```json and ```:\n" +
                    "{\n" +
                    "  \"actionable_type\": \"exam_config\",\n" +
                    "  \"data\": {\n" +
                    "    \"subject\": \"Name of the subject\",\n" +
                    "    \"chapter\": \"Name of the chapter\",\n" +
                    "    \"questionCount\": 10,\n" +
                    "    \"questionType\": \"MCQ or CQ\",\n" +
                    "    \"difficulty\": \"Easy, Medium, or Hard\"\n" +
                    "  }\n" +
                    "}\n";
        }

        // 5. Generative RAG Prompt
        String prompt = String.format("""
                %s
                %s

                The student has asked the following question:
                Question: "%s"

                Here is the verified curriculum context extracted from our database:
                %s

                Context Subject/Target: %s

                Instructions:
                - %s
                - %s%s
                """, basePrompt, historyText.toString(), query, finalContext, subjectClassLevelFilter != null ? subjectClassLevelFilter : "General", toneInstruction, modeInstruction, subjectSchemaRule);

        try {
            // Provide null for file since we only pass text prompt
            return aiQuestionService.generateRawCompletion(prompt, null);
        } catch (Exception e) {
            log.error("Generative answer synthesis failed", e);
            return "সিস্টেম এরর: এই মুহূর্তে AI উত্তর পাঠাতে পারছে না। (" + e.getMessage() + ")";
        }
    }
}
