package com.testshaper.service;

import com.testshaper.dto.SourceBookMasterDto;
import java.util.List;
import java.util.UUID;

public interface KnowledgeHubService {
    SourceBookMasterDto createSourceBook(SourceBookMasterDto dto);
    List<SourceBookMasterDto> getAllSourceBooks();
    org.springframework.data.domain.Page<SourceBookMasterDto> getPaginatedSourceBooks(String searchTerm, String bookType, java.util.List<UUID> classSubjectIds, int page, int size);
    List<com.testshaper.dto.KnowledgePageDto> getSourceBookPages(UUID sourceBookId);
    void deleteKnowledgePage(UUID sourceBookId, UUID pageId);
    SourceBookMasterDto updateSourceBook(UUID id, SourceBookMasterDto dto);
    SourceBookMasterDto getSourceBook(UUID id);
    void processUploadsBackground(java.util.UUID sourceBookId, java.util.List<java.io.File> tempFiles, int startPage);
    void finalizeUploads(java.util.UUID sourceBookId, java.util.List<java.util.Map<String, Object>> uploadedFiles);
    
    java.util.Map<String, Object> registerUploadSession(java.util.UUID sourceBookId, int totalPages);
    java.util.Map<String, Object> getUploadStatus(java.util.UUID sourceBookId);
    String updateKnowledgePageImage(UUID sourceBookId, UUID pageId, org.springframework.web.multipart.MultipartFile file) throws Exception;
    void deleteSourceBook(UUID id);
    String extractKnowledgePageContent(UUID sourceBookId, UUID pageId) throws Exception;
    int extractAndSaveTableOfContents(UUID sourceBookId, UUID pageId) throws Exception;
    java.util.List<java.util.Map<String, Object>> previewTableOfContents(UUID sourceBookId, UUID pageId) throws Exception;
    SourceBookMasterDto extractAndSavePublicationInfo(UUID sourceBookId, UUID pageId) throws Exception;
    void updatePageFlags(UUID sourceBookId, UUID pageId, Boolean isPubInfo, Boolean isTocPage);
    void reorderPagesBulk(UUID sourceBookId, java.util.Map<UUID, Integer> pageOrderMap);
    
    // --- Source Book Index Mapping ---
    java.util.List<com.testshaper.dto.SourceBookIndexDto> getSourceBookIndices(UUID sourceBookId);
    com.testshaper.dto.SourceBookIndexDto createSourceBookIndex(UUID sourceBookId, com.testshaper.dto.SourceBookIndexDto dto);
    com.testshaper.dto.SourceBookIndexDto updateSourceBookIndex(UUID sourceBookId, UUID indexId, com.testshaper.dto.SourceBookIndexDto dto);
    void deleteSourceBookIndex(UUID sourceBookId, UUID indexId);

    // --- Page-to-Chapter Assignment (Phase 3A) ---
    com.testshaper.dto.KnowledgePageDto assignPageToIndex(UUID sourceBookId, UUID pageId, UUID sourceBookIndexId);
    com.testshaper.dto.KnowledgePageDto unassignPageFromIndex(UUID sourceBookId, UUID pageId);
    void autoAssignPagesBulk(UUID sourceBookId);

    // --- Golden Content Workflow (Phase 3B) ---
    com.testshaper.dto.KnowledgePageDto markAsGolden(UUID sourceBookId, UUID pageId, String goldenMarkdown);

    // --- Background Tasks (Ai Queue) ---
    com.testshaper.entity.AiBulkExtractionJob startAiExtractionQueue(UUID sourceBookId);
    com.testshaper.entity.AiBulkExtractionJob getAiExtractionQueueStatus(UUID sourceBookId);
    com.testshaper.entity.AiBulkExtractionJob pauseAiExtractionQueue(UUID jobId);
    com.testshaper.entity.AiBulkExtractionJob resumeAiExtractionQueue(UUID jobId);
    com.testshaper.entity.AiBulkExtractionJob cancelAiExtractionQueue(UUID jobId);

    // --- Background Question Generation Queue ---
    com.testshaper.entity.AiQuestionGenerationJob startAiQuestionQueue(UUID sourceBookId);
    com.testshaper.entity.AiQuestionGenerationJob getAiQuestionQueueStatus(UUID sourceBookId);
    com.testshaper.entity.AiQuestionGenerationJob pauseAiQuestionQueue(UUID jobId);
    com.testshaper.entity.AiQuestionGenerationJob resumeAiQuestionQueue(UUID jobId);
    com.testshaper.entity.AiQuestionGenerationJob cancelAiQuestionQueue(UUID jobId);

    // Internal execution called by Scheduler
    int generateQuestionsForPage(UUID sourceBookId, UUID pageId) throws Exception;

    // --- System Health and Dashboards ---
    java.util.Map<String, Object> getSystemHealthAndJobs();
}
