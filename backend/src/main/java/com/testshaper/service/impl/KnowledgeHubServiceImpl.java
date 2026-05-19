package com.testshaper.service.impl;

import com.testshaper.dto.SourceBookMasterDto;
import com.testshaper.entity.SourceBookMaster;
import com.testshaper.repository.SourceBookMasterRepository;
import com.testshaper.security.TenantContext;
import com.testshaper.service.KnowledgeHubService;
import com.testshaper.service.GeneralSettingService;
import com.testshaper.entity.GeneralSetting;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Collections;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Base64;
import com.testshaper.service.AiBillingService;
import com.testshaper.entity.KnowledgePage;
import com.testshaper.entity.CurriculumDocumentChunk;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.rendering.ImageType;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class KnowledgeHubServiceImpl implements KnowledgeHubService {

    private final SourceBookMasterRepository sourceBookMasterRepository;
    private final com.testshaper.repository.KnowledgePageRepository knowledgePageRepository;
    private final com.testshaper.service.DynamicStorageService storageService;
    private final GeneralSettingService generalSettingService;
    private final com.testshaper.repository.ClassSubjectRepository classSubjectRepository;
    private final com.testshaper.repository.SourceBookIndexRepository sourceBookIndexRepository;
    private final com.testshaper.repository.ChapterRepository chapterRepository;
    private final com.testshaper.repository.TopicRepository topicRepository;
    private final com.testshaper.service.ApiKeyRotationService keyRotationService;
    @org.springframework.beans.factory.annotation.Value("${pinecone.api.key:}")
    private String pineconeApiKey;
    
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    @org.springframework.transaction.annotation.Transactional
    public void resetStuckJobs() {
        log.info("Checking for stuck AI jobs from previous server run...");
        
        List<com.testshaper.entity.AiTopicExtractionJob> stuckTopicJobs = aiTopicExtractionJobRepository.findAll().stream()
            .filter(j -> j.getStatus() == com.testshaper.entity.AiTopicExtractionJob.JobStatus.IN_PROGRESS)
            .toList();
        for (com.testshaper.entity.AiTopicExtractionJob job : stuckTopicJobs) {
            log.warn("Found stuck Topic Extraction Job {}. Resetting to CANCELLED.", job.getId());
            job.setStatus(com.testshaper.entity.AiTopicExtractionJob.JobStatus.CANCELLED);
        }
        aiTopicExtractionJobRepository.saveAll(stuckTopicJobs);
        
        List<com.testshaper.entity.AiQuestionGenerationJob> stuckQuestionJobs = aiQuestionGenerationJobRepository.findAll().stream()
            .filter(j -> j.getStatus() == com.testshaper.entity.AiQuestionGenerationJob.JobStatus.IN_PROGRESS)
            .toList();
        for (com.testshaper.entity.AiQuestionGenerationJob job : stuckQuestionJobs) {
            log.warn("Found stuck Question Generation Job {}. Resetting to CANCELLED.", job.getId());
            job.setStatus(com.testshaper.entity.AiQuestionGenerationJob.JobStatus.CANCELLED);
        }
        aiQuestionGenerationJobRepository.saveAll(stuckQuestionJobs);
        
        List<com.testshaper.entity.AiBulkExtractionJob> stuckBulkJobs = aiBulkExtractionJobRepository.findAll().stream()
            .filter(j -> j.getStatus() == com.testshaper.entity.AiBulkExtractionJob.JobStatus.IN_PROGRESS)
            .toList();
        for (com.testshaper.entity.AiBulkExtractionJob job : stuckBulkJobs) {
            log.warn("Found stuck Bulk Extraction Job {}. Resetting to CANCELLED.", job.getId());
            job.setStatus(com.testshaper.entity.AiBulkExtractionJob.JobStatus.CANCELLED);
        }
        aiBulkExtractionJobRepository.saveAll(stuckBulkJobs);
    } 
    private final AiBillingService aiBillingService;
    private final com.testshaper.repository.AiBulkExtractionJobRepository aiBulkExtractionJobRepository;
    private final com.testshaper.repository.AiQuestionGenerationJobRepository aiQuestionGenerationJobRepository;
    private final com.testshaper.repository.AiTopicExtractionJobRepository aiTopicExtractionJobRepository;
    private final com.testshaper.repository.AiKnowledgeBaseRepository aiKnowledgeBaseRepository;
    private final com.testshaper.repository.QuestionRepository questionRepository;
    private final com.testshaper.repository.QuestionSourceRepository questionSourceRepository;
    private final com.testshaper.repository.CurriculumDocumentChunkRepository curriculumDocumentChunkRepository;
    private final RestTemplate restTemplate = createRestTemplateWithTimeouts();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private RestTemplate createRestTemplateWithTimeouts() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000); // 15 seconds
        factory.setReadTimeout(90000);    // 90 seconds (Gemini can be slow)
        return new RestTemplate(factory);
    }

    @Override
    @org.springframework.scheduling.annotation.Async
    public void processUploadsBackground(UUID sourceBookId, java.util.List<java.io.File> localFiles, int startPage) {
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Book not found"));

        int currentPage = startPage;
        
        // Ensure image bulk tracking is properly initialized if there are multiple images
        if (!localFiles.isEmpty() && !localFiles.get(0).getName().toLowerCase().endsWith(".pdf")) {
            book.setIsProcessing(true);
            book.setTotalPagesToProcess(localFiles.size());
            book.setProcessedPagesCount(0);
            book = sourceBookMasterRepository.save(book);
        }
        
        for (java.io.File file : localFiles) {
            try {
                if (file.getName().toLowerCase().endsWith(".pdf")) {
                    log.info("Processing PDF file on background: {}", file.getName());
                    try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(file)) {
                        int totalPages = document.getNumberOfPages();
                        book.setIsProcessing(true);
                        book.setTotalPagesToProcess(totalPages);
                        book.setProcessedPagesCount(0);
                        book = sourceBookMasterRepository.save(book);

                        PDFRenderer pdfRenderer = new PDFRenderer(document);
                        for (int page = 0; page < totalPages; ++page) {
                            BufferedImage bim = pdfRenderer.renderImageWithDPI(page, 200, ImageType.RGB);
                            ByteArrayOutputStream baos = new ByteArrayOutputStream();
                            ImageIO.write(bim, "jpg", baos);
                            byte[] imageBytes = baos.toByteArray();
                            
                            String path = "knowledge_hub/pages/" + sourceBookId.toString();
                            String url = storageService.uploadFileContent(imageBytes, "image/jpeg", "page_" + page + ".jpg", null, path);
                            
                            com.testshaper.entity.KnowledgePage kp = new com.testshaper.entity.KnowledgePage();
                            kp.setSourceBook(book);
                            kp.setPageNumber(currentPage++);
                            kp.setR2FilePath(url);
                            kp.setExtractionStatus(com.testshaper.entity.KnowledgePage.ExtractionStatus.PENDING);
                            
                            knowledgePageRepository.save(kp);
                            
                            // Update progress occasionally
                            if (page % 5 == 0 || page == totalPages - 1) {
                                book.setProcessedPagesCount(page + 1);
                                book = sourceBookMasterRepository.save(book);
                            }
                        }
                    }
                } else {
                    // Standard Image Upload handling via local bytes
                    log.info("Processing generic image on background: {}", file.getName());
                    
                    byte[] imageBytes = java.nio.file.Files.readAllBytes(file.toPath());
                    String contentType = java.nio.file.Files.probeContentType(file.toPath());
                    if (contentType == null) contentType = "image/jpeg";

                    String path = "knowledge_hub/pages/" + sourceBookId.toString();
                    String url = storageService.uploadFileContent(imageBytes, contentType, file.getName(), null, path);
                    
                    com.testshaper.entity.KnowledgePage kp = new com.testshaper.entity.KnowledgePage();
                    kp.setSourceBook(book);
                    kp.setPageNumber(currentPage++);
                    kp.setR2FilePath(url);
                    kp.setExtractionStatus(com.testshaper.entity.KnowledgePage.ExtractionStatus.PENDING);
                    
                    knowledgePageRepository.save(kp);
                    
                    // Increment image progress
                    book.setProcessedPagesCount(book.getProcessedPagesCount() + 1);
                    if (book.getProcessedPagesCount() % 5 == 0 || book.getProcessedPagesCount().equals(book.getTotalPagesToProcess())) {
                        book = sourceBookMasterRepository.save(book);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to upload/process background file for book " + sourceBookId, e);
            } finally {
                // Delete temporary file to free up disk space
                if (file.exists()) file.delete();
            }
        }
        
        // Finalize processing status
        try {
            book.setIsProcessing(false);
            book = sourceBookMasterRepository.save(book);
        } catch (Exception ignored) {}
        log.info("Finished Background processing for Book {}", sourceBookId);
    }

    @Override
    public void finalizeUploads(UUID sourceBookId, java.util.List<java.util.Map<String, Object>> uploadedFiles) {
        com.testshaper.entity.SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Book not found"));

        int currentPage = 1;
        com.testshaper.entity.KnowledgePage lastPage = knowledgePageRepository.findFirstBySourceBookIdOrderByPageNumberDesc(sourceBookId).orElse(null);
        if (lastPage != null) {
            currentPage = lastPage.getPageNumber() + 1;
        }

        try {
            book.setIsProcessing(true);
            
            // If totalPagesToProcess is null or 0, initialize it (fallback)
            if (book.getTotalPagesToProcess() == null || book.getTotalPagesToProcess() == 0) {
                book.setTotalPagesToProcess(uploadedFiles.size());
            }

            for (java.util.Map<String, Object> fileInfo : uploadedFiles) {
                String publicUrl = (String) fileInfo.get("publicUrl");

                com.testshaper.entity.KnowledgePage kp = new com.testshaper.entity.KnowledgePage();
                kp.setSourceBook(book);
                kp.setPageNumber(currentPage++);
                kp.setR2FilePath(publicUrl);
                kp.setExtractionStatus(com.testshaper.entity.KnowledgePage.ExtractionStatus.PENDING);

                knowledgePageRepository.save(kp);

                book.setProcessedPagesCount(book.getProcessedPagesCount() + 1);
            }
            
            // If we processed everything expected, stop processing state
            if (book.getProcessedPagesCount() >= book.getTotalPagesToProcess()) {
                book.setIsProcessing(false);
            }
            
        } catch (Exception e) {
            log.error("Failed to finalize uploads for book " + sourceBookId, e);
        } finally {
            sourceBookMasterRepository.save(book);
        }
        log.info("Finished Finalizing {} pages for Book {}", uploadedFiles.size(), sourceBookId);
    }
    
    @Override
    public Map<String, Object> registerUploadSession(UUID sourceBookId, int totalPages) {
        com.testshaper.entity.SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Book not found"));
            
        // Setup initial counts for UI tracking
        book.setTotalPagesToProcess(totalPages);
        if (book.getProcessedPagesCount() == null) {
            book.setProcessedPagesCount(0);
        }
        sourceBookMasterRepository.save(book);
        
        int uploadedCount = book.getProcessedPagesCount();
        return Map.of(
            "sourceBookId", book.getId(),
            "totalPages", totalPages,
            "uploadedCount", uploadedCount,
            "nextPageToUpload", uploadedCount + 1
        );
    }
    
    @Override
    public Map<String, Object> getUploadStatus(UUID sourceBookId) {
        com.testshaper.entity.SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Book not found"));
            
        int total = book.getTotalPagesToProcess() != null ? book.getTotalPagesToProcess() : 0;
        int uploaded = book.getProcessedPagesCount() != null ? book.getProcessedPagesCount() : 0;
        
        return Map.of(
            "sourceBookId", book.getId(),
            "totalPages", total,
            "uploadedCount", uploaded,
            "nextPageToUpload", uploaded + 1,
            "isComplete", total > 0 && uploaded >= total
        );
    }

    @Override
    @Transactional
    public String updateKnowledgePageImage(UUID sourceBookId, UUID pageId, org.springframework.web.multipart.MultipartFile file) throws Exception {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found"));
            
        if (!page.getSourceBook().getId().equals(sourceBookId)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Page does not belong to this book");
        }

        // Upload new image to replace the old one
        String path = "knowledge_hub/pages/" + sourceBookId.toString();
        String url = storageService.uploadFile(file, null, path);
        
        page.setR2FilePath(url);
        // Optionally reset extraction status if image changes completely? 
        // We leave it as is so golden text doesn't wipe randomly.
        knowledgePageRepository.save(page);
        
        return url;
    }

    @Override
    @Transactional
    public String extractKnowledgePageContent(UUID sourceBookId, UUID pageId) throws Exception {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found"));

        if (!page.getSourceBook().getId().equals(sourceBookId)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Page does not belong to this book");
        }

        Map<String, String> aiSettings = generalSettingService.getGlobalSettings(GeneralSetting.SettingCategory.AI);
        // Use Gemini-specific mode key; fall back to global billing mode
        String billingMode = aiSettings.getOrDefault("ai_google_mode",
                aiSettings.getOrDefault("ai_billing_mode", "FREE_POOL"));
        int maxRetries = "FREE_POOL".equals(billingMode) ? 9 : 1; // try all keys

        // Download image ONCE outside retry loop
        byte[] imageBytes;
        try {
            ResponseEntity<byte[]> imgResp = restTemplate.getForEntity(page.getR2FilePath(), byte[].class);
            if (!imgResp.getStatusCode().is2xxSuccessful() || imgResp.getBody() == null) {
                throw new RuntimeException("Failed to download image from R2");
            }
            imageBytes = imgResp.getBody();
        } catch (Exception e) {
            log.error("Failed to fetch image: {}", page.getR2FilePath(), e);
            throw new RuntimeException("Could not read image for extraction: " + e.getMessage());
        }

        String base64Data = Base64.getEncoder().encodeToString(imageBytes);
        String mimeType = "image/jpeg";
        if (page.getR2FilePath() != null && page.getR2FilePath().toLowerCase().endsWith(".png")) {
            mimeType = "image/png";
        } else if (page.getR2FilePath() != null && page.getR2FilePath().toLowerCase().endsWith(".webp")) {
            mimeType = "image/webp";
        }

        String prompt = "Extract all text, content, and mathematical formulas from this page image. " +
                        "CRITICAL RULES: " +
                        "1. Math Formats: Any mathematical symbols, fractions, or equations MUST be in LaTeX enclosed in single '$' for inline and '$$' for block. " +
                        "2. Tables: If the page contains any tabular data or tables, you MUST extract them perfectly using standard Markdown table format. Do not skip any rows or columns. " +
                        "3. Images & Graphs: If the page contains any pictures, diagrams, figures, graphs, illustrations, or complex structural elements that cannot be represented in markdown, you MUST replace them with a markdown placeholder exactly named `![চিত্র]()` at the appropriate location in the text. " +
                        "Maintain the original structure, heading styles, and paragraphs. Respond strictly with Markdown formatted text. " +
                        "Do NOT include any extra conversational text.";

        Map<String, Object> inlineData = Map.of("mime_type", mimeType, "data", base64Data);
        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", prompt));
        parts.add(Map.of("inline_data", inlineData));
        Map<String, Object> content = Map.of("parts", parts);
        Map<String, Object> requestBody = Map.of("contents", List.of(content));
        String requestJson;
        try {
            requestJson = objectMapper.writeValueAsString(requestBody);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize request", e);
        }

        String currentApiKey = "";
        com.testshaper.entity.AiApiKey currentPoolKey = null;

        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            String model = aiSettings.getOrDefault("ai_model", "gemini-2.5-flash");

            if ("FREE_POOL".equals(billingMode)) {
                currentPoolKey = keyRotationService.getNextAvailableKey();
                if (currentPoolKey != null) {
                    currentApiKey = currentPoolKey.getApiKey();
                    if (currentPoolKey.getModel() != null && !currentPoolKey.getModel().isBlank()) {
                        model = currentPoolKey.getModel();
                    }
                }
            }

            if (currentApiKey.isBlank()) {
                currentApiKey = aiSettings.getOrDefault("ai_api_key", "");
            }

            if (currentApiKey.isBlank() || "******".equals(currentApiKey)) {
                throw new RuntimeException("No available API keys. All pool keys may be exhausted.");
            }

            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + currentApiKey;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);

            long startTime = System.currentTimeMillis();
            boolean isSuccess = false;
            String errorMsg = null;
            try {
                log.info("KH Page extraction attempt {}/{} with key '{}'", attempt + 1, maxRetries + 1,
                        currentPoolKey != null ? currentPoolKey.getKeyName() : "global");
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    JsonNode candidateContent = candidates.get(0).path("content").path("parts");
                    if (candidateContent.isArray() && candidateContent.size() > 0) {
                        String extractedText = candidateContent.get(0).path("text").asText();
                        page.setExtractedMarkdown(extractedText);
                        page.setExtractionStatus(com.testshaper.entity.KnowledgePage.ExtractionStatus.EXTRACTED);
                        knowledgePageRepository.save(page);
                        if (currentPoolKey != null) keyRotationService.recordUsage(currentPoolKey.getId());
                        
                        isSuccess = true;
                        
                        return extractedText;
                    }
                }
                errorMsg = "Empty response from AI Vision model.";
                throw new RuntimeException("Empty response from AI Vision model.");

            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                errorMsg = e.getResponseBodyAsString();
                int statusCode = e.getStatusCode().value();

                if ((statusCode == 429 || statusCode == 503 || (statusCode == 400 && errorMsg != null && errorMsg.contains("API_KEY_INVALID"))) && attempt < maxRetries) {
                    // Mark this key as exhausted
                    if (currentPoolKey != null) {
                        keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                        log.warn("Key '{}' returned {}. Marked exhausted. Rotating to next key...",
                                currentPoolKey.getKeyName(), statusCode);
                        currentPoolKey = null;
                        currentApiKey = "";
                    }
                    // Parse retry delay
                    int waitSec = 5;
                    try {
                        java.util.regex.Matcher m = java.util.regex.Pattern.compile("retry in (\\d+)").matcher(errorMsg);
                        if (m.find()) waitSec = Math.min(Integer.parseInt(m.group(1)) + 2, 10);
                    } catch (Exception ignored) {}
                    log.info("Waiting {}s before next key attempt...", waitSec);
                    Thread.sleep(waitSec * 1000L);
                    continue;
                }
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("Failed to extract page: " + errorMsg, e);
            } catch (Exception e) {
                errorMsg = e.getMessage();
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("Failed to extract page: " + errorMsg, e);
            } finally {
                long duration = System.currentTimeMillis() - startTime;
                int approxInput = prompt.length() / 4 + (base64Data != null ? 300 : 0);
                int approxOutput = isSuccess ? 1000 : 0;
                aiBillingService.recordSystemAiUsage("Knowledge Hub", "Page Extraction", approxInput, approxOutput, duration, isSuccess, errorMsg);
            }
        }
        throw new RuntimeException("All API keys exhausted. Could not extract page content.");
    }

    @Override
    public int extractAndSaveTableOfContents(UUID sourceBookId, UUID pageId) throws Exception {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Page not found"));
            
        if (page.getExtractedMarkdown() == null || page.getExtractedMarkdown().trim().isEmpty()) {
            throw new RuntimeException("Page text not extracted yet. Please extract the page first.");
        }

        String curriculumData = "";
        com.testshaper.entity.ClassSubject cs = page.getSourceBook().getClassSubject();
        if (cs != null) {
            java.util.List<com.testshaper.entity.Chapter> chapters = chapterRepository.findByClassSubjectIdOrderByChapterNumberAsc(cs.getId());
            if (!chapters.isEmpty()) {
                StringBuilder sb = new StringBuilder("\n\n[SYSTEM KNOWLEDGE] Curriculum Reference Chapters:\n");
                for (com.testshaper.entity.Chapter c : chapters) {
                    sb.append("- ").append(c.getId().toString()).append(" : ").append(c.getName()).append("\n");
                }
                sb.append("CRITICAL TASK: For each extracted book chapter, find the closest matching curriculum chapter from the list above based on its meaning or name. If a strong match is found, include the exact UUID in \"mappedChapterId\". If no strong match, omit it.\n");
                curriculumData = sb.toString();
            }
        }

        String prompt = "You are an expert at parsing Table of Contents from a book. Extract a list of chapters from the following text.\n" +
                        "If the TOC has categories like 'গদ্য' (Prose) or 'পদ্য' (Poetry), or authors for each chapter, include them as well.\n" +
                        curriculumData +
                        "\nOutput strictly a JSON array, without any markdown blocks or backticks. Format MUST be exactly like this: [{\"indexName\": \"Chapter 1\", \"startPage\": 1, \"endPage\": 10, \"categoryName\": \"গদ্য\", \"authorName\": \"Writer Name\", \"mappedChapterId\": \"uuid\"}]\n\n" +
                        "Text:\n" + page.getExtractedMarkdown();

        java.util.Map<String, String> aiSettings = generalSettingService.getGlobalSettings(com.testshaper.entity.GeneralSetting.SettingCategory.AI);
        // Use Gemini-specific mode key; fall back to global billing mode
        String billingMode = aiSettings.getOrDefault("ai_google_mode",
                aiSettings.getOrDefault("ai_billing_mode", "FREE_POOL"));
        int maxRetries = "FREE_POOL".equals(billingMode) ? 9 : 1;

        // Build request body once outside retry loop
        java.util.Map<String, Object> textPart = new java.util.HashMap<>();
        textPart.put("text", prompt);
        java.util.Map<String, Object> part = new java.util.HashMap<>();
        part.put("parts", java.util.List.of(textPart));
        java.util.Map<String, Object> contentMap = new java.util.HashMap<>();
        contentMap.put("contents", java.util.List.of(part));
        java.util.Map<String, Object> sysInstruction = new java.util.HashMap<>();
        sysInstruction.put("parts", java.util.List.of(java.util.Map.of("text",
                "You must return ONLY a raw JSON array. DO NOT format it as a markdown code block. Absolutely no ```json around the response.")));
        contentMap.put("system_instruction", sysInstruction);

        String requestJson;
        try {
            requestJson = objectMapper.writeValueAsString(contentMap);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize AI request: " + e.getMessage());
        }

        String currentApiKey = "";
        com.testshaper.entity.AiApiKey currentPoolKey = null;

        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            String currentModelName = aiSettings.getOrDefault("ai_model", "gemini-2.5-flash");

            if ("FREE_POOL".equals(billingMode)) {
                currentPoolKey = keyRotationService.getNextAvailableKey();
                if (currentPoolKey != null) {
                    currentApiKey = currentPoolKey.getApiKey();
                    if (currentPoolKey.getModel() != null && !currentPoolKey.getModel().isBlank()) {
                        currentModelName = currentPoolKey.getModel();
                    }
                }
            }

            if (currentApiKey.isBlank()) {
                currentApiKey = aiSettings.getOrDefault("ai_api_key", "");
            }

            if (currentApiKey.isBlank() || "******".equals(currentApiKey)) {
                throw new RuntimeException("No available API keys. All pool keys may be exhausted.");
            }

            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + currentModelName + ":generateContent?key=" + currentApiKey;
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<String> requestEntity = new org.springframework.http.HttpEntity<>(requestJson, headers);

            long startTime = System.currentTimeMillis();
            boolean isSuccess = false;
            String errorMsg = null;
            try {
                log.info("KH TOC extraction attempt {}/{} with key '{}'", attempt + 1, maxRetries + 1,
                        currentPoolKey != null ? currentPoolKey.getKeyName() : "global");

                org.springframework.http.ResponseEntity<String> responseEntity =
                        restTemplate.exchange(url, org.springframework.http.HttpMethod.POST, requestEntity, String.class);
                String responseBody = responseEntity.getBody();

                com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(responseBody);
                com.fasterxml.jackson.databind.JsonNode candidates = rootNode.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    com.fasterxml.jackson.databind.JsonNode parts2 = candidates.get(0).path("content").path("parts");
                    if (parts2.isArray() && parts2.size() > 0) {
                        String extractedText = parts2.get(0).path("text").asText();
                        int startIdx = extractedText.indexOf('[');
                        int endIdx = extractedText.lastIndexOf(']');
                        if (startIdx >= 0 && endIdx >= startIdx) {
                            extractedText = extractedText.substring(startIdx, endIdx + 1);
                        } else {
                            errorMsg = "AI did not return a valid JSON array.";
                            throw new RuntimeException("AI did not return a valid JSON array.");
                        }

                        com.fasterxml.jackson.databind.JsonNode arrayNode = objectMapper.readTree(extractedText);
                        if (!arrayNode.isArray()) {
                            errorMsg = "AI did not return an array.";
                            throw new RuntimeException("AI did not return an array.");
                        }

                        int count = 0;
                        SourceBookMaster book2 = page.getSourceBook();
                        for (com.fasterxml.jackson.databind.JsonNode idxNode : arrayNode) {
                            com.testshaper.entity.SourceBookIndex index = new com.testshaper.entity.SourceBookIndex();
                            index.setSourceBook(book2);
                            index.setIndexName(idxNode.path("indexName").asText(null));
                            if (idxNode.hasNonNull("startPage")) index.setStartPage(idxNode.get("startPage").asInt());
                            if (idxNode.hasNonNull("endPage")) index.setEndPage(idxNode.get("endPage").asInt());
                            if (idxNode.hasNonNull("categoryName")) index.setCategoryName(idxNode.get("categoryName").asText(null));
                            if (idxNode.hasNonNull("authorName")) index.setAuthorName(idxNode.get("authorName").asText(null));
                            if (idxNode.hasNonNull("mappedChapterId")) {
                                try {
                                    UUID mappedId = UUID.fromString(idxNode.get("mappedChapterId").asText());
                                    index.setMappedChapter(chapterRepository.findById(mappedId).orElse(null));
                                } catch (Exception ignored) {}
                            }
                            if (index.getIndexName() != null && !index.getIndexName().trim().isEmpty()) {
                                sourceBookIndexRepository.save(index);
                                count++;
                            }
                        }
                        if (currentPoolKey != null) keyRotationService.recordUsage(currentPoolKey.getId());
                        
                        isSuccess = true;
                        
                        return count;
                    }
                }
                errorMsg = "Empty response from AI";
                throw new RuntimeException("Empty response from AI");

            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                errorMsg = e.getResponseBodyAsString();
                int statusCode = e.getStatusCode().value();

                if ((statusCode == 429 || statusCode == 503 || (statusCode == 400 && errorMsg != null && errorMsg.contains("API_KEY_INVALID"))) && attempt < maxRetries) {
                    if (currentPoolKey != null) {
                        keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                        log.warn("Key '{}' returned {}. Marked exhausted. Rotating to next key...",
                                currentPoolKey.getKeyName(), statusCode);
                        currentPoolKey = null;
                        currentApiKey = "";
                    }
                    int waitSec = 5;
                    try {
                        java.util.regex.Matcher m = java.util.regex.Pattern.compile("retry in (\\d+)").matcher(errorMsg);
                        if (m.find()) waitSec = Math.min(Integer.parseInt(m.group(1)) + 2, 10);
                    } catch (Exception ignored) {}
                    log.info("TOC: Waiting {}s before next key attempt...", waitSec);
                    Thread.sleep(waitSec * 1000L);
                    continue;
                }
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("Gemini API Error: " + errorMsg, e);
            } catch (Exception e) {
                errorMsg = e.getMessage();
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("Gemini API Error: " + errorMsg, e);
            } finally {
                long duration = System.currentTimeMillis() - startTime;
                int approxInput = prompt.length() / 4;
                int approxOutput = isSuccess ? 1000 : 0;
                aiBillingService.recordSystemAiUsage("Knowledge Hub", "TOC Extraction", approxInput, approxOutput, duration, isSuccess, errorMsg);
            }
        }
        throw new RuntimeException("All API keys exhausted. Could not generate TOC.");
    }

    @Override
    public java.util.List<java.util.Map<String, Object>> previewTableOfContents(UUID sourceBookId, UUID pageId) throws Exception {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Page not found"));

        if (page.getExtractedMarkdown() == null || page.getExtractedMarkdown().isBlank()) {
            throw new RuntimeException("Page has not been extracted yet. Please run AI extraction first.");
        }

        String curriculumData = "";
        com.testshaper.entity.ClassSubject cs = page.getSourceBook().getClassSubject();
        if (cs != null) {
            java.util.List<com.testshaper.entity.Chapter> chapters = chapterRepository.findByClassSubjectIdOrderByChapterNumberAsc(cs.getId());
            if (!chapters.isEmpty()) {
                StringBuilder sb = new StringBuilder("\n\n[SYSTEM KNOWLEDGE] Curriculum Reference Chapters:\n");
                for (com.testshaper.entity.Chapter c : chapters) {
                    sb.append("- ").append(c.getId().toString()).append(" : ").append(c.getName()).append("\n");
                }
                sb.append("CRITICAL TASK: For each extracted book chapter, find the closest matching curriculum chapter from the list above based on its meaning or name. If a strong match is found, include its exact UUID in \"mappedChapterId\". If no strong match, omit it.\n");
                curriculumData = sb.toString();
            }
        }

        String prompt = "You are a book indexing assistant. Analyze the following Table of Contents text from a book and extract all chapters (অধ্যায়/chapter) entries.\n\n" +
                "Return a JSON array where each element is an object with:\n" +
                "- \"chapterNumber\": the chapter ordinal number (integer), starting from 1\n" +
                "- \"indexName\": the chapter title/name (string)\n" +
                "- \"startPage\": the starting page number (integer, or null if not found)\n" +
                "- \"categoryName\": if the TOC is divided into parts like 'Prose'/'গদ্য' or 'Poetry'/'পদ্য', include it here\n" +
                "- \"authorName\": if the chapter has an author listed next to it, include it\n" +
                "- \"mappedChapterId\": mapped curriculum chapter uuid if a match is found\n" +
                curriculumData +
                "\nOnly include actual chapters, not sub-sections or topics. Return ONLY the JSON array, no markdown.\n\n" +
                "Text:\n" + page.getExtractedMarkdown();

        java.util.Map<String, String> aiSettings = generalSettingService.getGlobalSettings(com.testshaper.entity.GeneralSetting.SettingCategory.AI);
        String billingMode = aiSettings.getOrDefault("ai_google_mode", aiSettings.getOrDefault("ai_billing_mode", "FREE_POOL"));
        int maxRetries = "FREE_POOL".equals(billingMode) ? 9 : 1;

        java.util.Map<String, Object> textPart = new java.util.HashMap<>();
        textPart.put("text", prompt);
        java.util.Map<String, Object> part = new java.util.HashMap<>();
        part.put("parts", java.util.List.of(textPart));
        java.util.Map<String, Object> contentMap = new java.util.HashMap<>();
        contentMap.put("contents", java.util.List.of(part));

        String requestJson = objectMapper.writeValueAsString(contentMap);
        String currentApiKey = "";
        com.testshaper.entity.AiApiKey currentPoolKey = null;

        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            String model = aiSettings.getOrDefault("ai_model", "gemini-2.5-flash");
            if ("FREE_POOL".equals(billingMode)) {
                currentPoolKey = keyRotationService.getNextAvailableKey();
                if (currentPoolKey != null) {
                    currentApiKey = currentPoolKey.getApiKey();
                    if (currentPoolKey.getModel() != null && !currentPoolKey.getModel().isBlank()) model = currentPoolKey.getModel();
                }
            }
            if (currentApiKey.isBlank()) currentApiKey = aiSettings.getOrDefault("ai_api_key", "");
            if (currentApiKey.isBlank() || "******".equals(currentApiKey)) throw new RuntimeException("No available API keys.");

            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + currentApiKey;
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<String> requestEntity = new org.springframework.http.HttpEntity<>(requestJson, headers);

            long startTime = System.currentTimeMillis();
            boolean isSuccess = false;
            String errorMsg = null;
            try {
                log.info("KH TOC Preview attempt {}/{} with key '{}'", attempt + 1, maxRetries + 1, currentPoolKey != null ? currentPoolKey.getKeyName() : "global");
                org.springframework.http.ResponseEntity<String> responseEntity = restTemplate.exchange(url, org.springframework.http.HttpMethod.POST, requestEntity, String.class);
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(responseEntity.getBody());
                com.fasterxml.jackson.databind.JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    String text = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                    int s = text.indexOf('['); int e2 = text.lastIndexOf(']');
                    if (s >= 0 && e2 >= s) text = text.substring(s, e2 + 1);
                    com.fasterxml.jackson.databind.JsonNode arr = objectMapper.readTree(text);
                    if (currentPoolKey != null) keyRotationService.recordUsage(currentPoolKey.getId());
                    java.util.List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
                    for (com.fasterxml.jackson.databind.JsonNode n : arr) {
                        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                        m.put("chapterNumber", n.path("chapterNumber").asInt(result.size() + 1));
                        m.put("indexName", n.path("indexName").asText(""));
                        m.put("startPage", n.hasNonNull("startPage") ? n.get("startPage").asInt() : null);
                        m.put("categoryName", n.hasNonNull("categoryName") ? n.get("categoryName").asText() : null);
                        m.put("authorName", n.hasNonNull("authorName") ? n.get("authorName").asText() : null);
                        if (n.hasNonNull("mappedChapterId")) m.put("mappedChapterId", n.get("mappedChapterId").asText());
                        result.add(m);
                    }
                    isSuccess = true;
                    return result;
                }
                errorMsg = "Empty AI response";
                throw new RuntimeException("Empty AI response");
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                errorMsg = e.getResponseBodyAsString();
                int statusCode = e.getStatusCode().value();
                if ((statusCode == 429 || statusCode == 503) && attempt < maxRetries) {
                    if (currentPoolKey != null) { keyRotationService.recordError(currentPoolKey.getId(), errorMsg); currentPoolKey = null; currentApiKey = ""; }
                    int waitSec = 5;
                    try { java.util.regex.Matcher m = java.util.regex.Pattern.compile("retry in (\\d+)").matcher(errorMsg); if (m.find()) waitSec = Math.min(Integer.parseInt(m.group(1)) + 2, 10); } catch (Exception ignored) {}
                    Thread.sleep(waitSec * 1000L); continue;
                }
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("Gemini API Error: " + errorMsg, e);
            } catch (Exception e) {
                errorMsg = e.getMessage();
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("TOC Preview Error: " + errorMsg, e);
            } finally {
                long duration = System.currentTimeMillis() - startTime;
                int approxInput = prompt.length() / 4;
                int approxOutput = isSuccess ? 1000 : 0;
                aiBillingService.recordSystemAiUsage("Knowledge Hub", "TOC Preview", approxInput, approxOutput, duration, isSuccess, errorMsg);
            }
        }
        throw new RuntimeException("All API keys exhausted.");
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public com.testshaper.dto.SourceBookMasterDto extractAndSavePublicationInfo(UUID sourceBookId, UUID pageId) throws Exception {
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
                .orElseThrow(() -> new RuntimeException("Book not found"));
                
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
                .orElseThrow(() -> new RuntimeException("Page not found"));

        if (!page.getSourceBook().getId().equals(sourceBookId)) {
            throw new RuntimeException("Page does not belong to this book.");
        }
        
        String markdown = page.getExtractedMarkdown();
        if (markdown == null || markdown.isBlank()) {
            throw new RuntimeException("Page must be extracted first before analyzing publication info.");
        }

        String prompt = "Extract the publication info from the following text.\n" +
                "Return pure JSON format: { \"title\": \"\", \"authorName\": \"\", \"publisher\": \"\", \"firstPublished\": \"\", \"latestEdition\": \"\" }.\n" +
                "Extract cleanly and smartly. Find the names of publication, authors, and edition dates. Return standard formatting. If not found, leave as null.\n\nTEXT:\n" + markdown;
                
        String requestJson = "{ \"contents\": [ { \"parts\": [ { \"text\": " 
                           + objectMapper.writeValueAsString(prompt) 
                           + " } ] } ] }";
                           
        java.util.Map<String, String> aiSettings = generalSettingService.getGlobalSettings(com.testshaper.entity.GeneralSetting.SettingCategory.AI);
        int maxRetries = 2;
        String currentApiKey = "";
        com.testshaper.entity.AiApiKey currentPoolKey = null;
        String billingMode = aiSettings.getOrDefault("ai_google_mode", aiSettings.getOrDefault("ai_billing_mode", "FREE_POOL"));

        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            String model = aiSettings.getOrDefault("ai_model", "gemini-2.5-flash");
            if ("FREE_POOL".equals(billingMode)) {
                currentPoolKey = keyRotationService.getNextAvailableKey();
                if (currentPoolKey != null) {
                    currentApiKey = currentPoolKey.getApiKey();
                    if (currentPoolKey.getModel() != null && !currentPoolKey.getModel().isBlank()) model = currentPoolKey.getModel();
                }
            }
            if (currentApiKey.isBlank()) currentApiKey = aiSettings.getOrDefault("ai_api_key", "");
            if (currentApiKey.isBlank() || "******".equals(currentApiKey)) throw new RuntimeException("No API keys.");

            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + currentApiKey;
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<String> requestEntity = new org.springframework.http.HttpEntity<>(requestJson, headers);

            long startTime = System.currentTimeMillis();
            boolean isSuccess = false;
            String errorMsg = null;
            try {
                org.springframework.http.ResponseEntity<String> responseEntity = restTemplate.exchange(url, org.springframework.http.HttpMethod.POST, requestEntity, String.class);
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(responseEntity.getBody());
                com.fasterxml.jackson.databind.JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    String text = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                    int s = text.indexOf('{'); int e2 = text.lastIndexOf('}');
                    if (s >= 0 && e2 >= s) text = text.substring(s, e2 + 1);
                    com.fasterxml.jackson.databind.JsonNode obj = objectMapper.readTree(text);
                    if (currentPoolKey != null) keyRotationService.recordUsage(currentPoolKey.getId());
                    
                    if (obj.hasNonNull("title") && !obj.get("title").asText().isBlank() && !"null".equalsIgnoreCase(obj.get("title").asText())) book.setTitle(obj.get("title").asText());
                    if (obj.hasNonNull("authorName") && !obj.get("authorName").asText().isBlank() && !"null".equalsIgnoreCase(obj.get("authorName").asText())) book.setAuthorName(obj.get("authorName").asText());
                    if (obj.hasNonNull("publisher") && !obj.get("publisher").asText().isBlank() && !"null".equalsIgnoreCase(obj.get("publisher").asText())) book.setPublisher(obj.get("publisher").asText());
                    if (obj.hasNonNull("firstPublished") && !obj.get("firstPublished").asText().isBlank() && !"null".equalsIgnoreCase(obj.get("firstPublished").asText())) book.setFirstPublished(obj.get("firstPublished").asText());
                    if (obj.hasNonNull("latestEdition") && !obj.get("latestEdition").asText().isBlank() && !"null".equalsIgnoreCase(obj.get("latestEdition").asText())) book.setLatestEdition(obj.get("latestEdition").asText());
                    
                    sourceBookMasterRepository.save(book);
                    
                    com.testshaper.dto.SourceBookMasterDto dto = new com.testshaper.dto.SourceBookMasterDto();
                    dto.setId(book.getId());
                    dto.setTitle(book.getTitle());
                    dto.setAuthorName(book.getAuthorName());
                    dto.setPublisher(book.getPublisher());
                    dto.setCoverImageUrl(book.getCoverImageUrl());
                    dto.setFirstPublished(book.getFirstPublished());
                    dto.setLatestEdition(book.getLatestEdition());
                    dto.setLanguage(book.getLanguage());
                    dto.setBookType(book.getBookType());
                    if (book.getClassSubject() != null) {
                        dto.setClassSubjectId(book.getClassSubject().getId());
                        dto.setMappedSubjectName(book.getClassSubject().getSubject().getName());
                        dto.setMappedClassName(book.getClassSubject().getAcademicClass().getName());
                    }
                    isSuccess = true;
                    return dto;
                }
                errorMsg = "Empty AI response";
                throw new RuntimeException("Empty AI response");
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                errorMsg = e.getResponseBodyAsString();
                int statusCode = e.getStatusCode().value();
                if ((statusCode == 429 || statusCode == 503) && attempt < maxRetries) {
                    if (currentPoolKey != null) { keyRotationService.recordError(currentPoolKey.getId(), errorMsg); currentPoolKey = null; currentApiKey = ""; }
                    int waitSec = 5;
                    try { java.util.regex.Matcher m = java.util.regex.Pattern.compile("retry in (\\d+)").matcher(errorMsg); if (m.find()) waitSec = Math.min(Integer.parseInt(m.group(1)) + 2, 10); } catch (Exception ignored) {}
                    Thread.sleep(waitSec * 1000L); continue;
                }
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("Gemini API Error: " + errorMsg, e);
            } catch (Exception e) {
                errorMsg = e.getMessage();
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("Pub Info Extractor Error: " + errorMsg, e);
            } finally {
                long duration = System.currentTimeMillis() - startTime;
                int approxInput = prompt.length() / 4;
                int approxOutput = isSuccess ? 200 : 0;
                aiBillingService.recordSystemAiUsage("Knowledge Hub", "Publication Info", approxInput, approxOutput, duration, isSuccess, errorMsg);
            }
        }
        throw new RuntimeException("All API keys exhausted.");
    }

    @Override

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.testshaper.dto.KnowledgePageDto> getSourceBookPages(UUID sourceBookId) {
        // Need to add findBySourceBookId to KnowledgePageRepository but let's assume we can fetch by sourceBook
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Book not found"));

        return knowledgePageRepository.findBySourceBookIdOrderByPageNumberAsc(sourceBookId)
            .stream()
            .map(page -> com.testshaper.dto.KnowledgePageDto.builder()
                .id(page.getId())
                .sourceBookId(page.getSourceBook().getId())
                .sourceBookIndexId(page.getSourceBookIndex() != null ? page.getSourceBookIndex().getId() : null)
                .sourcePageNo(page.getPageNumber())
                .actualPageNo(page.getPageNumber() - (page.getSourceBook().getPdfPageOffset() != null ? page.getSourceBook().getPdfPageOffset() : 0))
                .imageUrl(page.getR2FilePath())
                .extractionStatus(page.getExtractionStatus().name())
                .extractedMarkdown(page.getExtractedMarkdown())
                .goldenMarkdown(page.getGoldenMarkdown())
                .isGolden(page.getGoldenMarkdown() != null && !page.getGoldenMarkdown().isBlank())
                .isPubInfo(page.getIsPubInfo() != null ? page.getIsPubInfo() : false)
                .isTocPage(page.getIsTocPage() != null ? page.getIsTocPage() : false)
                .createdAt(page.getCreatedAt())
                .updatedAt(page.getUpdatedAt())
                .build()
            )
            .collect(java.util.stream.Collectors.toList());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void deleteKnowledgePage(UUID sourceBookId, UUID pageId) {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Page not found"));
            
        if (!page.getSourceBook().getId().equals(sourceBookId)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Page does not belong to this book");
        }
        
        // Optional: Also delete from R2 Storage if needed
        // storageService.deleteFile(page.getR2FilePath());
        
        knowledgePageRepository.delete(page);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void updatePageFlags(UUID sourceBookId, UUID pageId, Boolean isPubInfo, Boolean isTocPage) {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Page not found"));
            
        if (!page.getSourceBook().getId().equals(sourceBookId)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Page does not belong to this book");
        }
        
        if (isPubInfo != null) page.setIsPubInfo(isPubInfo);
        if (isTocPage != null) page.setIsTocPage(isTocPage);
        
        knowledgePageRepository.save(page);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void reorderPagesBulk(UUID sourceBookId, java.util.Map<UUID, Integer> pageOrderMap) {
        List<com.testshaper.entity.KnowledgePage> pages = knowledgePageRepository.findBySourceBookIdOrderByPageNumberAsc(sourceBookId);
        
        for (com.testshaper.entity.KnowledgePage page : pages) {
            if (pageOrderMap.containsKey(page.getId())) {
                page.setPageNumber(pageOrderMap.get(page.getId()));
            }
        }
        
        knowledgePageRepository.saveAll(pages);
    }

    @Override
    public SourceBookMasterDto createSourceBook(SourceBookMasterDto dto) {
        SourceBookMaster entity = new SourceBookMaster();
        entity.setTitle(dto.getTitle());
        entity.setAuthorName(dto.getAuthorName());
        entity.setPublisher(dto.getPublisher());
        entity.setCoverImageUrl(dto.getCoverImageUrl());
        entity.setFirstPublished(dto.getFirstPublished());
        entity.setLatestEdition(dto.getLatestEdition());
        entity.setBookType(dto.getBookType());
        entity.setLanguage(dto.getLanguage());
        
        if (dto.getClassSubjectId() != null) {
            entity.setClassSubject(classSubjectRepository.findById(dto.getClassSubjectId()).orElse(null));
        }

        SourceBookMaster saved = sourceBookMasterRepository.save(entity);
        return mapToDto(saved);
    }

    @Override
    public List<SourceBookMasterDto> getAllSourceBooks() {
        List<SourceBookMaster> books = sourceBookMasterRepository.findByTenantIdOrderByCreatedAtDesc(TenantContext.getTenantId());
        return mapToDtos(books);
    }

    @Override
    public org.springframework.data.domain.Page<SourceBookMasterDto> getPaginatedSourceBooks(String searchTerm, String bookType, java.util.List<UUID> classSubjectIds, int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<SourceBookMaster> pageResult = sourceBookMasterRepository.searchBooks(TenantContext.getTenantId(), searchTerm, bookType, classSubjectIds, pageable);
        
        List<SourceBookMasterDto> dtos = mapToDtos(pageResult.getContent());
        return new org.springframework.data.domain.PageImpl<>(dtos, pageable, pageResult.getTotalElements());
    }

    @Override
    public void deleteSourceBook(UUID id) {
        sourceBookMasterRepository.deleteById(id);
    }

    @Override
    public SourceBookMasterDto getSourceBook(UUID id) {
        SourceBookMaster entity = sourceBookMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Source Book not found"));
        if(!"DEFAULT".equals(TenantContext.getTenantId()) && !entity.getTenantId().equals(TenantContext.getTenantId())) {
             throw new RuntimeException("Unauthorized");
        }
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public SourceBookMasterDto updateSourceBook(UUID id, SourceBookMasterDto dto) {
        SourceBookMaster entity = sourceBookMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Source Book not found"));

        if(!"DEFAULT".equals(TenantContext.getTenantId()) && !entity.getTenantId().equals(TenantContext.getTenantId())) {
             throw new RuntimeException("Unauthorized");
        }

        entity.setTitle(dto.getTitle());
        entity.setAuthorName(dto.getAuthorName());
        entity.setPublisher(dto.getPublisher());
        entity.setCoverImageUrl(dto.getCoverImageUrl());
        entity.setFirstPublished(dto.getFirstPublished());
        entity.setLatestEdition(dto.getLatestEdition());
        if (dto.getPdfPageOffset() != null) {
            entity.setPdfPageOffset(dto.getPdfPageOffset());
        }
        if(dto.getBookType() != null) {
            entity.setBookType(dto.getBookType());
        }
        if (dto.getLanguage() != null) {
            entity.setLanguage(dto.getLanguage());
        }
        
        if (dto.getClassSubjectId() != null) {
            entity.setClassSubject(classSubjectRepository.findById(dto.getClassSubjectId()).orElse(null));
        }

        return mapToDto(sourceBookMasterRepository.save(entity));
    }

    private List<SourceBookMasterDto> mapToDtos(List<SourceBookMaster> entities) {
        if (entities.isEmpty()) return java.util.Collections.emptyList();

        List<UUID> bookIds = entities.stream().map(SourceBookMaster::getId).collect(Collectors.toList());

        // Batch fetch stats
        java.util.Map<UUID, com.testshaper.repository.KnowledgePageRepository.KnowledgePageStatsProjection> pageStatsMap = knowledgePageRepository.getStatsForBooks(bookIds, com.testshaper.entity.KnowledgePage.ExtractionStatus.EXTRACTED)
                .stream().collect(Collectors.toMap(p -> p.getSourceBookId(), p -> p));
                
        java.util.Map<UUID, com.testshaper.repository.CurriculumDocumentChunkRepository.ChunkStatsProjection> chunkStatsMap = curriculumDocumentChunkRepository.getChunkStatsForBooks(bookIds)
                .stream().collect(Collectors.toMap(p -> p.getSourceBookId(), p -> p));
                
        java.util.Map<UUID, com.testshaper.entity.AiBulkExtractionJob> jobMap = aiBulkExtractionJobRepository.findLatestJobsForBooks(bookIds)
                .stream().collect(Collectors.toMap(j -> j.getSourceBook().getId(), j -> j, (j1, j2) -> j1)); // In case of duplicate, pick first

        return entities.stream().map(entity -> {
            SourceBookMasterDto dto = new SourceBookMasterDto();
            dto.setId(entity.getId());
            dto.setTitle(entity.getTitle());
            dto.setAuthorName(entity.getAuthorName());
            dto.setPublisher(entity.getPublisher());
            dto.setCoverImageUrl(entity.getCoverImageUrl());
            dto.setFirstPublished(entity.getFirstPublished());
            dto.setLatestEdition(entity.getLatestEdition());
            dto.setPdfPageOffset(entity.getPdfPageOffset());
            dto.setBookType(entity.getBookType());
            dto.setLanguage(entity.getLanguage());
            if (entity.getClassSubject() != null) {
                dto.setClassSubjectId(entity.getClassSubject().getId());
                dto.setMappedSubjectName(entity.getClassSubject().getSubject().getName());
                dto.setMappedClassName(entity.getClassSubject().getAcademicClass().getName());
            }

            com.testshaper.entity.AiBulkExtractionJob job = jobMap.get(entity.getId());
            if (job != null) {
                boolean isProc = job.getStatus() == com.testshaper.entity.AiBulkExtractionJob.JobStatus.QUEUED || job.getStatus() == com.testshaper.entity.AiBulkExtractionJob.JobStatus.IN_PROGRESS;
                dto.setIsProcessing(isProc);
                dto.setTotalPagesToProcess(job.getTotalPagesToProcess());
                dto.setProcessedPagesCount(job.getProcessedPagesCount());
            } else {
                dto.setIsProcessing(false);
                dto.setTotalPagesToProcess(0);
                dto.setProcessedPagesCount(0);
            }

            com.testshaper.repository.KnowledgePageRepository.KnowledgePageStatsProjection pStats = pageStatsMap.get(entity.getId());
            if (pStats != null) {
                dto.setTotalPages((int) pStats.getTotalPages());
                dto.setExtractedPages((int) pStats.getExtractedPages());
                dto.setGoldenPages((int) pStats.getGoldenPages());
            } else {
                dto.setTotalPages(0);
                dto.setExtractedPages(0);
                dto.setGoldenPages(0);
            }

            com.testshaper.repository.CurriculumDocumentChunkRepository.ChunkStatsProjection cStats = chunkStatsMap.get(entity.getId());
            if (cStats != null) {
                dto.setVectorizedChunks((int) cStats.getVectorizedChunks());
            } else {
                dto.setVectorizedChunks(0);
            }

            return dto;
        }).collect(Collectors.toList());
    }

    private SourceBookMasterDto mapToDto(SourceBookMaster entity) {
        SourceBookMasterDto dto = new SourceBookMasterDto();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setAuthorName(entity.getAuthorName());
        dto.setPublisher(entity.getPublisher());
        dto.setCoverImageUrl(entity.getCoverImageUrl());
        dto.setFirstPublished(entity.getFirstPublished());
        dto.setLatestEdition(entity.getLatestEdition());
        dto.setPdfPageOffset(entity.getPdfPageOffset());
        dto.setBookType(entity.getBookType());
        dto.setLanguage(entity.getLanguage());
        if (entity.getClassSubject() != null) {
            dto.setClassSubjectId(entity.getClassSubject().getId());
            dto.setMappedSubjectName(entity.getClassSubject().getSubject().getName());
            dto.setMappedClassName(entity.getClassSubject().getAcademicClass().getName());
        }
        
        // Fetch real-time job status instead of stale entity fields
        java.util.Optional<com.testshaper.entity.AiBulkExtractionJob> jobOpt = aiBulkExtractionJobRepository.findFirstBySourceBookIdOrderByCreatedAtDesc(entity.getId());
        if (jobOpt.isPresent()) {
            com.testshaper.entity.AiBulkExtractionJob job = jobOpt.get();
            boolean isProc = job.getStatus() == com.testshaper.entity.AiBulkExtractionJob.JobStatus.QUEUED || job.getStatus() == com.testshaper.entity.AiBulkExtractionJob.JobStatus.IN_PROGRESS;
            dto.setIsProcessing(isProc);
            dto.setTotalPagesToProcess(job.getTotalPagesToProcess());
            dto.setProcessedPagesCount(job.getProcessedPagesCount());
        } else {
            dto.setIsProcessing(false);
            dto.setTotalPagesToProcess(0);
            dto.setProcessedPagesCount(0);
        }
        
        // Populate Page Progress Stats
        dto.setTotalPages((int) knowledgePageRepository.countBySourceBookId(entity.getId()));
        dto.setExtractedPages((int) knowledgePageRepository.countBySourceBookIdAndExtractionStatus(entity.getId(), com.testshaper.entity.KnowledgePage.ExtractionStatus.EXTRACTED));
        dto.setGoldenPages((int) knowledgePageRepository.countGoldenPagesBySourceBookId(entity.getId()));
        dto.setVectorizedChunks(curriculumDocumentChunkRepository.countBySourceBookId(entity.getId()));
        
        return dto;
    }

    // --- Source Book Index Mapping ---
    @Override
    public List<com.testshaper.dto.SourceBookIndexDto> getSourceBookIndices(UUID sourceBookId) {
        return sourceBookIndexRepository.findBySourceBookIdOrderByStartPageAsc(sourceBookId)
                .stream()
                .map(idx -> {
                    com.testshaper.dto.SourceBookIndexDto dto = mapIndexToDto(idx);
                    dto.setPageCount(knowledgePageRepository.countBySourceBookIndexId(idx.getId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public com.testshaper.dto.SourceBookIndexDto createSourceBookIndex(UUID sourceBookId, com.testshaper.dto.SourceBookIndexDto dto) {
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
                .orElseThrow(() -> new RuntimeException("Book not found"));

        com.testshaper.entity.SourceBookIndex entity = new com.testshaper.entity.SourceBookIndex();
        entity.setSourceBook(book);
        entity.setIndexName(dto.getIndexName());
        entity.setStartPage(dto.getStartPage());
        entity.setEndPage(dto.getEndPage());
        entity.setCategoryName(dto.getCategoryName());
        entity.setAuthorName(dto.getAuthorName());

        if (dto.getMappedChapterId() != null) {
            entity.setMappedChapter(chapterRepository.findById(dto.getMappedChapterId()).orElse(null));
        }
        if (dto.getMappedTopicId() != null) {
            entity.setMappedTopic(topicRepository.findById(dto.getMappedTopicId()).orElse(null));
        }

        return mapIndexToDto(sourceBookIndexRepository.save(entity));
    }

    @Override
    public com.testshaper.dto.SourceBookIndexDto updateSourceBookIndex(UUID sourceBookId, UUID indexId, com.testshaper.dto.SourceBookIndexDto dto) {
        com.testshaper.entity.SourceBookIndex entity = sourceBookIndexRepository.findById(indexId)
                .orElseThrow(() -> new RuntimeException("Index not found"));
        if (!entity.getSourceBook().getId().equals(sourceBookId)) {
            throw new RuntimeException("Index does not belong to this book");
        }

        entity.setIndexName(dto.getIndexName());
        entity.setStartPage(dto.getStartPage());
        entity.setEndPage(dto.getEndPage());
        entity.setCategoryName(dto.getCategoryName());
        entity.setAuthorName(dto.getAuthorName());

        if (dto.getMappedChapterId() != null) {
            entity.setMappedChapter(chapterRepository.findById(dto.getMappedChapterId()).orElse(null));
        } else {
            entity.setMappedChapter(null);
        }
        
        if (dto.getMappedTopicId() != null) {
            entity.setMappedTopic(topicRepository.findById(dto.getMappedTopicId()).orElse(null));
        } else {
            entity.setMappedTopic(null);
        }

        return mapIndexToDto(sourceBookIndexRepository.save(entity));
    }

    @Override
    public void deleteSourceBookIndex(UUID sourceBookId, UUID indexId) {
        com.testshaper.entity.SourceBookIndex index = sourceBookIndexRepository.findById(indexId)
                .orElseThrow(() -> new RuntimeException("Index not found"));
        if (!index.getSourceBook().getId().equals(sourceBookId)) {
            throw new RuntimeException("Index does not belong to this book");
        }
        sourceBookIndexRepository.delete(index);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<Map<String, Object>> getTopicsAndChunksByIndex(UUID indexId) {
        com.testshaper.entity.SourceBookIndex index = sourceBookIndexRepository.findById(indexId)
                .orElseThrow(() -> new RuntimeException("Index not found"));

        if (index.getMappedChapter() == null) {
            return Collections.emptyList();
        }

        List<com.testshaper.entity.Topic> topics = new ArrayList<>(topicRepository.findByChapterId(index.getMappedChapter().getId()));
        
        // Fetch all chunks for this index
        List<com.testshaper.entity.CurriculumDocumentChunk> chunks = curriculumDocumentChunkRepository
                .findBySourceBookIndexIdIn(Collections.singletonList(indexId), org.springframework.data.domain.Pageable.unpaged())
                .getContent();

        // 1. Sort chunks by chunkIndex (which is sequential based on pages)
        List<com.testshaper.entity.CurriculumDocumentChunk> sortedChunks = chunks.stream()
                .sorted(java.util.Comparator.comparing(c -> c.getChunkIndex() == null ? 0 : c.getChunkIndex()))
                .collect(Collectors.toList());

        // 2. Order topics based on the appearance of their chunks in the sequence
        topics.sort(java.util.Comparator.comparingInt(t -> {
            return sortedChunks.stream()
                    .filter(c -> c.getMappedTopic() != null && c.getMappedTopic().getId().equals(t.getId()))
                    .mapToInt(c -> c.getChunkIndex() == null ? Integer.MAX_VALUE : c.getChunkIndex())
                    .min()
                    .orElse(Integer.MAX_VALUE);
        }));

        List<Map<String, Object>> result = new ArrayList<>();

        for (com.testshaper.entity.Topic topic : topics) {
            Map<String, Object> topicMap = new java.util.HashMap<>();
            topicMap.put("id", topic.getId());
            topicMap.put("name", topic.getName());

            List<Map<String, Object>> chunkList = sortedChunks.stream()
                    .filter(c -> c.getMappedTopic() != null && c.getMappedTopic().getId().equals(topic.getId()))
                    .map(c -> {
                        Map<String, Object> cMap = new java.util.HashMap<>();
                        cMap.put("id", c.getId());
                        cMap.put("chunkText", c.getChunkText());
                        cMap.put("pageNumber", c.getPageNumber());
                        cMap.put("tokenCount", c.getTokenCount());
                        cMap.put("isVisionExtracted", c.getIsVisionExtracted());
                        cMap.put("chunkIndex", c.getChunkIndex());
                        return cMap;
                    })
                    .collect(Collectors.toList());

            topicMap.put("chunks", chunkList);
            topicMap.put("chunkCount", chunkList.size());
            result.add(topicMap);
        }
        
        return result;
    }

    private com.testshaper.dto.SourceBookIndexDto mapIndexToDto(com.testshaper.entity.SourceBookIndex entity) {
        com.testshaper.dto.SourceBookIndexDto dto = new com.testshaper.dto.SourceBookIndexDto();
        dto.setId(entity.getId());
        dto.setSourceBookId(entity.getSourceBook().getId());
        dto.setIndexName(entity.getIndexName());
        dto.setStartPage(entity.getStartPage());
        dto.setEndPage(entity.getEndPage());
        dto.setCategoryName(entity.getCategoryName());
        dto.setAuthorName(entity.getAuthorName());
        if (entity.getMappedChapter() != null) {
            dto.setMappedChapterId(entity.getMappedChapter().getId());
        }
        if (entity.getMappedTopic() != null) {
            dto.setMappedTopicId(entity.getMappedTopic().getId());
        }
        return dto;
    }

    // --- Phase 3A: Page-to-Chapter Assignment ---

    @Override
    @Transactional
    public com.testshaper.dto.KnowledgePageDto assignPageToIndex(UUID sourceBookId, UUID pageId, UUID sourceBookIndexId) {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found"));

        if (!page.getSourceBook().getId().equals(sourceBookId)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Page does not belong to this book");
        }

        com.testshaper.entity.SourceBookIndex index = sourceBookIndexRepository.findById(sourceBookIndexId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter index not found"));

        page.setSourceBookIndex(index);
        com.testshaper.entity.KnowledgePage saved = knowledgePageRepository.save(page);

        return com.testshaper.dto.KnowledgePageDto.builder()
            .id(saved.getId())
            .sourceBookId(saved.getSourceBook().getId())
            .sourceBookIndexId(saved.getSourceBookIndex().getId())
            .sourcePageNo(saved.getPageNumber())
            .actualPageNo(saved.getPageNumber() - (saved.getSourceBook().getPdfPageOffset() != null ? saved.getSourceBook().getPdfPageOffset() : 0))
            .imageUrl(saved.getR2FilePath())
            .extractionStatus(saved.getExtractionStatus().name())
            .extractedMarkdown(saved.getExtractedMarkdown())
            .createdAt(saved.getCreatedAt())
            .updatedAt(saved.getUpdatedAt())
            .build();
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void autoAssignPagesBulk(UUID sourceBookId) {
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        List<com.testshaper.entity.SourceBookIndex> indices = sourceBookIndexRepository.findBySourceBookId(sourceBookId);
        int offset = book.getPdfPageOffset() != null ? book.getPdfPageOffset() : 0;

        // Auto-calculate missing end pages based on the next chapter's start page
        indices.sort(java.util.Comparator.comparing(idx -> idx.getStartPage() != null ? idx.getStartPage() : Integer.MAX_VALUE));
        for (int i = 0; i < indices.size() - 1; i++) {
            com.testshaper.entity.SourceBookIndex current = indices.get(i);
            com.testshaper.entity.SourceBookIndex next = indices.get(i + 1);
            if (current.getEndPage() == null && current.getStartPage() != null && next.getStartPage() != null) {
                current.setEndPage(next.getStartPage() - 1);
                sourceBookIndexRepository.save(current);
            }
        }

        // Assign pages to indices
        List<com.testshaper.entity.KnowledgePage> pages = knowledgePageRepository.findBySourceBookIdOrderByPageNumberAsc(sourceBookId);
        for (com.testshaper.entity.KnowledgePage page : pages) {
            int pdfPageNumber = page.getPageNumber();
            
            // Find matching index
            com.testshaper.entity.SourceBookIndex matchingIndex = null;
            for (com.testshaper.entity.SourceBookIndex idx : indices) {
                if (idx.getStartPage() != null) {
                    int expectedPdfStart = idx.getStartPage() + offset;
                    int expectedPdfEnd = idx.getEndPage() != null ? (idx.getEndPage() + offset) : Integer.MAX_VALUE;
                    
                    if (pdfPageNumber >= expectedPdfStart && pdfPageNumber <= expectedPdfEnd) {
                        matchingIndex = idx;
                        break;
                    }
                }
            }
            
            if (matchingIndex != null && !matchingIndex.equals(page.getSourceBookIndex())) {
                page.setSourceBookIndex(matchingIndex);
                knowledgePageRepository.save(page);
            } else if (matchingIndex == null && page.getSourceBookIndex() != null) {
                page.setSourceBookIndex(null);
                knowledgePageRepository.save(page);
            }
        }
    }

    @Override
    @Transactional
    public com.testshaper.dto.KnowledgePageDto unassignPageFromIndex(UUID sourceBookId, UUID pageId) {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found"));

        if (!page.getSourceBook().getId().equals(sourceBookId)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Page does not belong to this book");
        }

        page.setSourceBookIndex(null);
        com.testshaper.entity.KnowledgePage saved = knowledgePageRepository.save(page);

        return com.testshaper.dto.KnowledgePageDto.builder()
            .id(saved.getId())
            .sourceBookId(saved.getSourceBook().getId())
            .sourceBookIndexId(null)
            .sourcePageNo(saved.getPageNumber())
            .actualPageNo(saved.getPageNumber() - (saved.getSourceBook().getPdfPageOffset() != null ? saved.getSourceBook().getPdfPageOffset() : 0))
            .imageUrl(saved.getR2FilePath())
            .extractionStatus(saved.getExtractionStatus().name())
            .extractedMarkdown(saved.getExtractedMarkdown())
            .goldenMarkdown(saved.getGoldenMarkdown())
            .isGolden(saved.getGoldenMarkdown() != null && !saved.getGoldenMarkdown().isBlank())
            .createdAt(saved.getCreatedAt())
            .updatedAt(saved.getUpdatedAt())
            .build();
    }

    // --- Phase 3B: Golden Content Workflow ---

    @Override
    @Transactional
    public com.testshaper.dto.KnowledgePageDto markAsGolden(UUID sourceBookId, UUID pageId, String goldenMarkdown) {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found"));

        if (!page.getSourceBook().getId().equals(sourceBookId)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Page does not belong to this book");
        }

        // Save golden content and upgrade status
        page.setGoldenMarkdown(goldenMarkdown != null ? goldenMarkdown : page.getExtractedMarkdown());
        page.setExtractionStatus(com.testshaper.entity.KnowledgePage.ExtractionStatus.PROOFREAD);
        com.testshaper.entity.KnowledgePage saved = knowledgePageRepository.save(page);

        log.info("Page {} marked as golden for book {}", pageId, sourceBookId);

        return com.testshaper.dto.KnowledgePageDto.builder()
            .id(saved.getId())
            .sourceBookId(saved.getSourceBook().getId())
            .sourceBookIndexId(saved.getSourceBookIndex() != null ? saved.getSourceBookIndex().getId() : null)
            .sourcePageNo(saved.getPageNumber())
            .actualPageNo(saved.getPageNumber() - (saved.getSourceBook().getPdfPageOffset() != null ? saved.getSourceBook().getPdfPageOffset() : 0))
            .imageUrl(saved.getR2FilePath())
            .extractionStatus(saved.getExtractionStatus().name())
            .extractedMarkdown(saved.getExtractedMarkdown())
            .goldenMarkdown(saved.getGoldenMarkdown())
            .isGolden(true)
            .createdAt(saved.getCreatedAt())
            .updatedAt(saved.getUpdatedAt())
            .build();
    }

    // --- Background Tasks (Ai Queue) ---

    @Override
    @Transactional
    public com.testshaper.entity.AiBulkExtractionJob startAiExtractionQueue(UUID sourceBookId) {
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        // Reset any FAILED pages to PENDING so they can be retried
        java.util.List<com.testshaper.entity.KnowledgePage> failedPages = knowledgePageRepository.findBySourceBookIdAndExtractionStatusIn(
            sourceBookId, 
            java.util.List.of(com.testshaper.entity.KnowledgePage.ExtractionStatus.FAILED), 
            org.springframework.data.domain.Pageable.unpaged()
        ).getContent();
        
        for (com.testshaper.entity.KnowledgePage fp : failedPages) {
            fp.setExtractionStatus(com.testshaper.entity.KnowledgePage.ExtractionStatus.PENDING);
            knowledgePageRepository.save(fp);
        }

        // Check if there is already a running or queued job for this book
        java.util.Optional<com.testshaper.entity.AiBulkExtractionJob> existingOpt = aiBulkExtractionJobRepository.findFirstBySourceBookIdOrderByCreatedAtDesc(sourceBookId);
        
        long pendingPages = knowledgePageRepository.countBySourceBookIdAndExtractionStatusIn(
            sourceBookId, 
            java.util.List.of(
                com.testshaper.entity.KnowledgePage.ExtractionStatus.PENDING,
                com.testshaper.entity.KnowledgePage.ExtractionStatus.FAILED
            )
        );
        if (pendingPages == 0) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending or failed pages found to extract.");
        }

        com.testshaper.entity.AiBulkExtractionJob job;
        if (existingOpt.isPresent()) {
            job = existingOpt.get();
            job.setStatus(com.testshaper.entity.AiBulkExtractionJob.JobStatus.QUEUED);
            // Recalculate remaining
            job.setTotalPagesToProcess(job.getProcessedPagesCount() + job.getFailedPagesCount() + (int) pendingPages);
        } else {
            job = new com.testshaper.entity.AiBulkExtractionJob();
            job.setSourceBook(book);
            job.setTenantId(book.getTenantId());
            job.setStatus(com.testshaper.entity.AiBulkExtractionJob.JobStatus.QUEUED);
            job.setTotalPagesToProcess((int) pendingPages);
            job.setProcessedPagesCount(0);
            job.setFailedPagesCount(0);
        }

        return aiBulkExtractionJobRepository.save(job);
    }

    @Override
    @Transactional(readOnly = true)
    public com.testshaper.entity.AiBulkExtractionJob getAiExtractionQueueStatus(UUID sourceBookId) {
        return aiBulkExtractionJobRepository.findFirstBySourceBookIdOrderByCreatedAtDesc(sourceBookId).orElse(null);
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiBulkExtractionJob pauseAiExtractionQueue(UUID jobId) {
        com.testshaper.entity.AiBulkExtractionJob job = aiBulkExtractionJobRepository.findById(jobId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        job.setStatus(com.testshaper.entity.AiBulkExtractionJob.JobStatus.PAUSED);
        return aiBulkExtractionJobRepository.save(job);
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiBulkExtractionJob resumeAiExtractionQueue(UUID jobId) {
        com.testshaper.entity.AiBulkExtractionJob job = aiBulkExtractionJobRepository.findById(jobId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        job.setStatus(com.testshaper.entity.AiBulkExtractionJob.JobStatus.QUEUED);
        return aiBulkExtractionJobRepository.save(job);
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiBulkExtractionJob cancelAiExtractionQueue(UUID jobId) {
        com.testshaper.entity.AiBulkExtractionJob job = aiBulkExtractionJobRepository.findById(jobId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        if (job.getStatus() != com.testshaper.entity.AiBulkExtractionJob.JobStatus.COMPLETED) {
            job.setStatus(com.testshaper.entity.AiBulkExtractionJob.JobStatus.CANCELLED);
            return aiBulkExtractionJobRepository.save(job);
        }
        return job;
    }

    // --- Background Tasks (Ai Question Generation Queue) ---

    @Override
    @Transactional
    public com.testshaper.entity.AiQuestionGenerationJob startAiQuestionQueue(UUID sourceBookId, com.testshaper.dto.AiQuestionGenConfigDto config) {
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        java.util.Optional<com.testshaper.entity.AiQuestionGenerationJob> existingOpt = aiQuestionGenerationJobRepository.findFirstBySourceBookIdOrderByCreatedAtDesc(sourceBookId);
        long pendingChunks = 0;
        
        if (config != null && config.getTargetIndexIds() != null && !config.getTargetIndexIds().isEmpty()) {
            pendingChunks = curriculumDocumentChunkRepository.countBySourceBookIndexIdIn(config.getTargetIndexIds());
            if (pendingChunks == 0) {
                // Fallback for legacy extracted chunks without sourceBookIndexId
                java.util.List<UUID> targetChapterIds = new java.util.ArrayList<>();
                for (UUID idxId : config.getTargetIndexIds()) {
                    com.testshaper.entity.SourceBookIndex idx = sourceBookIndexRepository.findById(idxId).orElse(null);
                    if (idx != null && idx.getMappedChapter() != null) {
                        targetChapterIds.add(idx.getMappedChapter().getId());
                    }
                }
                if (!targetChapterIds.isEmpty()) {
                    pendingChunks = curriculumDocumentChunkRepository.countBySourceBookIdAndMappedTopic_Chapter_IdIn(sourceBookId, targetChapterIds);
                }
            }
        } else {
            pendingChunks = curriculumDocumentChunkRepository.countBySourceBookId(sourceBookId);
        }
        
        if (pendingChunks == 0) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "No vector topic chunks found. Please Extract Topics & Sync first.");
        }

        String configJson = null;
        if (config != null) {
            try {
                configJson = objectMapper.writeValueAsString(config);
            } catch (Exception e) {
                log.error("Failed to serialize Question Config", e);
            }
        }

        com.testshaper.entity.AiQuestionGenerationJob job;
        if (existingOpt.isPresent()) {
            job = existingOpt.get();
            job.setStatus(com.testshaper.entity.AiQuestionGenerationJob.JobStatus.QUEUED);
            job.setTotalPagesToProcess((int) pendingChunks);
            job.setProcessedPagesCount(0);
            job.setFailedPagesCount(0);
            job.setJobConfiguration(configJson);
        } else {
            job = new com.testshaper.entity.AiQuestionGenerationJob();
            job.setSourceBook(book);
            job.setTenantId(book.getTenantId());
            job.setStatus(com.testshaper.entity.AiQuestionGenerationJob.JobStatus.QUEUED);
            job.setTotalPagesToProcess((int) pendingChunks);
            job.setProcessedPagesCount(0);
            job.setFailedPagesCount(0);
            job.setJobConfiguration(configJson);
        }

        return aiQuestionGenerationJobRepository.save(job);
    }

    @Override
    public com.testshaper.entity.AiQuestionGenerationJob getAiQuestionQueueStatus(UUID sourceBookId) {
        return aiQuestionGenerationJobRepository.findFirstBySourceBookIdOrderByCreatedAtDesc(sourceBookId).orElse(null);
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiQuestionGenerationJob pauseAiQuestionQueue(UUID jobId) {
        com.testshaper.entity.AiQuestionGenerationJob job = aiQuestionGenerationJobRepository.findById(jobId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        job.setStatus(com.testshaper.entity.AiQuestionGenerationJob.JobStatus.PAUSED);
        return aiQuestionGenerationJobRepository.save(job);
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiQuestionGenerationJob resumeAiQuestionQueue(UUID jobId) {
        com.testshaper.entity.AiQuestionGenerationJob job = aiQuestionGenerationJobRepository.findById(jobId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        job.setStatus(com.testshaper.entity.AiQuestionGenerationJob.JobStatus.QUEUED);
        return aiQuestionGenerationJobRepository.save(job);
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiQuestionGenerationJob cancelAiQuestionQueue(UUID jobId) {
        com.testshaper.entity.AiQuestionGenerationJob job = aiQuestionGenerationJobRepository.findById(jobId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        if (job.getStatus() != com.testshaper.entity.AiQuestionGenerationJob.JobStatus.COMPLETED) {
            job.setStatus(com.testshaper.entity.AiQuestionGenerationJob.JobStatus.CANCELLED);
            return aiQuestionGenerationJobRepository.save(job);
        }
        return job;
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiTopicExtractionJob startAiTopicExtractionQueue(UUID sourceBookId, java.util.List<UUID> targetIndexIds) {
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        java.util.Optional<com.testshaper.entity.AiTopicExtractionJob> existingOpt = aiTopicExtractionJobRepository.findTopBySourceBookIdOrderByCreatedAtDesc(sourceBookId);
        
        com.testshaper.entity.AiTopicExtractionJob job;
        if (existingOpt.isPresent()) {
            job = existingOpt.get();
            job.setStatus(com.testshaper.entity.AiTopicExtractionJob.JobStatus.QUEUED);
            job.setProcessedChaptersCount(0);
            job.setFailedChaptersCount(0);
            job.setTotalChaptersToProcess(targetIndexIds != null ? targetIndexIds.size() : 0);
        } else {
            job = new com.testshaper.entity.AiTopicExtractionJob();
            job.setSourceBook(book);
            job.setTenantId(book.getTenantId());
            job.setStatus(com.testshaper.entity.AiTopicExtractionJob.JobStatus.QUEUED);
            job.setTotalChaptersToProcess(targetIndexIds != null ? targetIndexIds.size() : 0);
            job.setProcessedChaptersCount(0);
            job.setFailedChaptersCount(0);
        }
        return aiTopicExtractionJobRepository.save(job);
    }

    @Override
    public com.testshaper.entity.AiTopicExtractionJob getAiTopicExtractionQueueStatus(UUID sourceBookId) {
        return aiTopicExtractionJobRepository.findTopBySourceBookIdOrderByCreatedAtDesc(sourceBookId).orElse(null);
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiTopicExtractionJob pauseAiTopicExtractionQueue(UUID jobId) {
        com.testshaper.entity.AiTopicExtractionJob job = aiTopicExtractionJobRepository.findById(jobId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        job.setStatus(com.testshaper.entity.AiTopicExtractionJob.JobStatus.PAUSED);
        return aiTopicExtractionJobRepository.save(job);
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiTopicExtractionJob resumeAiTopicExtractionQueue(UUID jobId) {
        com.testshaper.entity.AiTopicExtractionJob job = aiTopicExtractionJobRepository.findById(jobId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        job.setStatus(com.testshaper.entity.AiTopicExtractionJob.JobStatus.QUEUED);
        return aiTopicExtractionJobRepository.save(job);
    }

    @Override
    @Transactional
    public com.testshaper.entity.AiTopicExtractionJob cancelAiTopicExtractionQueue(UUID jobId) {
        com.testshaper.entity.AiTopicExtractionJob job = aiTopicExtractionJobRepository.findById(jobId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        if (job.getStatus() != com.testshaper.entity.AiTopicExtractionJob.JobStatus.COMPLETED) {
            job.setStatus(com.testshaper.entity.AiTopicExtractionJob.JobStatus.CANCELLED);
            return aiTopicExtractionJobRepository.save(job);
        }
        return job;
    }

    @Override
    @Transactional
    public int generateQuestionsForChunk(UUID sourceBookId, UUID chunkId, String jobConfigurationJson) throws Exception {
        com.testshaper.entity.CurriculumDocumentChunk chunk = curriculumDocumentChunkRepository.findById(chunkId)
            .orElseThrow(() -> new RuntimeException("Vector Chunk not found"));

        if (!chunk.getSourceBook().getId().equals(sourceBookId)) {
            throw new RuntimeException("Chunk does not belong to this book.");
        }

        com.testshaper.dto.AiQuestionGenConfigDto config = null;
        if (jobConfigurationJson != null) {
            try { config = objectMapper.readValue(jobConfigurationJson, com.testshaper.dto.AiQuestionGenConfigDto.class); } catch (Exception ignored) {}
        }

        String pageSourceRef = "chunk_" + chunkId.toString();
        boolean alreadyHasDrafts = questionRepository.existsBySourceReferenceAndStatus(pageSourceRef, com.testshaper.entity.Question.QuestionStatus.DRAFT);
        
        if (alreadyHasDrafts && config == null) {
            log.info("Chunk {} already has DRAFT questions. Skipping generation to prevent duplicates.", chunkId);
            return 0; // successfully skipped
        }

        String markdown = chunk.getChunkText();

        if (markdown == null || markdown.isBlank()) {
            throw new RuntimeException("Chunk must have text before generating questions.");
        }

        SourceBookMaster book = chunk.getSourceBook();
        com.testshaper.entity.ClassSubject classSubject = book.getClassSubject();
        
        String ruleSchema = "[\n" +
            "  {\n" +
            "    \"questionType\": \"MULTIPLE_CHOICE\",\n" +
            "    \"questionText\": \"Sample AI Question WITHOUT serial number\",\n" +
            "    \"stimulus\": \"![alt](url) or contextual text. VERY IMPORTANT for images!\",\n" +
            "    \"options\": [\"Option 1\", \"Option 2\", \"Option 3\", \"Option 4\"],\n" +
            "    \"answer\": \"Option 1\",\n" +
            "    \"marks\": 1.0,\n" +
            "    \"explanation\": \"Because context says so.\",\n" +
            "    \"bloomLevel\": \"REMEMBERING\",\n" +
            "    \"difficulty\": \"MEDIUM\"\n" +
            "  },\n" +
            "  {\n" +
            "    \"questionType\": \"CREATIVE\",\n" +
            "    \"questionText\": \"Scenario based broad question (CQ) or descriptive question\",\n" +
            "    \"stimulus\": \"Context paragraph or image here\",\n" +
            "    \"options\": [],\n" +
            "    \"answer\": \"Detailed text grading rubric and sample answer\",\n" +
            "    \"marks\": 4.0,\n" +
            "    \"explanation\": \"\",\n" +
            "    \"bloomLevel\": \"APPLYING\",\n" +
            "    \"difficulty\": \"HARD\"\n" +
            "  },\n" +
            "  {\n" +
            "    \"questionType\": \"SHORT_ANSWER\",\n" +
            "    \"questionText\": \"Short explicit question\",\n" +
            "    \"stimulus\": \"Context if necessary\",\n" +
            "    \"options\": [],\n" +
            "    \"answer\": \"Short text description\",\n" +
            "    \"marks\": 2.0,\n" +
            "    \"explanation\": \"\",\n" +
            "    \"bloomLevel\": \"UNDERSTANDING\",\n" +
            "    \"difficulty\": \"MEDIUM\"\n" +
            "  }\n" +
            "]";

        boolean schemaFound = false;
        if (config != null && config.getSelectedSchema() != null && !config.getSelectedSchema().isBlank()) {
            try {
                com.testshaper.entity.AiKnowledgeBase kbSchema = aiKnowledgeBaseRepository.findById(java.util.UUID.fromString(config.getSelectedSchema())).orElse(null);
                if (kbSchema != null && kbSchema.getContent() != null && !kbSchema.getContent().isBlank()) {
                    ruleSchema = kbSchema.getContent();
                    schemaFound = true;
                }
            } catch (Exception e) { /* ignored fallback */ }
        }
        
        if (!schemaFound && classSubject != null && classSubject.getSubject() != null) {
            String subjectName = classSubject.getSubject().getName();
            String tagToSearch = "RULE_FOR_" + subjectName.replaceAll("\\s+", "");
            java.util.List<com.testshaper.entity.AiKnowledgeBase> rules = aiKnowledgeBaseRepository.findActiveCurriculumRules(tagToSearch);
            if (!rules.isEmpty()) {
                ruleSchema = rules.get(0).getContent(); 
            }
        }
        
        String generationGuidelines = "";
        try {
            com.fasterxml.jackson.databind.JsonNode rootSchemaNode = objectMapper.readTree(ruleSchema);
            if (rootSchemaNode.isObject() && rootSchemaNode.has("scraping_rules")) {
                if (rootSchemaNode.has("generation_rules") && rootSchemaNode.get("generation_rules").isObject()) {
                    com.fasterxml.jackson.databind.JsonNode genRules = rootSchemaNode.get("generation_rules");
                    if (genRules.hasNonNull("guidelines")) {
                        generationGuidelines = "8. **SPECIAL CURRICULUM GUIDELINES**: " + genRules.get("guidelines").asText() + "\n";
                    }
                    if (genRules.hasNonNull("language")) {
                        String lang = genRules.get("language").asText();
                        generationGuidelines += "9. **SCHEMA REQUESTED LANGUAGE**: As a fallback, if book version is not set, use " + lang + " language.\n";
                    }
                }
                if (rootSchemaNode.has("generation_blueprint") && rootSchemaNode.get("generation_blueprint").isObject()) {
                    com.fasterxml.jackson.databind.JsonNode blueprint = rootSchemaNode.get("generation_blueprint");
                    if (blueprint.hasNonNull("bloom_target") && blueprint.get("bloom_target").isObject()) {
                        generationGuidelines += "10. **BLOOM'S TAXONOMY TARGETS**: Distribute the questions across these cognitive levels based on the curriculum blueprint: " + blueprint.get("bloom_target").toString() + ".\n";
                    }
                }
                com.fasterxml.jackson.databind.JsonNode scrapingRules = rootSchemaNode.get("scraping_rules");
                ruleSchema = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(scrapingRules);
            }
        } catch (Exception e) {
            // Ignored, schema might be the old flat array format
        }

        // Always force inject the stimulus property if user forgot it in their DB rule
        if (ruleSchema != null && !ruleSchema.contains("\"stimulus\"")) {
            ruleSchema = ruleSchema.replaceFirst("\\{", "\\{\n    \"stimulus\": \"![alt](url) or contextual text. VERY IMPORTANT for images!\",");
        }



        String sourceTypeInstruction = "";
        String bType = "TEXTBOOK";
        if (config != null && config.getSourceType() != null && !config.getSourceType().isBlank()) {
            bType = config.getSourceType().toUpperCase();
        } else if (book != null && book.getBookType() != null) {
            bType = book.getBookType().name();
        }

        if ("GUIDE".equals(bType) || "QUESTION_BANK".equals(bType) || "GUIDEBOOK".equals(bType)) {
            sourceTypeInstruction = "The source material is a GUIDEBOOK, TEST-PAPER, or QUESTION BANK. It contains existing questions and answers. **CRITICAL**: Extract the EXACT questions from the text and put their correct answers from the text. Do NOT make up or hallucinate new questions.\n";
        } else if ("HYBRID".equals(bType) || "BOTH".equals(bType)) {
            sourceTypeInstruction = "The source material contains BOTH educational theories AND existing exercise questions. **HYBRID INSTRUCTION**: 1. Accurately EXTRACT any existing questions you find exactly as they are. AND 2. GENERATE new, high-quality, creative questions based on the theory sections.\n";
        } else {
            sourceTypeInstruction = "The source material is a TEXTBOOK. It contains educational theories and possibly some chapter-end exercises.\n";
        }

        String requestedTypesStr = "";
        if (config != null && config.getTargetQuestionTypes() != null && !config.getTargetQuestionTypes().isEmpty()) {
            requestedTypesStr = "6. **TARGET QUESTION TYPES**: Your response is STRICTLY restricted to only these types: [" + String.join(", ", config.getTargetQuestionTypes()) + "]. Do NOT generate or extract any question types outside of this list.\n";
            if (config.getTargetQuestionTypes().contains("MULTIPLE_CHOICE") || config.getTargetQuestionTypes().contains("MCQ")) {
                requestedTypesStr += "6.1 **MULTIPLE CHOICE TYPES (CRITICAL)**: Include a mix of 'SIMPLE' MCQs, 'MULTIPLE_COMPLETION' (বহুপদী) MCQs, and 'SITUATION_SET' (অভিন্ন তথ্যভিত্তিক) MCQs.\n" +
                                     "  - For MULTIPLE_COMPLETION, include a 'statements' array (e.g. [\"i. st 1\", \"ii. st 2\", \"iii. st 3\"]) and set 'mcqType' to 'MULTIPLE_COMPLETION'. Make 'options' combinations (e.g. 'i ও ii').\n" +
                                     "  - For SITUATION_SET, group 2-3 questions sharing the EXACT SAME 'stimulus' text/image, and set 'mcqType' to 'SITUATION_SET'.\n";
            }
        }

        String bookLanguageInstruction = "";
        if (book != null && book.getLanguage() != null && !book.getLanguage().isBlank()) {
            bookLanguageInstruction = "7. **LANGUAGE VERSION**: The source material is in [" + book.getLanguage() + "] version. You MUST generate or extract the questions exactly in [" + book.getLanguage() + "] language. If the version is English, output strictly in English. If Bangla, output strictly in Bangla. If Bilingual, follow the source text format.\n";
        }

        String prompt = "You are an expert curriculum question setter and data parser. Read the provided TEXT context below.\n" +
                        "INSTRUCTIONS:\n" +
                        sourceTypeInstruction +
                        "1. If the text contains existing examination questions or exercises, your primary task is to **EXTRACT EXACT EXISTING QUESTIONS**. Do NOT make up variations.\n" +
                        "2. If the text is an educational chapter with NO existing questions, your task is to **GENERATE high-quality questions** based on the theories inside.\n" +
                        "3. If the text is just a Table of Contents (সূচিপত্র/Index), Title Page, Copyright Page, or noise, do **NOT** generate questions. Simply return an empty JSON array [].\n" +
                        "4. **PRESERVE IMAGES (CRITICAL):** If the markdown text contains images `![alt](url)`, you MUST pair them with the appropriate question! Put the image markdown in the `stimulus` field or `questionText` field. Do NOT lose the image link!\n" +
                        "5. **STRIP NUMBERS:** Remove any serial numbers (e.g. '1. ', '১। ', 'Q:') from the beginning of `questionText`.\n" +
                        requestedTypesStr +
                        bookLanguageInstruction +
                        generationGuidelines +
                        "CRITICAL: You MUST strictly conform to the following JSON Schema array. Do not return any conversational text, ONLY a raw JSON array.\n\n" +
                        "TARGET JSON SCHEMA:\n" +
                        ruleSchema + "\n\n" +
                        "FOCUS ON THE FOLLOWING TOPIC: " + (chunk.getMappedTopic() != null ? chunk.getMappedTopic().getName() : "Unknown") + "\n\n" +
                        "VECTOR CHUNK CONTEXT:\n" + markdown;

        java.util.Map<String, String> aiSettings = generalSettingService.getGlobalSettings(com.testshaper.entity.GeneralSetting.SettingCategory.AI);
        String billingMode = aiSettings.getOrDefault("ai_billing_mode", aiSettings.getOrDefault("ai_google_mode", "FREE_POOL"));
        if ("FREE_POOL".equalsIgnoreCase(aiSettings.get("ai_google_mode"))) {
            billingMode = "FREE_POOL";
        }
        int maxRetries = "FREE_POOL".equals(billingMode) ? 9 : 1;

        java.util.Map<String, Object> requestBody = java.util.Map.of(
            "contents", java.util.List.of(
                java.util.Map.of("parts", java.util.List.of(
                    java.util.Map.of("text", prompt)
                ))
            ),
            "generationConfig", java.util.Map.of(
                "temperature", 0.3,
                "topP", 0.95,
                "responseMimeType", "application/json"
            )
        );

        String requestJson = objectMapper.writeValueAsString(requestBody);
        String currentApiKey = "";
        com.testshaper.entity.AiApiKey currentPoolKey = null;

        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            String model = aiSettings.getOrDefault("ai_model", "gemini-1.5-pro");
            if ("FREE_POOL".equals(billingMode)) {
                currentPoolKey = keyRotationService.getNextAvailableKey();
                if (currentPoolKey != null) {
                    currentApiKey = currentPoolKey.getApiKey();
                    if (currentPoolKey.getModel() != null && !currentPoolKey.getModel().isBlank()) {
                        model = currentPoolKey.getModel();
                    }
                }
            } else {
                currentApiKey = aiSettings.getOrDefault("ai_api_key", "");
            }

            if (currentApiKey.isBlank()) {
                throw new RuntimeException("No available API keys.");
            }

            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + currentApiKey;
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(requestJson, headers);

            long startTime = System.currentTimeMillis();
            boolean isSuccess = false;
            String errorMsg = null;
            try {
                log.info("Generating questions (attempt {}/{}) with key '{}'", attempt + 1, maxRetries + 1,
                        currentPoolKey != null ? currentPoolKey.getKeyName() : "global");
                org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.POST, entity, String.class);

                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(response.getBody());
                com.fasterxml.jackson.databind.JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    com.fasterxml.jackson.databind.JsonNode parts = candidates.get(0).path("content").path("parts");
                    if (parts.isArray() && parts.size() > 0) {
                        String rawJsonResponse = parts.get(0).path("text").asText();
                        
                        com.fasterxml.jackson.databind.JsonNode questionsArray = objectMapper.readTree(rawJsonResponse);
                        if (!questionsArray.isArray()) {
                            if (questionsArray.isObject() && questionsArray.has("question_formats") && questionsArray.get("question_formats").isArray()) {
                                questionsArray = questionsArray.get("question_formats");
                            } else if (questionsArray.isObject() && questionsArray.has("questions") && questionsArray.get("questions").isArray()) {
                                questionsArray = questionsArray.get("questions");
                            } else {
                                throw new RuntimeException("AI Response was not a JSON Array.");
                            }
                        }

                        int savedCount = 0;
                        for (com.fasterxml.jackson.databind.JsonNode rootNode : questionsArray) {
                            com.fasterxml.jackson.databind.JsonNode qNode = (rootNode.has("question") && rootNode.get("question").isObject()) ? rootNode.get("question") : rootNode;

                            com.testshaper.entity.Question q = new com.testshaper.entity.Question();
                            q.setTenantId(book.getTenantId());
                            q.setClassSubject(book.getClassSubject());
                            
                            if (chunk.getMappedTopic() != null && chunk.getMappedTopic().getChapter() != null) {
                                q.setChapter(chunk.getMappedTopic().getChapter());
                                q.setTopic(chunk.getMappedTopic());
                            }

                            q.setType("MCQ");
                            if (qNode.hasNonNull("questionType") || qNode.hasNonNull("type")) {
                                try {
                                    String typeStr = qNode.hasNonNull("questionType") ? qNode.get("questionType").asText().toUpperCase() : qNode.get("type").asText().toUpperCase();
                                    if (typeStr.equals("MULTIPLE_CHOICE") || typeStr.equals("MCQ")) {
                                        q.setType("MCQ");
                                    } else if (typeStr.equals("CREATIVE") || typeStr.equals("CQ")) {
                                        q.setType("CQ");
                                    } else if (typeStr.equals("SHORT_ANSWER") || typeStr.equals("SHORT")) {
                                        q.setType("SHORT");
                                    } else if (typeStr.equals("TRUE_FALSE")) {
                                        q.setType("TRUE_FALSE");
                                    } else {
                                        q.setType(typeStr);
                                    }
                                } catch (Exception ignored) {}
                            }
                            
                            if (qNode.hasNonNull("mcqType")) {
                                q.setMcqType(qNode.get("mcqType").asText());
                            }

                            String qText = qNode.hasNonNull("questionText") ? qNode.get("questionText").asText() : 
                                           (rootNode.hasNonNull("question") && rootNode.get("question").isTextual() ? rootNode.get("question").asText() : "");
                            
                            if (qText.isBlank() && !qNode.path("stimulus").asText().isBlank()) {
                                // If there is a stimulus but no question text, we can leave it blank
                            } else if (qText.isBlank()) {
                                qText = "Generated Question";
                            }
                            qText = qText.replaceFirst("^\\s*(?:\\(|\\[)?\\s*(?:[\\d০-৯]+|[a-zA-Zক-ষ]+)\\s*(?:\\)|\\]|[\\.\\-:])\\s*", "");
                            
                            // Merge sub_parts for CQ into question text
                            StringBuilder explanationBuilder = new StringBuilder();
                            if (rootNode.hasNonNull("sub_parts") && rootNode.get("sub_parts").isArray()) {
                                StringBuilder stemHtmlBuilder = new StringBuilder();
                                
                                String stemSource = qText;
                                if (qNode.hasNonNull("stimulus") && !qNode.get("stimulus").asText().isBlank()) {
                                    stemSource = qNode.get("stimulus").asText();
                                } else if (rootNode.hasNonNull("stimulus") && !rootNode.get("stimulus").asText().isBlank()) {
                                    stemSource = rootNode.get("stimulus").asText();
                                }
                                
                                // Format the stem inside cq-stem struct, just like CQCreate.jsx
                                stemHtmlBuilder.append("<div class=\"cq-stem\">").append(stemSource).append("</div>");
                                
                                // Explicitly set it on q.setStimulus
                                q.setStimulus(stemSource); 

                                StringBuilder cqBuilder = new StringBuilder();
                                cqBuilder.append(stemHtmlBuilder).append("<div class=\"cq-questions\"><ol type=\"a\">");

                                StringBuilder answersHtmlBuilder = new StringBuilder("<div class=\"cq-answers\">");
                                StringBuilder explanationsHtmlBuilder = new StringBuilder("<div class=\"cq-explanations\">");

                                for (com.fasterxml.jackson.databind.JsonNode sp : rootNode.get("sub_parts")) {
                                    String part = sp.hasNonNull("part_label") ? sp.get("part_label").asText() : sp.path("part").asText("");
                                    String sqText = sp.hasNonNull("question") ? sp.get("question").asText() : sp.path("questionText").asText("");
                                    sqText = sqText.replaceFirst("^\\s*(?:\\(|\\[)?\\s*(?:[\\d০-৯]+|[a-zA-Zক-ষ]+)\\s*(?:\\)|\\]|[\\.\\-:])\\s*", "");
                                    String ans = sp.hasNonNull("answer") ? sp.get("answer").asText() : "";
                                    String hint = sp.path("answer_hint").asText(sp.path("explanation").asText(""));
                                    Double m = sp.hasNonNull("part_mark") ? sp.get("part_mark").asDouble() : sp.path("marks").asDouble(1.0);
                                    
                                    // HTML formatting matches exactly what the frontend uses
                                    cqBuilder.append("<li data-marks=\"").append(m).append("\">")
                                             .append("<span class=\"cq-text\">").append(sqText).append("</span>")
                                             .append(" <span class=\"cq-marks\">(").append(m).append(")</span></li>");
                                    
                                    if(!ans.isBlank()) {
                                        answersHtmlBuilder.append("<div class=\"cq-ans-part\" data-label=\"").append(part).append("\" style=\"margin-bottom:8px;\">");
                                        answersHtmlBuilder.append("<strong>").append(part).append(") উত্তর:</strong> <span class=\"cq-ans-content\">").append(ans).append("</span></div>");
                                    }
                                    if(!hint.isBlank()) {
                                        explanationsHtmlBuilder.append("<div class=\"cq-exp-part\" data-label=\"").append(part).append("\" style=\"margin-bottom:8px;\">");
                                        explanationsHtmlBuilder.append("<strong>").append(part).append(") ব্যাখ্যা:</strong> <span class=\"cq-exp-content\">").append(hint).append("</span></div>");
                                        explanationBuilder.append(part).append(") ").append(hint).append("\n"); // Fallback
                                    }
                                }
                                cqBuilder.append("</ol></div>");
                                answersHtmlBuilder.append("</div>");
                                explanationsHtmlBuilder.append("</div>");
                                
                                qText = cqBuilder.toString();
                                
                                if (answersHtmlBuilder.length() > 25) {
                                    q.setCorrectAnswer(answersHtmlBuilder.toString());
                                }
                                if (explanationsHtmlBuilder.length() > 30) {
                                    q.setExplanation(explanationsHtmlBuilder.toString());
                                }
                            }
                            
                            q.setQuestionText(qText);
                            
                            if (q.getStimulus() == null || q.getStimulus().isBlank()) {
                                if (qNode.hasNonNull("stimulus")) {
                                    q.setStimulus(qNode.get("stimulus").asText());
                                } else if (rootNode.hasNonNull("stimulus")) {
                                    q.setStimulus(rootNode.get("stimulus").asText());
                                }
                            }

                            q.setMarks(qNode.hasNonNull("marks") ? qNode.get("marks").asDouble() : 1.0);
                            q.setNegativeMarks(0.0);
                            q.setCorrectAnswer(qNode.path("answer").asText(null));
                            
                            // Parse Statements for Multiple Completion Type
                            if ((rootNode.hasNonNull("statements") && rootNode.get("statements").isArray()) || (qNode.hasNonNull("statements") && qNode.get("statements").isArray())) {
                                com.fasterxml.jackson.databind.JsonNode stmts = rootNode.hasNonNull("statements") ? rootNode.get("statements") : qNode.get("statements");
                                for (com.fasterxml.jackson.databind.JsonNode st : stmts) {
                                    q.getStatements().add(st.asText());
                                }
                            }
                            
                            q.setExplanation(qNode.path("explanation").asText(explanationBuilder.toString()));
                            q.setLanguage(book.getLanguage() != null ? book.getLanguage() : "Bangla");
                            q.setBloomLevel(qNode.path("bloomLevel").asText("UNDERSTANDING"));
                            q.setDifficulty(com.testshaper.entity.Question.DifficultyLevel.MEDIUM);
                            if (qNode.hasNonNull("difficulty")) {
                                try { q.setDifficulty(com.testshaper.entity.Question.DifficultyLevel.valueOf(qNode.get("difficulty").asText().toUpperCase())); } catch (Exception ignored) {}
                            }
                            
                            q.setStatus(com.testshaper.entity.Question.QuestionStatus.DRAFT);
                            q.setAiGenerated(true);
                            q.setAiModelName(model);
                            q.setSourceReference("chunk_" + chunkId.toString());

                            com.fasterxml.jackson.databind.JsonNode optionsNode = rootNode.hasNonNull("options") ? rootNode.get("options") : qNode.get("options");
                            if (optionsNode != null && optionsNode.isArray()) {
                                int limit = Math.min(optionsNode.size(), 4);
                                for (int i = 0; i < limit; i++) {
                                    com.testshaper.entity.QuestionOption opt = new com.testshaper.entity.QuestionOption();
                                    opt.setQuestion(q);
                                    opt.setOptionLabel(optionsNode.get(i).path("optionLabel").asText(String.valueOf((char)('A' + i))));
                                    opt.setOptionText(optionsNode.get(i).path("optionText").asText(optionsNode.get(i).asText()));
                                    
                                    if (optionsNode.get(i).hasNonNull("isCorrect")) {
                                        opt.setCorrect(optionsNode.get(i).get("isCorrect").asBoolean());
                                    } else {
                                        opt.setCorrect(opt.getOptionText().equals(q.getCorrectAnswer()));
                                    }
                                    
                                    q.getOptions().add(opt);
                                }
                            }
                            
                            questionRepository.save(q);
                            
                            com.fasterxml.jackson.databind.JsonNode sourcesNode = rootNode.hasNonNull("sources") ? rootNode.get("sources") : qNode.get("sources");
                            if (sourcesNode != null && sourcesNode.isArray()) {
                                for(com.fasterxml.jackson.databind.JsonNode sNode : sourcesNode) {
                                    com.testshaper.entity.QuestionSource qs = new com.testshaper.entity.QuestionSource();
                                    qs.setQuestion(q);
                                    
                                    try {
                                        if (sNode.hasNonNull("sourceType")) {
                                            qs.setSourceType(com.testshaper.entity.QuestionSource.SourceType.valueOf(sNode.get("sourceType").asText().toUpperCase()));
                                        } else {
                                            qs.setSourceType(com.testshaper.entity.QuestionSource.SourceType.OTHER);
                                        }
                                    } catch(Exception ignored) { qs.setSourceType(com.testshaper.entity.QuestionSource.SourceType.OTHER); }
                                    
                                    if(sNode.hasNonNull("examYear")) qs.setExamYear(sNode.get("examYear").asInt());
                                    if(sNode.hasNonNull("organizationName") && !sNode.get("organizationName").asText().isBlank()) qs.setOrganizationName(sNode.get("organizationName").asText());
                                    if(sNode.hasNonNull("examName") && !sNode.get("examName").asText().isBlank()) qs.setExamName(sNode.get("examName").asText());
                                    if(sNode.hasNonNull("session") && !sNode.get("session").asText().isBlank()) qs.setSession(sNode.get("session").asText());
                                    if(sNode.hasNonNull("note") && !sNode.get("note").asText().isBlank()) qs.setNote(sNode.get("note").asText());
                                    
                                    questionSourceRepository.save(qs);
                                }
                            } else if (chunk.getMetadata() != null && !chunk.getMetadata().isBlank()) {
                                // Fallback: Inject chunk metadata as QuestionSource if AI didn't provide sources
                                try {
                                    com.fasterxml.jackson.databind.JsonNode chunkMetadataNode = objectMapper.readTree(chunk.getMetadata());
                                    if (chunkMetadataNode.isArray()) {
                                        for (com.fasterxml.jackson.databind.JsonNode mNode : chunkMetadataNode) {
                                            com.testshaper.entity.QuestionSource qs = new com.testshaper.entity.QuestionSource();
                                            qs.setQuestion(q);
                                            try {
                                                if (mNode.hasNonNull("sourceType")) qs.setSourceType(com.testshaper.entity.QuestionSource.SourceType.valueOf(mNode.get("sourceType").asText().toUpperCase()));
                                                else qs.setSourceType(com.testshaper.entity.QuestionSource.SourceType.OTHER);
                                            } catch(Exception ignored) { qs.setSourceType(com.testshaper.entity.QuestionSource.SourceType.OTHER); }
                                            
                                            if(mNode.hasNonNull("examYear")) qs.setExamYear(mNode.get("examYear").asInt());
                                            if(mNode.hasNonNull("organizationName") && !mNode.get("organizationName").asText().isBlank()) qs.setOrganizationName(mNode.get("organizationName").asText());
                                            if(mNode.hasNonNull("examName") && !mNode.get("examName").asText().isBlank()) qs.setExamName(mNode.get("examName").asText());
                                            if(mNode.hasNonNull("session") && !mNode.get("session").asText().isBlank()) qs.setSession(mNode.get("session").asText());
                                            if(mNode.hasNonNull("note") && !mNode.get("note").asText().isBlank()) qs.setNote(mNode.get("note").asText());
                                            
                                            questionSourceRepository.save(qs);
                                        }
                                    }
                                } catch (Exception ignored) {}
                            }

                            savedCount++;
                        }

                        if (currentPoolKey != null) keyRotationService.recordUsage(currentPoolKey.getId());
                        
                        return savedCount;
                    }
                }
                errorMsg = "Empty response from AI Generative model.";
                throw new RuntimeException("Empty response from AI Generative model.");

            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                errorMsg = e.getResponseBodyAsString();
                int statusCode = e.getStatusCode().value();
                if ((statusCode == 429 || statusCode == 503) && attempt < maxRetries) {
                    if (currentPoolKey != null) { keyRotationService.recordError(currentPoolKey.getId(), errorMsg); currentPoolKey = null; currentApiKey = ""; }
                    int waitSec = 10;
                    try { java.util.regex.Matcher m = java.util.regex.Pattern.compile("retry in (\\d+)").matcher(errorMsg); if (m.find()) waitSec = Math.min(Integer.parseInt(m.group(1)) + 5, 75); } catch (Exception ignored) {}
                    log.warn("Rate limit caught from Gemini API. Sleeping for {} seconds before retry...", waitSec);
                    Thread.sleep(waitSec * 1000L); continue;
                }
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("Gemini API Error: " + errorMsg, e);
            } catch (Exception e) {
                errorMsg = e.getMessage();
                if (currentPoolKey != null) keyRotationService.recordError(currentPoolKey.getId(), errorMsg);
                throw new RuntimeException("AI Generation Error: " + errorMsg, e);
            } finally {
                aiBillingService.recordSystemAiUsage("Knowledge Hub", "Question Gen", prompt.length() / 4, 1500, System.currentTimeMillis() - startTime, isSuccess, errorMsg);
            }
        }
        throw new RuntimeException("All generation API keys exhausted.");
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getSystemHealthAndJobs() {
        Map<String, Object> result = new java.util.HashMap<>();
        
        // System Health Approximation
        Runtime runtime = Runtime.getRuntime();
        long maxMemory = runtime.maxMemory();
        long allocatedMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        
        Map<String, Object> memoryStats = new java.util.HashMap<>();
        memoryStats.put("free", freeMemory / (1024 * 1024));
        memoryStats.put("allocated", allocatedMemory / (1024 * 1024));
        memoryStats.put("max", maxMemory / (1024 * 1024));
        memoryStats.put("usagePct", ((allocatedMemory - freeMemory) * 100) / maxMemory);
        result.put("memory", memoryStats);
        
        // 1. Bulk Extraction Jobs
        List<com.testshaper.entity.AiBulkExtractionJob> activeExtractionJobs = aiBulkExtractionJobRepository.findAll().stream()
            .filter(j -> j.getStatus() == com.testshaper.entity.AiBulkExtractionJob.JobStatus.QUEUED 
                      || j.getStatus() == com.testshaper.entity.AiBulkExtractionJob.JobStatus.IN_PROGRESS 
                      || j.getStatus() == com.testshaper.entity.AiBulkExtractionJob.JobStatus.PAUSED)
            .toList();
            
        List<Map<String, Object>> extractionList = new ArrayList<>();
        for (com.testshaper.entity.AiBulkExtractionJob job : activeExtractionJobs) {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", job.getId());
            m.put("type", "AI_VISION_EXTRACTION");
            m.put("status", job.getStatus().name());
            m.put("totalPages", job.getTotalPagesToProcess());
            m.put("processedPages", job.getProcessedPagesCount());
            m.put("failedPages", job.getFailedPagesCount());
            int percent = job.getTotalPagesToProcess() > 0 ? (job.getProcessedPagesCount() * 100) / job.getTotalPagesToProcess() : 0;
            m.put("progress", Math.min(percent, 100));
            
            // Get book details via repository logic since relationship is LAZY
            sourceBookMasterRepository.findById(job.getSourceBook().getId()).ifPresent(b -> {
                m.put("sourceBookId", b.getId());
                m.put("bookTitle", b.getTitle());
            });
            extractionList.add(m);
        }
        
        // 2. Question Generation Jobs
        List<com.testshaper.entity.AiQuestionGenerationJob> activeQuestionJobs = aiQuestionGenerationJobRepository.findAll().stream()
            .filter(j -> j.getStatus() == com.testshaper.entity.AiQuestionGenerationJob.JobStatus.QUEUED 
                      || j.getStatus() == com.testshaper.entity.AiQuestionGenerationJob.JobStatus.IN_PROGRESS 
                      || j.getStatus() == com.testshaper.entity.AiQuestionGenerationJob.JobStatus.PAUSED)
            .toList();
            
        List<Map<String, Object>> questionList = new ArrayList<>();
        for (com.testshaper.entity.AiQuestionGenerationJob job : activeQuestionJobs) {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", job.getId());
            m.put("type", "AI_QUESTION_GENERATION");
            m.put("status", job.getStatus().name());
            m.put("totalPages", job.getTotalPagesToProcess());
            m.put("processedPages", job.getProcessedPagesCount());
            m.put("failedPages", job.getFailedPagesCount());
            int qPercent = job.getTotalPagesToProcess() > 0 ? (job.getProcessedPagesCount() * 100) / job.getTotalPagesToProcess() : 0;
            m.put("progress", Math.min(qPercent, 100));
            
            // Get book details
            sourceBookMasterRepository.findById(job.getSourceBook().getId()).ifPresent(b -> {
                m.put("sourceBookId", b.getId());
                m.put("bookTitle", b.getTitle());
            });
            questionList.add(m);
        }
        
        result.put("extractionJobs", extractionList);
        result.put("questionJobs", questionList);
        
        // 3. Topic Extraction Jobs
        List<com.testshaper.entity.AiTopicExtractionJob> activeTopicJobs = aiTopicExtractionJobRepository.findAll().stream()
            .filter(j -> j.getStatus() == com.testshaper.entity.AiTopicExtractionJob.JobStatus.QUEUED 
                      || j.getStatus() == com.testshaper.entity.AiTopicExtractionJob.JobStatus.IN_PROGRESS 
                      || j.getStatus() == com.testshaper.entity.AiTopicExtractionJob.JobStatus.PAUSED)
            .toList();
            
        List<Map<String, Object>> topicList = new ArrayList<>();
        for (com.testshaper.entity.AiTopicExtractionJob job : activeTopicJobs) {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", job.getId());
            m.put("type", "AI_TOPIC_EXTRACTION");
            m.put("status", job.getStatus().name());
            m.put("totalPages", job.getTotalChaptersToProcess());
            m.put("processedPages", job.getProcessedChaptersCount());
            m.put("failedPages", job.getFailedChaptersCount());
            int tPercent = job.getTotalChaptersToProcess() > 0 ? (job.getProcessedChaptersCount() * 100) / job.getTotalChaptersToProcess() : 0;
            m.put("progress", Math.min(tPercent, 100));
            
            // Get book details
            sourceBookMasterRepository.findById(job.getSourceBook().getId()).ifPresent(b -> {
                m.put("sourceBookId", b.getId());
                m.put("bookTitle", b.getTitle());
            });
            topicList.add(m);
        }
        result.put("topicExtractionJobs", topicList);
        result.put("activeWorkerNodes", com.testshaper.scheduler.AiExtractionScheduler.currentWorkerSize);
        
        return result;
    }

    // ── GoldenEditor AI Text Editing ──────────────────────────────────────────
    @Override
    public String callAiTextEdit(String prompt) throws Exception {
        java.util.Map<String, String> aiSettings = generalSettingService.getGlobalSettings(
            com.testshaper.entity.GeneralSetting.SettingCategory.AI
        );

        String billingMode = aiSettings.getOrDefault("ai_billing_mode",
            aiSettings.getOrDefault("ai_google_mode", "FREE_POOL"));

        String apiKey;
        String model;
        com.testshaper.entity.AiApiKey poolKey = null;

        if ("FREE_POOL".equalsIgnoreCase(billingMode) || "FREE_POOL".equals(aiSettings.get("ai_google_mode"))) {
            poolKey = keyRotationService.getNextAvailableKey();
            if (poolKey == null) throw new RuntimeException("No available API keys in pool.");
            apiKey = poolKey.getApiKey();
            model  = (poolKey.getModel() != null && !poolKey.getModel().isBlank())
                      ? poolKey.getModel() : aiSettings.getOrDefault("ai_model", "gemini-1.5-flash");
        } else {
            apiKey = aiSettings.getOrDefault("ai_api_key", "");
            model  = aiSettings.getOrDefault("ai_model", "gemini-1.5-flash");
            if (apiKey.isBlank()) throw new RuntimeException("Global AI API key is not configured.");
        }

        java.util.Map<String, Object> requestBody = java.util.Map.of(
            "contents", java.util.List.of(
                java.util.Map.of("parts", java.util.List.of(
                    java.util.Map.of("text", prompt)
                ))
            ),
            "generationConfig", java.util.Map.of(
                "temperature", 0.2,
                "topP", 0.9,
                "maxOutputTokens", 2048
            )
        );

        String requestJson = objectMapper.writeValueAsString(requestBody);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model
                     + ":generateContent?key=" + apiKey;

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(requestJson, headers);

        try {
            org.springframework.http.ResponseEntity<String> response =
                restTemplate.exchange(url, org.springframework.http.HttpMethod.POST, entity, String.class);

            com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(response.getBody());
            String result2 = root.path("candidates").get(0)
                .path("content").path("parts").get(0)
                .path("text").asText("").trim();

            if (poolKey != null) keyRotationService.recordUsage(poolKey.getId());
            return result2;

        } catch (Exception e) {
            if (poolKey != null) keyRotationService.recordError(poolKey.getId(), e.getMessage());
            throw new RuntimeException("AI text edit failed: " + e.getMessage(), e);
        }
    }

    // --- Phase 3F: Synchronized Library & Command Center ---
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getSyncIntegrity(UUID sourceBookId) {
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
                .orElseThrow(() -> new RuntimeException("Book not found"));

        List<KnowledgePage> allPages = knowledgePageRepository.findBySourceBookIdOrderByPageNumberAsc(sourceBookId);
        int totalPages = allPages.size();
        
        List<Map<String, Object>> missingPages = new ArrayList<>();
        int vectorizedCount = 0;
        
        for (KnowledgePage p : allPages) {
            if (p.getExtractionStatus() == KnowledgePage.ExtractionStatus.GOLDEN_VECTORIZED) {
                vectorizedCount++;
            } else {
                Map<String, Object> pageData = new HashMap<>();
                pageData.put("id", p.getId());
                pageData.put("pageNumber", p.getPageNumber());
                pageData.put("status", p.getExtractionStatus().name());
                if (p.getSourceBookIndex() != null) {
                    pageData.put("chapterId", p.getSourceBookIndex().getId());
                    pageData.put("chapterName", p.getSourceBookIndex().getIndexName());
                }
                missingPages.add(pageData);
            }
        }
        
        int vectorChunkCount = curriculumDocumentChunkRepository.countBySourceBookId(sourceBookId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("bookId", book.getId());
        result.put("bookName", book.getTitle());
        result.put("totalPages", totalPages);
        result.put("vectorizedPages", vectorizedCount);
        result.put("missingPages", missingPages);
        result.put("totalChunks", vectorChunkCount);
        result.put("isFullySynced", totalPages > 0 && vectorizedCount == totalPages);
        
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public String getVectorPreview(UUID sourceBookId, UUID indexId) {
        org.springframework.data.domain.Pageable unpaged = org.springframework.data.domain.Pageable.unpaged();
        org.springframework.data.domain.Page<CurriculumDocumentChunk> page = 
            curriculumDocumentChunkRepository.findBySourceBookIndexIdIn(List.of(indexId), unpaged);
            
        List<CurriculumDocumentChunk> chunks = new ArrayList<>(page.getContent());
        chunks.sort(Comparator.comparing(CurriculumDocumentChunk::getChunkIndex));
        
        if (chunks.isEmpty()) {
            return "# No Synced Data\nThis chapter has not been synchronized yet.";
        }
        
        StringBuilder preview = new StringBuilder();
        preview.append("# Synced Preview\n\n");
        for (CurriculumDocumentChunk chunk : chunks) {
            String topicName = chunk.getMappedTopic() != null ? chunk.getMappedTopic().getName() : "Unknown Topic";
            preview.append("### Topic: ").append(topicName).append("\n\n");
            preview.append(chunk.getChunkText()).append("\n\n---\n\n");
        }
        return preview.toString();
    }
}
