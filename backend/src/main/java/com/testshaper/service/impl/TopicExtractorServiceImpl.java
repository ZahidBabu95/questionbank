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
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Service
@RequiredArgsConstructor
@Slf4j
public class TopicExtractorServiceImpl implements TopicExtractorService {

    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.context.ApplicationContext applicationContext;

    private TopicExtractorService getSelf() {
        return applicationContext.getBean(TopicExtractorService.class);
    }

    private final SourceBookIndexRepository sourceBookIndexRepository;
    private final KnowledgePageRepository knowledgePageRepository;
    private final TopicRepository topicRepository;
    private final CurriculumDocumentChunkRepository chunkRepository;
    private final AIQuestionService aiQuestionService;
    private final VectorDatabaseService vectorDatabaseService;
    private final ObjectMapper objectMapper;
    private final com.testshaper.repository.AiTopicExtractionJobRepository aiTopicExtractionJobRepository;
    
    private final ThreadPoolTaskExecutor topicExecutor = new ThreadPoolTaskExecutor();
    private final ThreadPoolTaskExecutor batchExecutor = new ThreadPoolTaskExecutor();

    @jakarta.annotation.PostConstruct
    public void init() {
        topicExecutor.setCorePoolSize(30); // High concurrency for 100-worker architecture
        topicExecutor.setMaxPoolSize(100);
        topicExecutor.setQueueCapacity(2000);
        topicExecutor.setThreadNamePrefix("TopicSync-");
        topicExecutor.setDaemon(true);
        topicExecutor.initialize();

        batchExecutor.setCorePoolSize(50);
        batchExecutor.setMaxPoolSize(200);
        batchExecutor.setQueueCapacity(5000);
        batchExecutor.setThreadNamePrefix("TopicBatch-");
        batchExecutor.setDaemon(true);
        batchExecutor.initialize();
    }

    @Override
    @Async
    public void processBulkTopicExtractionJob(UUID jobId, List<UUID> targetIndexIds) {
        log.info("Starting Background Bulk Topic Extraction Job: {} with {} indices", jobId, targetIndexIds.size());
        
        AiTopicExtractionJob job = aiTopicExtractionJobRepository.findById(jobId).orElse(null);
        if (job == null) return;
        
        job.setStatus(AiTopicExtractionJob.JobStatus.IN_PROGRESS);
        
        // Calculate total batches to process for accurate fine-grained progress tracking
        int totalBatches = 0;
        int MAX_PAGES_PER_BATCH = 4;
        for (UUID indexId : targetIndexIds) {
            long proofreadCount = knowledgePageRepository.findBySourceBookIndexId(indexId).stream()
                .filter(p -> p.getExtractionStatus() == KnowledgePage.ExtractionStatus.PROOFREAD)
                .count();
            totalBatches += (int) Math.ceil((double) proofreadCount / MAX_PAGES_PER_BATCH);
        }
        
        // If there are no batches to process, just mark it as completed.
        if (totalBatches == 0) {
            job.setStatus(AiTopicExtractionJob.JobStatus.COMPLETED);
            aiTopicExtractionJobRepository.save(job);
            log.info("Completed Bulk Topic Extraction Job immediately (no new data to process): {}", jobId);
            return;
        }

        // We hijack the 'totalChaptersToProcess' and 'processedChaptersCount' fields to store BATCH progress
        job.setTotalChaptersToProcess(totalBatches);
        job.setProcessedChaptersCount(0);
        job.setFailedChaptersCount(0);
        aiTopicExtractionJobRepository.save(job);
        
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        
        for (UUID indexId : targetIndexIds) {
            futures.add(CompletableFuture.runAsync(() -> {
                // Check for pause/cancel
                AiTopicExtractionJob currentJob = aiTopicExtractionJobRepository.findById(jobId).orElse(null);
                if (currentJob == null || currentJob.getStatus() == AiTopicExtractionJob.JobStatus.CANCELLED) return;
                
                try {
                    this.extractAndMapTopicsForChapter(indexId, jobId); // Pass jobId so we can update batch progress inside
                } catch (Exception e) {
                    log.error("Job {} failed on index {}: {}", jobId, indexId, e.getMessage());
                }
            }, topicExecutor));
        }
        
        // Wait for all threads to finish
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        
        job = aiTopicExtractionJobRepository.findById(jobId).orElse(job);
        if (job.getStatus() != AiTopicExtractionJob.JobStatus.CANCELLED) {
            job.setStatus(AiTopicExtractionJob.JobStatus.COMPLETED);
            aiTopicExtractionJobRepository.save(job);
            log.info("Completed Bulk Topic Extraction Job: {}", jobId);
        }
    }

    @Override
    @Async
    public void extractAndMapTopicsForChapter(UUID sourceBookIndexId, UUID jobId) {
        log.info("Starting Semantic Chunking & Topic Mapping for Index: {}", sourceBookIndexId);
        
        SourceBookIndex index = sourceBookIndexRepository.findById(sourceBookIndexId).orElse(null);
        if (index == null) {
            log.error("Could not find SourceBookIndex {}", sourceBookIndexId);
            return;
        }

        Chapter mappedChapter = index.getMappedChapter();
        if (mappedChapter == null) {
            log.warn("SourceBookIndex '{}' is not mapped to any Chapter in the hierarchy. Topics will be standalone.", index.getIndexName());
        }
        
        // 1.5 IDEMPOTENCY (Removed for Retry Logic): Do NOT cleanup old vectors and chunks here.
        // We only want to process failed (PROOFREAD) pages and append them, without deleting already successful (GOLDEN_VECTORIZED) ones.
        // If the user wants a full reset, they will use the "Delete Sync" UI which handles cleanup explicitly.
        // getSelf().cleanupOldData(sourceBookIndexId, index.getSourceBook().getId(), mappedChapter);

        List<KnowledgePage> pages = knowledgePageRepository.findBySourceBookIndexId(sourceBookIndexId)
                .stream()
                .filter(p -> p.getExtractionStatus() == KnowledgePage.ExtractionStatus.PROOFREAD)
                .sorted(Comparator.comparing(KnowledgePage::getPageNumber))
                .toList();

        if (pages.isEmpty()) {
            log.info("No PROOFREAD pages found for Index {}. Skipping.", index.getIndexName());
            return;
        }

        int MAX_PAGES_PER_BATCH = 4;
        int totalBatches = (pages.size() + MAX_PAGES_PER_BATCH - 1) / MAX_PAGES_PER_BATCH;
        
        String billingMode = applicationContext.getBean(com.testshaper.repository.GeneralSettingRepository.class)
                .findByTenantIdIsNullAndKey("ai_billing_mode")
                .map(com.testshaper.entity.GeneralSetting::getValue).orElse("FREE_POOL");
                
        // Concurrency limit: 3 for free pool, 10 for paid keys (load-balanced)
        int concurrencyLimit = "FREE_POOL".equals(billingMode) ? 3 : 10;
        
        java.util.concurrent.ExecutorService chunkExecutor = java.util.concurrent.Executors.newFixedThreadPool(concurrencyLimit);
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        
        for (int i = 0; i < pages.size(); i += MAX_PAGES_PER_BATCH) {
            List<KnowledgePage> batch = pages.subList(i, Math.min(i + MAX_PAGES_PER_BATCH, pages.size()));
            final int batchIndex = i / MAX_PAGES_PER_BATCH;
            
            futures.add(CompletableFuture.runAsync(() -> {
                // Handle PAUSE/RESUME logic per batch
                if (jobId != null) {
                    AiTopicExtractionJob currentJob = aiTopicExtractionJobRepository.findById(jobId).orElse(null);
                    if (currentJob != null && currentJob.getStatus() == AiTopicExtractionJob.JobStatus.PAUSED) {
                        while (currentJob.getStatus() == AiTopicExtractionJob.JobStatus.PAUSED) {
                            try { Thread.sleep(5000); } catch (Exception e) {}
                            currentJob = aiTopicExtractionJobRepository.findById(jobId).orElse(currentJob);
                            if (currentJob.getStatus() == AiTopicExtractionJob.JobStatus.CANCELLED) return;
                        }
                    }
                    if (currentJob == null || currentJob.getStatus() == AiTopicExtractionJob.JobStatus.CANCELLED) return;
                }

                boolean success = false;
                try {
                    log.info("Processing Batch {}/{} for Index {} (Concurrent)", batchIndex + 1, totalBatches, index.getIndexName());
                    getSelf().processBatch(index, mappedChapter, batch, batchIndex);
                    
                    // Mark only these successfully processed pages as GOLDEN_VECTORIZED
                    getSelf().updatePageStatus(batch);
                    success = true;
                } catch (Exception e) {
                    log.error("Failed to process batch {}/{} for Index {}. Error: {}", batchIndex + 1, totalBatches, index.getIndexName(), e.getMessage());
                    // By not updating status, these pages remain PROOFREAD, allowing them to be retried later
                }
                
                // Synchronize job updates PER BATCH
                if (jobId != null) {
                    synchronized (jobId.toString().intern()) {
                        AiTopicExtractionJob freshJob = aiTopicExtractionJobRepository.findById(jobId).orElse(null);
                        if (freshJob != null) {
                            if (success) freshJob.setProcessedChaptersCount(freshJob.getProcessedChaptersCount() + 1);
                            else freshJob.setFailedChaptersCount(freshJob.getFailedChaptersCount() + 1);
                            aiTopicExtractionJobRepository.save(freshJob);
                        }
                    }
                }
            }, chunkExecutor));
        }
        
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            log.info("Finished topic chunk extraction for all batches of Index {}", index.getIndexName());
        } catch (Exception e) {
            log.error("Parallel batch execution encountered errors: {}", e.getMessage());
        } finally {
            chunkExecutor.shutdown();
        }
    }

    @Override
    @Transactional
    public void cleanupOldData(UUID sourceBookIndexId, UUID bookId, Chapter mappedChapter) {
        try {
            Map<String, Object> filter = new HashMap<>();
            if (mappedChapter != null) filter.put("chapterId", mappedChapter.getId().toString());
            String namespace = "book-" + bookId.toString();
            if (mappedChapter != null) {
                 vectorDatabaseService.deleteByMetadata(filter, namespace);
                 log.info("Deleted old Pinecone vectors for chapter: {}", mappedChapter.getId());
            }
            chunkRepository.deleteBySourceBookIndexId(sourceBookIndexId);
            log.info("Deleted old database chunks for index: {}", sourceBookIndexId);
        } catch (Exception e) {
            log.error("Idempotency cleanup failed for index {}: {}", sourceBookIndexId, e.getMessage());
        }
    }

    @Override
    @Transactional
    public void updatePageStatus(List<KnowledgePage> pages) {
        for (KnowledgePage p : pages) {
            p.setExtractionStatus(KnowledgePage.ExtractionStatus.GOLDEN_VECTORIZED);
        }
        knowledgePageRepository.saveAll(pages);
    }

    @Override
    public void processBatch(SourceBookIndex index, Chapter mappedChapter, List<KnowledgePage> batchPages, int batchIndex) {
        StringBuilder chapterContext = new StringBuilder();
        for(KnowledgePage page : batchPages) {
            String content = page.getGoldenMarkdown() != null ? page.getGoldenMarkdown() : page.getExtractedMarkdown();
            if (content != null && !content.isBlank()) {
                chapterContext.append("<!-- PAGE ").append(page.getPageNumber()).append(" START -->\n");
                chapterContext.append(content).append("\n");
                chapterContext.append("<!-- PAGE ").append(page.getPageNumber()).append(" END -->\n\n");
            }
        }

        if (chapterContext.length() < 10) return;

        String prompt = "You are an expert curriculum structuring assistant. Your task is to process the following Golden Markdown text of a chapter from a textbook/guidebook. " +
            "The text includes multiple sub-topics, theories, or mathematical derivations. Split the text sequentially into logical Topic chunks.\n\n" +
            "CRITICAL INSTRUCTIONS:\n" +
            "1. Output ONLY a valid JSON Array. Do not wrap in ```json markers. Pure JSON only.\n" +
            "2. Preserve all image tags EXACTLY as they appear (e.g. ![alt](url)). Never delete an image link.\n" +
            "3. If the text is from a question bank or guidebook, preserve meta texts such as [Dhaka Board 2023] or question references.\n" +
            "4. Make sure NO meaningful text is thrown away. Your output chunks combined should theoretically contain 100% of the context.\n" +
            "5. CRITICAL JSON ESCAPING: You MUST properly escape all double quotes (\\\") inside the `markdownContent` string values so that the JSON output is completely valid and parseable.\n\n" +
            "SCHEMA FORMAT:\n[\n" +
            "  {\n" +
            "    \"topicName\": \"Heading or Name of the Sub-topic (Max 10 words)\",\n" +
            "    \"markdownContent\": \"Full markdown content for this topic, preserving all original text, equations and images.\"\n" +
            "  }\n]\n\n" +
            "CHAPTER CONTEXT:\n" + chapterContext.toString();

        try {
            String jsonResponse = aiQuestionService.generateRawCompletion(prompt, null);
            if (jsonResponse != null) {
                if (jsonResponse.startsWith("```json")) {
                    jsonResponse = jsonResponse.replace("```json", "").replace("```", "").trim();
                } else if (jsonResponse.startsWith("```")) {
                    jsonResponse = jsonResponse.replace("```", "").trim();
                }
                
                // Fix common invalid escapes produced by LLM for smart quotes
                jsonResponse = jsonResponse.replace("\\“", "“").replace("\\”", "”").replace("\\'", "'");
            }

            JsonNode rootArray = objectMapper.readTree(jsonResponse);
            if (!rootArray.isArray() || rootArray.isEmpty()) {
                throw new Exception("AI returned empty or invalid JSON array");
            }

            getSelf().saveTopicsAndChunks(index, mappedChapter, rootArray, batchIndex);

        } catch (Exception e) {
            log.error("AI Batch Extraction failed for Index {}: {}", index.getIndexName(), e.getMessage());
            throw new RuntimeException("AI Extraction failed: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void saveTopicsAndChunks(SourceBookIndex index, Chapter mappedChapter, JsonNode rootArray, int batchIndex) {
        int chunkIndex = batchIndex * 100;
        for (JsonNode node : rootArray) {
            String topicName = node.path("topicName").asText("Unknown Topic");
            String content = node.path("markdownContent").asText("");

            if (content.isBlank()) continue;

            Topic topic = new Topic();
            topic.setName(topicName);
            if (mappedChapter != null) {
                topic.setChapter(mappedChapter);
            }
            topic = topicRepository.save(topic);

            CurriculumDocumentChunk chunk = new CurriculumDocumentChunk();
            chunk.setMappedTopic(topic);
            chunk.setSourceBook(index.getSourceBook());
            chunk.setSourceBookIndex(index);
            chunk.setChunkText(content);
            chunk.setChunkIndex(chunkIndex++);
            chunk.setTokenCount(content.length() / 4);
            
            List<String> imageUrls = extractImageUrls(content);
            if (!imageUrls.isEmpty()) {
                chunk.setImageUrl(String.join(",", imageUrls));
            }

            chunk = chunkRepository.save(chunk);

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
    }

    private List<String> extractImageUrls(String markdown) {
        List<String> urls = new ArrayList<>();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("!\\[.*?\\]\\((.*?)\\)").matcher(markdown);
        while (m.find()) {
            urls.add(m.group(1));
        }
        return urls;
    }

    @Override
    @Transactional
    public void deleteSyncForChapters(UUID bookId, List<UUID> targetIndexIds) {
        log.info("Starting deletion of vector sync data for {} chapters of book {}", targetIndexIds.size(), bookId);
        
        for (UUID indexId : targetIndexIds) {
            SourceBookIndex index = sourceBookIndexRepository.findById(indexId).orElse(null);
            if (index == null) continue;
            
            Chapter mappedChapter = index.getMappedChapter();
            
            // 1. Delete from Pinecone
            try {
                Map<String, Object> filter = new HashMap<>();
                if (mappedChapter != null) filter.put("chapterId", mappedChapter.getId().toString());
                String namespace = "book-" + bookId.toString();
                if (mappedChapter != null) {
                    vectorDatabaseService.deleteByMetadata(filter, namespace);
                    log.info("Deleted Pinecone vectors for chapter: {}", mappedChapter.getId());
                }
            } catch (Exception e) {
                log.error("Pinecone cleanup failed for index {}: {}", indexId, e.getMessage());
            }
            
            // 2. Delete from DB Chunks
            try {
                chunkRepository.deleteBySourceBookIndexId(indexId);
                log.info("Deleted database chunks for index: {}", indexId);
            } catch (Exception e) {
                log.error("Chunk DB cleanup failed for index {}: {}", indexId, e.getMessage());
            }
            
            // 3. Reset Page Status
            List<KnowledgePage> pages = knowledgePageRepository.findBySourceBookIndexId(indexId)
                    .stream()
                    .filter(p -> p.getExtractionStatus() == KnowledgePage.ExtractionStatus.GOLDEN_VECTORIZED)
                    .toList();
                    
            for (KnowledgePage p : pages) {
                p.setExtractionStatus(KnowledgePage.ExtractionStatus.PROOFREAD);
            }
            knowledgePageRepository.saveAll(pages);
        }
        log.info("Completed deletion of vector sync data.");
    }

    @Transactional
    @Override
    public void updateChunkText(UUID chunkId, String newText) {
        CurriculumDocumentChunk chunk = chunkRepository.findById(chunkId)
            .orElseThrow(() -> new RuntimeException("Chunk not found"));

        chunk.setChunkText(newText);
        chunk.setTokenCount(newText.length() / 4);
        chunkRepository.save(chunk);

        try {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("bookId", chunk.getSourceBook().getId().toString());
            if (chunk.getSourceBookIndex().getMappedChapter() != null) {
                metadata.put("chapterId", chunk.getSourceBookIndex().getMappedChapter().getId().toString());
            }
            metadata.put("topicId", chunk.getMappedTopic().getId().toString());
            metadata.put("topicName", chunk.getMappedTopic().getName());
            if (chunk.getImageUrl() != null && !chunk.getImageUrl().isEmpty()) {
                metadata.put("hasImage", true);
            }

            vectorDatabaseService.upsertChunk(chunk.getId().toString(), newText, metadata);
        } catch (Exception e) {
            log.error("Failed to update vector for chunk {}: {}", chunkId, e.getMessage());
            throw new RuntimeException("Failed to sync chunk update to Pinecone", e);
        }
    }
}
