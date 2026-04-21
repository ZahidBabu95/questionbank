package com.testshaper.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.service.AIQuestionService;
import com.testshaper.service.TopicExtractorService;
import com.testshaper.service.VectorDatabaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TopicExtractorServiceImpl implements TopicExtractorService {

    private final SourceBookIndexRepository sourceBookIndexRepository;
    private final KnowledgePageRepository knowledgePageRepository;
    private final TopicRepository topicRepository;
    private final CurriculumDocumentChunkRepository chunkRepository;
    private final AIQuestionService aiQuestionService;
    private final VectorDatabaseService vectorDatabaseService;
    private final ObjectMapper objectMapper;
    private final com.testshaper.repository.AiTopicExtractionJobRepository aiTopicExtractionJobRepository;

    @Override
    @Async
    public void processBulkTopicExtractionJob(UUID jobId, List<UUID> targetIndexIds) {
        log.info("Starting Background Bulk Topic Extraction Job: {}", jobId);
        
        AiTopicExtractionJob job = aiTopicExtractionJobRepository.findById(jobId).orElse(null);
        if (job == null) return;
        
        job.setStatus(AiTopicExtractionJob.JobStatus.IN_PROGRESS);
        aiTopicExtractionJobRepository.save(job);
        
        for (UUID indexId : targetIndexIds) {
            // Check for pause/cancel
            job = aiTopicExtractionJobRepository.findById(jobId).orElse(job);
            if (job.getStatus() == AiTopicExtractionJob.JobStatus.PAUSED) {
                while(job.getStatus() == AiTopicExtractionJob.JobStatus.PAUSED) {
                    try { Thread.sleep(5000); } catch(Exception e) {}
                    job = aiTopicExtractionJobRepository.findById(jobId).orElse(job);
                    if (job.getStatus() == AiTopicExtractionJob.JobStatus.CANCELLED) break;
                }
            }
            if (job.getStatus() == AiTopicExtractionJob.JobStatus.CANCELLED) break;
            
            try {
                // Call the regular sync
                this.extractAndMapTopicsForChapter(indexId);
                job.setProcessedChaptersCount(job.getProcessedChaptersCount() + 1);
            } catch (Exception e) {
                log.error("Job {} failed on index {}: {}", jobId, indexId, e.getMessage());
                job.setFailedChaptersCount(job.getFailedChaptersCount() + 1);
            }
            aiTopicExtractionJobRepository.save(job);
        }
        
        job = aiTopicExtractionJobRepository.findById(jobId).orElse(job);
        if (job.getStatus() != AiTopicExtractionJob.JobStatus.CANCELLED) {
            job.setStatus(AiTopicExtractionJob.JobStatus.COMPLETED);
            aiTopicExtractionJobRepository.save(job);
            log.info("Completed Bulk Topic Extraction Job: {}", jobId);
        }
    }

    @Override
    @Async
    @Transactional
    public void extractAndMapTopicsForChapter(UUID sourceBookIndexId) {
        log.info("Starting Semantic Chunking & Topic Mapping for Index: {}", sourceBookIndexId);
        
        // 1. Fetch SourceBookIndex and verify it maps to a `Chapter`
        SourceBookIndex index = sourceBookIndexRepository.findById(sourceBookIndexId).orElse(null);
        if (index == null) {
            log.error("Could not find SourceBookIndex {}", sourceBookIndexId);
            return;
        }

        Chapter mappedChapter = index.getMappedChapter();
        if (mappedChapter == null) {
            log.warn("SourceBookIndex '{}' is not mapped to any Chapter in the hierarchy. Topics will be standalone.", index.getIndexName());
        }

        // 2. Fetch all KnowledgePages for this index where extractionStatus = PROOFREAD
        // Using specific repository method
        List<KnowledgePage> pages = knowledgePageRepository.findBySourceBookIndexId(sourceBookIndexId)
                .stream()
                .filter(p -> p.getExtractionStatus() == KnowledgePage.ExtractionStatus.PROOFREAD || p.getExtractionStatus() == KnowledgePage.ExtractionStatus.GOLDEN_VECTORIZED)
                .sorted(Comparator.comparing(KnowledgePage::getPageNumber))
                .toList();

        if (pages.isEmpty()) {
            log.info("No PROOFREAD pages found for Index {}. Skipping.", index.getIndexName());
            return;
        }

        // 3. Merge golden markdown into one massive context (with page break tokens)
        StringBuilder chapterContext = new StringBuilder();
        for(KnowledgePage page : pages) {
            String content = page.getGoldenMarkdown() != null ? page.getGoldenMarkdown() : page.getExtractedMarkdown();
            if (content != null && !content.isBlank()) {
                chapterContext.append("<!-- PAGE ").append(page.getPageNumber()).append(" START -->\n");
                chapterContext.append(content).append("\n");
                chapterContext.append("<!-- PAGE ").append(page.getPageNumber()).append(" END -->\n\n");
            }
        }

        if (chapterContext.length() < 10) {
            log.warn("No actual text content found for Index {}", index.getIndexName());
            return;
        }

        // 4. Feed to Google Gemini 1.5 Pro to group paragraphs into logical sub-topics
        String prompt = "You are an expert curriculum structuring assistant. Your task is to process the following Golden Markdown text of a chapter from a textbook/guidebook. " +
            "The text includes multiple sub-topics, theories, or mathematical derivations. Split the text sequentially into logical Topic chunks.\n\n" +
            "CRITICAL INSTRUCTIONS:\n" +
            "1. Output ONLY a valid JSON Array. Do not wrap in ```json markers. Pure JSON only.\n" +
            "2. Preserve all image tags EXACTLY as they appear (e.g. ![alt](url)). Never delete an image link.\n" +
            "3. If the text is from a question bank or guidebook, preserve meta texts such as [Dhaka Board 2023] or question references.\n" +
            "4. Make sure NO meaningful text is thrown away. Your output chunks combined should theoretically contain 100% of the context.\n\n" +
            "SCHEMA FORMAT:\n[\n" +
            "  {\n" +
            "    \"topicName\": \"Heading or Name of the Sub-topic (Max 10 words)\",\n" +
            "    \"markdownContent\": \"Full markdown content for this topic, preserving all original text, equations and images.\"\n" +
            "  }\n]\n\n" +
            "CHAPTER CONTEXT:\n" + chapterContext.toString();

        try {
            String jsonResponse = aiQuestionService.generateRawCompletion(prompt, null);
            if (jsonResponse != null && jsonResponse.startsWith("```json")) {
                jsonResponse = jsonResponse.replace("```json", "").replace("```", "").trim();
            }

            JsonNode rootArray = objectMapper.readTree(jsonResponse);
            if (!rootArray.isArray() || rootArray.isEmpty()) {
                throw new Exception("AI returned empty or invalid JSON array");
            }

            // 6. Loop via parsed JSON -> Save to `Topic` table -> Save to `CurriculumDocumentChunk`
            int chunkIndex = 0;
            for (JsonNode node : rootArray) {
                String topicName = node.path("topicName").asText("Unknown Topic");
                String content = node.path("markdownContent").asText("");

                if (content.isBlank()) continue;

                // Create or find Topic (Optional deduplication could be added here)
                Topic topic = new Topic();
                topic.setName(topicName);
                if (mappedChapter != null) {
                    topic.setChapter(mappedChapter);
                }
                topic = topicRepository.save(topic);

                // Create Chunk
                CurriculumDocumentChunk chunk = new CurriculumDocumentChunk();
                chunk.setMappedTopic(topic);
                chunk.setSourceBook(index.getSourceBook());
                chunk.setSourceBookIndex(index);
                chunk.setChunkText(content);
                chunk.setChunkIndex(chunkIndex++);
                chunk.setTokenCount(content.length() / 4); // rough approximation
                
                // Extract Image URLs from markdown for metadata
                List<String> imageUrls = extractImageUrls(content);
                if (!imageUrls.isEmpty()) {
                    chunk.setImageUrl(String.join(",", imageUrls));
                }

                chunk = chunkRepository.save(chunk);

                // Upsert to Pinecone
                Map<String, Object> metadata = new HashMap<>();
                metadata.put("bookId", index.getSourceBook().getId().toString());
                if (mappedChapter != null) {
                    metadata.put("chapterId", mappedChapter.getId().toString());
                }
                metadata.put("topicId", topic.getId().toString());
                metadata.put("topicName", topicName);
                
                if (!imageUrls.isEmpty()) metadata.put("hasImage", true);

                try {
                    vectorDatabaseService.upsertChunk(chunk.getId().toString(), chunk.getChunkText(), metadata);
                } catch (Exception e) {
                    log.error("Pinecone Upsert failed for new Topic Chunk ID: {}", chunk.getId(), e);
                }
            }
            
            log.info("Successfully extracted {} topic chunks for Index {}", chunkIndex, index.getIndexName());
            
            // Mark pages as successfully vectorized
            for (KnowledgePage p : pages) {
                p.setExtractionStatus(KnowledgePage.ExtractionStatus.GOLDEN_VECTORIZED);
            }
            knowledgePageRepository.saveAll(pages);

        } catch (Exception e) {
            log.error("AI Topic Extraction failed for Index {}: {}", index.getIndexName(), e.getMessage(), e);
        }
    }

    private List<String> extractImageUrls(String markdown) {
        List<String> urls = new ArrayList<>();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("!\\[.*?\\]\\((.*?)\\)").matcher(markdown);
        while (m.find()) {
            urls.add(m.group(1));
        }
        return urls;
    }
}
