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
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.ArrayList;
import java.util.Base64;
import com.testshaper.service.AiBillingService;

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
    private final AiBillingService aiBillingService;
    private final com.testshaper.repository.AiBulkExtractionJobRepository aiBulkExtractionJobRepository;
    private final com.testshaper.repository.AiQuestionGenerationJobRepository aiQuestionGenerationJobRepository;
    private final com.testshaper.repository.AiKnowledgeBaseRepository aiKnowledgeBaseRepository;
    private final com.testshaper.repository.QuestionRepository questionRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

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
        return sourceBookMasterRepository.findByTenantIdOrderByCreatedAtDesc(TenantContext.getTenantId())
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public org.springframework.data.domain.Page<SourceBookMasterDto> getPaginatedSourceBooks(String searchTerm, String bookType, java.util.List<UUID> classSubjectIds, int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return sourceBookMasterRepository.searchBooks(TenantContext.getTenantId(), searchTerm, bookType, classSubjectIds, pageable)
                .map(this::mapToDto);
    }

    @Override
    public void deleteSourceBook(UUID id) {
        sourceBookMasterRepository.deleteById(id);
    }

    @Override
    public SourceBookMasterDto getSourceBook(UUID id) {
        SourceBookMaster entity = sourceBookMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Source Book not found"));
        if(!entity.getTenantId().equals(TenantContext.getTenantId())) {
             throw new RuntimeException("Unauthorized");
        }
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public SourceBookMasterDto updateSourceBook(UUID id, SourceBookMasterDto dto) {
        SourceBookMaster entity = sourceBookMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Source Book not found"));

        if(!entity.getTenantId().equals(TenantContext.getTenantId())) {
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
    public com.testshaper.entity.AiQuestionGenerationJob startAiQuestionQueue(UUID sourceBookId) {
        SourceBookMaster book = sourceBookMasterRepository.findById(sourceBookId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        java.util.Optional<com.testshaper.entity.AiQuestionGenerationJob> existingOpt = aiQuestionGenerationJobRepository.findFirstBySourceBookIdOrderByCreatedAtDesc(sourceBookId);
        
        long pendingPages = knowledgePageRepository.countBySourceBookIdAndExtractionStatusIn(
            sourceBookId, 
            java.util.List.of(com.testshaper.entity.KnowledgePage.ExtractionStatus.PROOFREAD)
        );
        
        if (pendingPages == 0) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "No extracted pages found. Please run Bulk Extraction first.");
        }

        com.testshaper.entity.AiQuestionGenerationJob job;
        if (existingOpt.isPresent()) {
            job = existingOpt.get();
            job.setStatus(com.testshaper.entity.AiQuestionGenerationJob.JobStatus.QUEUED);
            job.setProcessedPagesCount(0);
            job.setFailedPagesCount(0);
            job.setTotalPagesToProcess((int) pendingPages);
        } else {
            job = new com.testshaper.entity.AiQuestionGenerationJob();
            job.setSourceBook(book);
            job.setTenantId(book.getTenantId());
            job.setStatus(com.testshaper.entity.AiQuestionGenerationJob.JobStatus.QUEUED);
            job.setTotalPagesToProcess((int) pendingPages);
            job.setProcessedPagesCount(0);
            job.setFailedPagesCount(0);
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
    public int generateQuestionsForPage(UUID sourceBookId, UUID pageId) throws Exception {
        com.testshaper.entity.KnowledgePage page = knowledgePageRepository.findById(pageId)
            .orElseThrow(() -> new RuntimeException("Page not found"));

        if (!page.getSourceBook().getId().equals(sourceBookId)) {
            throw new RuntimeException("Page does not belong to this book.");
        }

        String pageSourceRef = "knowledge_page_" + pageId.toString();
        boolean alreadyHasDrafts = questionRepository.existsBySourceReferenceAndStatus(pageSourceRef, com.testshaper.entity.Question.QuestionStatus.DRAFT);
        if (alreadyHasDrafts) {
            log.info("Page {} already has DRAFT questions. Skipping generation to prevent duplicates.", pageId);
            return 0; // successfully skipped
        }

        String markdown = page.getGoldenMarkdown();
        if (markdown == null || markdown.isBlank()) {
            markdown = page.getExtractedMarkdown();
        }

        if (markdown == null || markdown.isBlank()) {
            throw new RuntimeException("Page must be extracted first before generating questions.");
        }

        SourceBookMaster book = page.getSourceBook();
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
            "  }\n" +
            "]";

        if (classSubject != null && classSubject.getSubject() != null) {
            String subjectName = classSubject.getSubject().getName();
            String tagToSearch = "RULE_FOR_" + subjectName.replaceAll("\\s+", "");
            java.util.List<com.testshaper.entity.AiKnowledgeBase> rules = aiKnowledgeBaseRepository.findActiveCurriculumRules(tagToSearch);
            if (!rules.isEmpty()) {
                ruleSchema = rules.get(0).getContent(); 
                // Always force inject the stimulus property if user forgot it in their DB rule
                if (ruleSchema != null && !ruleSchema.contains("\"stimulus\"")) {
                    ruleSchema = ruleSchema.replaceFirst("\\{", "\\{\n    \"stimulus\": \"![alt](url) or contextual text. VERY IMPORTANT for images!\",");
                }
            }
        }

        String prompt = "You are an expert curriculum question setter and data parser. Read the provided TEXT context below.\n" +
                        "INSTRUCTIONS:\n" +
                        "1. If the text contains existing examination questions or exercises, your primary task is to **EXTRACT EXACT EXISTING QUESTIONS**. Do NOT make up variations.\n" +
                        "2. If the text is an educational chapter with NO existing questions, your task is to **GENERATE high-quality questions** based on the theories inside.\n" +
                        "3. If the text is just a Table of Contents (সূচিপত্র/Index), Title Page, Copyright Page, or noise, do **NOT** generate questions. Simply return an empty JSON array [].\n" +
                        "4. **PRESERVE IMAGES (CRITICAL):** If the markdown text contains images `![alt](url)`, you MUST pair them with the appropriate question! Put the image markdown in the `stimulus` field or `questionText` field. Do NOT lose the image link!\n" +
                        "5. **STRIP NUMBERS:** Remove any serial numbers (e.g. '1. ', '১। ', 'Q:') from the beginning of `questionText`.\n" +
                        "CRITICAL: You MUST strictly conform to the following JSON Schema array. Do not return any conversational text, ONLY a raw JSON array.\n\n" +
                        "TARGET JSON SCHEMA:\n" +
                        ruleSchema + "\n\n" +
                        "CONTEXT TEXT:\n" + markdown;

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
                            throw new RuntimeException("AI Response was not a JSON Array.");
                        }

                        int savedCount = 0;
                        for (com.fasterxml.jackson.databind.JsonNode qNode : questionsArray) {
                            com.testshaper.entity.Question q = new com.testshaper.entity.Question();
                            q.setTenantId(book.getTenantId());
                            q.setClassSubject(book.getClassSubject());
                            
                            java.util.Optional<com.testshaper.entity.SourceBookIndex> chapterIndexOpt = sourceBookIndexRepository.findBySourceBookIdAndStartPageLessThanEqualAndEndPageGreaterThanEqual(
                                book.getId(), page.getPageNumber(), page.getPageNumber()
                            ).stream().findFirst();

                            if (chapterIndexOpt.isPresent() && chapterIndexOpt.get().getMappedChapter() != null) {
                                q.setChapter(chapterIndexOpt.get().getMappedChapter());
                            }

                            q.setType(com.testshaper.entity.Question.QuestionType.MCQ);
                            if (qNode.hasNonNull("questionType")) {
                                try {
                                    q.setType(com.testshaper.entity.Question.QuestionType.valueOf(qNode.get("questionType").asText().toUpperCase()));
                                } catch (Exception ignored) {}
                            }

                            String qText = qNode.path("questionText").asText("Generated Question");
                            qText = qText.replaceFirst("^\\s*(?:[\\d০-৯]+|[a-zA-Zক-ষ])\\s*[\\.\\)\\-:]\\s*", "");
                            q.setQuestionText(qText);
                            
                            if (qNode.hasNonNull("stimulus")) {
                                q.setStimulus(qNode.get("stimulus").asText());
                            }

                            q.setMarks(qNode.hasNonNull("marks") ? qNode.get("marks").asDouble() : 1.0);
                            q.setNegativeMarks(0.0);
                            q.setCorrectAnswer(qNode.path("answer").asText(null));
                            q.setExplanation(qNode.path("explanation").asText(""));
                            q.setLanguage("Bangla");
                            q.setBloomLevel(qNode.path("bloomLevel").asText("UNDERSTANDING"));
                            q.setDifficulty(com.testshaper.entity.Question.DifficultyLevel.MEDIUM);
                            if (qNode.hasNonNull("difficulty")) {
                                try { q.setDifficulty(com.testshaper.entity.Question.DifficultyLevel.valueOf(qNode.get("difficulty").asText().toUpperCase())); } catch (Exception ignored) {}
                            }
                            
                            q.setStatus(com.testshaper.entity.Question.QuestionStatus.DRAFT);
                            q.setAiGenerated(true);
                            q.setAiModelName(model);
                            q.setSourceReference("knowledge_page_" + pageId.toString());

                            if (qNode.hasNonNull("options") && qNode.get("options").isArray()) {
                                int limit = Math.min(qNode.get("options").size(), 4);
                                for (int i = 0; i < limit; i++) {
                                    com.testshaper.entity.QuestionOption opt = new com.testshaper.entity.QuestionOption();
                                    opt.setQuestion(q);
                                    opt.setOptionLabel(String.valueOf((char)('A' + i)));
                                    opt.setOptionText(qNode.get("options").get(i).asText());
                                    // simple logic for isCorrect: if text exactly matches answer
                                    opt.setCorrect(opt.getOptionText().equals(q.getCorrectAnswer()));
                                    q.getOptions().add(opt);
                                }
                            }
                            
                            questionRepository.save(q);
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
}
