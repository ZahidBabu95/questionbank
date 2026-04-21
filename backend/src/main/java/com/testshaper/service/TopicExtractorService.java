package com.testshaper.service;

import java.util.UUID;

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
    void extractAndMapTopicsForChapter(UUID sourceBookIndexId);
    void processBulkTopicExtractionJob(java.util.UUID jobId, java.util.List<java.util.UUID> targetIndexIds);

}
