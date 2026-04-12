package com.testshaper.service;

import com.testshaper.entity.CurriculumDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CopilotService {

    private final VectorDatabaseService vectorDatabaseService;
    private final com.testshaper.service.AIQuestionService aiQuestionService;

    /**
     * Executes the RAG pipeline:
     * 1. Vector Search for related chunks.
     * 2. Prompts Gemini with extracted background context.
     * 3. Returns Markdown formatted answer.
     */
    public String askCopilot(String query, String docId, String subjectClassLevelFilter) {
        log.info("Copilot received query: {}", query);

        // 1. Build Metadata Filter for Pinecone lookup
        Map<String, Object> filters = new HashMap<>();
        if (docId != null && !docId.isBlank()) {
            filters.put("docId", docId);
        }

        // 2. Search Similar Chunks (Limit top 4 paragraphs)
        List<String> contextChunks = vectorDatabaseService.similaritySearch(query, 4, filters);

        if (contextChunks.isEmpty()) {
            return "দুঃখিত, আমি কারিকুলাম কারেকশনে এই প্রশ্নের সাথে সম্পর্কিত কোনো প্রাসঙ্গিক অংশ খুঁজে পাইনি। অনুগ্রহ করে প্রশ্নটি পরিষ্কারভাবে লিখুন বা অন্য কিছু জিজ্ঞাসা করুন।";
        }

        // 3. Merge contexts
        StringBuilder contextBuilder = new StringBuilder();
        for (int i = 0; i < contextChunks.size(); i++) {
            contextBuilder.append("\n--- সূত্র ").append(i + 1).append(" ---\n");
            contextBuilder.append(contextChunks.get(i));
        }
        
        String finalContext = contextBuilder.toString();

        // 4. Strict Generative RAG Prompt
        String prompt = String.format("""
                You are a highly intelligent and helpful "Learning Copilot" and "Doubt Solver" assistant for an EdTech platform.
                
                The student has asked the following question:
                Question: "%s"

                Here is the verified curriculum context extracted from our database. You MUST formulate your answer using strictly this context:
                %s

                Instructions:
                - Answer clearly and precisely.
                - Use Bengali (বাংলা) for the response since most users are from Bangladesh.
                - Format everything beautifully using Markdown (bold, lists, etc.).
                - Use LaTeX ($$ math $$) if there are physics or math equations to write.
                - If the answer cannot be found completely in the provided context, state that explicitly and offer whatever partial truth you can derive. NEVER invent unverified facts.
                """, query, finalContext);

        try {
            // Provide null for file since we only pass text prompt
            return aiQuestionService.generateRawCompletion(prompt, null);
        } catch (Exception e) {
            log.error("Generative answer synthesis failed", e);
            return "সিস্টেম এরর: এই মুহূর্তে AI উত্তর পাঠাতে পারছে না। (" + e.getMessage() + ")";
        }
    }
}
