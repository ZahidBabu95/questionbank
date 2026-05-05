package com.testshaper.service;

import java.util.UUID;
import org.springframework.scheduling.annotation.Async;

public interface TopicExtractorService {

    /**
     * Extracts distinct topics and sub-topics from a sequence of golden pages
     * belonging to a specific SourceBookIndex (Chapter).
     *
     * It ensures:
     * 1. Unbroken sequence of Markdown reading.
     * 2. Retention of ![alt](url) image tags.
     * 3. Retention of question metadata (e.g. `[Dhaka Board 2023]`) from Guidebooks.
     * 4. Auto-creation of `Topic` records mapped to `Chapter`.
     * 5. Populating `CurriculumDocumentChunk` mapping to the specific `Topic`.
     *
     * @param sourceBookIndexId The ID of the specific chapter index
     */
    @Async
    void extractAndMapTopicsForChapter(UUID sourceBookIndexId, UUID jobId);
    void processBulkTopicExtractionJob(java.util.UUID jobId, java.util.List<java.util.UUID> targetIndexIds);
    void deleteSyncForChapters(UUID bookId, java.util.List<UUID> targetIndexIds);
    void updateChunkText(UUID chunkId, String newText);
    
    // Internal batching methods exposed for proxy
    void cleanupOldData(UUID sourceBookIndexId, UUID bookId, com.testshaper.entity.Chapter mappedChapter);
    void updatePageStatus(java.util.List<com.testshaper.entity.KnowledgePage> pages);
    void processBatch(com.testshaper.entity.SourceBookIndex index, com.testshaper.entity.Chapter mappedChapter, java.util.List<com.testshaper.entity.KnowledgePage> batchPages, int batchIndex);
    void saveTopicsAndChunks(com.testshaper.entity.SourceBookIndex index, com.testshaper.entity.Chapter mappedChapter, com.fasterxml.jackson.databind.JsonNode rootArray, int batchIndex);
    
    // UI Tools
    void renameTopicAndSync(UUID topicId, String newName);
    void mergeTopicInto(UUID sourceTopicId, UUID targetTopicId);
    int finalizeVectorsForIndex(UUID indexId);
}
