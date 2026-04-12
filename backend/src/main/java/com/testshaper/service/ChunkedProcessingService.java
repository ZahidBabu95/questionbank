package com.testshaper.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.entity.AiChunkResult;
import com.testshaper.entity.AiProcessingJob;
import com.testshaper.entity.AiUploadHistory;
import com.testshaper.repository.AiChunkResultRepository;
import com.testshaper.repository.AiProcessingJobRepository;
import com.testshaper.repository.AiUploadHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Splits large PDFs into page-chunks and processes each chunk with AI.
 * Supports pause/resume for rate-limited or large files.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChunkedProcessingService {

    private final AIQuestionService aiQuestionService;
    private final AiProcessingJobRepository jobRepo;
    private final AiUploadHistoryRepository uploadHistoryRepo;
    private final AiChunkResultRepository chunkResultRepo;
    private final DynamicStorageService storageService;
    private final ObjectMapper objectMapper;
    private final com.testshaper.repository.AiUsageLogRepository aiUsageLogRepository;
    private final com.testshaper.repository.GeneralSettingRepository settingsRepo;
    private final AiBillingService aiBillingService;

    private static final int DEFAULT_PAGES_PER_CHUNK = 5; // 5 pages max to fit within Gemini's 8192 output token limit

    /**
     * Creates a new chunked processing job for a large PDF.
     * Saves the file and returns job info without starting processing.
     */
    public AiProcessingJob createJob(MultipartFile file, String questionType, String userEmail, String userName, String customPrompt) throws Exception {
        byte[] fileBytes = file.getBytes();

        // Count total pages
        int totalPages;
        try (PDDocument doc = Loader.loadPDF(fileBytes)) {
            totalPages = doc.getNumberOfPages();
        }

        // Save original file
        String storedPath = null;
        try {
            storedPath = storageService.uploadFile(file, null, "ai-chunked");
        } catch (Exception e) {
            log.warn("Failed to save chunked file: {}", e.getMessage());
        }

        // Compute hash
        String fileHash = computeHash(fileBytes);

        int pagesPerChunk = DEFAULT_PAGES_PER_CHUNK;
        int totalChunks = (int) Math.ceil((double) totalPages / pagesPerChunk);

        AiProcessingJob job = AiProcessingJob.builder()
                .originalFileName(file.getOriginalFilename())
                .storedFilePath(storedPath)
                .fileHash(fileHash)
                .totalPages(totalPages)
                .pagesPerChunk(pagesPerChunk)
                .totalChunks(totalChunks)
                .processedChunks(0)
                .currentChunkStart(1)
                .status(AiProcessingJob.JobStatus.PENDING)
                .questionType(questionType)
                .totalQuestionsFound(0)
                .totalProcessingTimeMs(0)
                .userEmail(userEmail)
                .userName(userName)
                .customPrompt(customPrompt)
                .build();

        job = jobRepo.save(job);
        log.info("Created chunked job: {} pages, {} chunks for '{}'", totalPages, totalChunks, file.getOriginalFilename());
        return job;
    }

    /**
     * Processes the next chunk of a job.
     * Returns the extracted questions from this chunk.
     */
    public Map<String, Object> processNextChunk(UUID jobId, byte[] originalPdfBytes) throws Exception {
        AiProcessingJob job = jobRepo.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        if (job.getStatus() == AiProcessingJob.JobStatus.COMPLETED) {
            throw new RuntimeException("এই জব ইতিমধ্যে সম্পূর্ণ হয়েছে।");
        }

        job.setStatus(AiProcessingJob.JobStatus.PROCESSING);
        jobRepo.save(job);

        long startTime = System.currentTimeMillis();

        try {
            // Extract the chunk pages from the PDF
            int startPage = job.getCurrentChunkStart(); // 1-indexed
            int endPage = Math.min(startPage + job.getPagesPerChunk() - 1, job.getTotalPages());

            byte[] chunkPdfBytes = extractPages(originalPdfBytes, startPage, endPage);

            Map<String, Object> result = analyzeChunkSmartly(chunkPdfBytes, job, startPage, endPage);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> questions = (List<Map<String, Object>>) result.get("questions");
            long elapsed = System.currentTimeMillis() - startTime;

            // Extract metadata from first chunk
            if (job.getProcessedChunks() == 0 && result.get("metadata") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> meta = (Map<String, Object>) result.get("metadata");
                job.setDetectedClass(String.valueOf(meta.getOrDefault("className", "")));
                job.setDetectedSubject(String.valueOf(meta.getOrDefault("subject", "")));
                job.setDetectedChapter(String.valueOf(meta.getOrDefault("chapter", "")));
            }

            // Update job progress
            int chunkNum = job.getProcessedChunks() + 1;
            job.setProcessedChunks(chunkNum);
            job.setCurrentChunkStart(endPage + 1);
            job.setTotalQuestionsFound(job.getTotalQuestionsFound() + questions.size());
            job.setTotalProcessingTimeMs(job.getTotalProcessingTimeMs() + elapsed);
            job.setErrorMessage(null);

            if (job.getProcessedChunks() >= job.getTotalChunks()) {
                job.setStatus(AiProcessingJob.JobStatus.COMPLETED);
            } else {
                job.setStatus(AiProcessingJob.JobStatus.PAUSED); // Pause until next chunk requested
            }

            jobRepo.save(job);

            // ★ Save chunk result to DB for recovery
            try {
                AiChunkResult chunkResult = AiChunkResult.builder()
                        .jobId(jobId)
                        .chunkNumber(chunkNum)
                        .startPage(startPage)
                        .endPage(endPage)
                        .questionsJson(objectMapper.writeValueAsString(questions))
                        .metadataJson(result.get("metadata") != null ? objectMapper.writeValueAsString(result.get("metadata")) : null)
                        .questionsCount(questions.size())
                        .processingTimeMs(elapsed)
                        .build();
                chunkResultRepo.save(chunkResult);
                log.info("Saved chunk {} result: {} questions to DB", chunkNum, questions.size());
            } catch (Exception saveErr) {
                log.warn("Failed to save chunk result to DB (questions still returned): {}", saveErr.getMessage());
            }

            // Log AI usage for this chunk
            recordUsageLog(job.getOriginalFileName() + " [Chunk " + chunkNum + "]", job.getQuestionType(),
                    questions.size(), chunkPdfBytes.length, elapsed, true, null, job.getUserEmail(), job.getUserName());

            aiBillingService.deductQuestionQuota(questions.size());

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("questions", questions);
            response.put("metadata", result.get("metadata"));
            response.put("chunkInfo", Map.of(
                    "chunkNumber", job.getProcessedChunks(),
                    "totalChunks", job.getTotalChunks(),
                    "pagesProcessed", startPage + "-" + endPage,
                    "totalPages", job.getTotalPages(),
                    "questionsInChunk", questions.size(),
                    "totalQuestionsFound", job.getTotalQuestionsFound(),
                    "progress", job.getProgressPercent(),
                    "isComplete", job.getStatus() == AiProcessingJob.JobStatus.COMPLETED
            ));

            log.info("Chunk {}/{} processed: {} questions (pages {}-{})",
                    job.getProcessedChunks(), job.getTotalChunks(), questions.size(), startPage, endPage);

            return response;
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            job.setStatus(AiProcessingJob.JobStatus.PAUSED); // Pausable, not failed
            job.setErrorMessage(e.getMessage());
            job.setLastErrorChunk(job.getProcessedChunks() + 1);
            job.setTotalProcessingTimeMs(job.getTotalProcessingTimeMs() + elapsed);
            jobRepo.save(job);

            log.error("Chunk processing failed for job {}: {}", jobId, e.getMessage());
            recordUsageLog(job.getOriginalFileName() + " [Chunk " + (job.getProcessedChunks() + 1) + "]", job.getQuestionType(),
                    0, 0, elapsed, false, e.getMessage(), job.getUserEmail(), job.getUserName());
            throw e;
        }
    }

    /**
     * Processes all remaining chunks concurrently using CompletableFuture.
     */
    public Map<String, Object> processAllChunksParallel(UUID jobId, byte[] originalPdfBytes) throws Exception {
        AiProcessingJob job = jobRepo.findById(jobId).orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        if (job.getStatus() == AiProcessingJob.JobStatus.COMPLETED) {
            throw new RuntimeException("এই জব ইতিমধ্যে সম্পূর্ণ হয়েছে।");
        }

        job.setStatus(AiProcessingJob.JobStatus.PROCESSING);
        jobRepo.save(job);

        long globalStartTime = System.currentTimeMillis();
        int totalChunks = job.getTotalChunks();
        int pagesPerChunk = job.getPagesPerChunk();
        int totalPages = job.getTotalPages();

        List<CompletableFuture<Map<String, Object>>> futures = new ArrayList<>();
        
        // Dynamically adjust concurrency: 3 for Free API, 10 for Paid API keys
        String billingMode = settingsRepo.findByTenantIdIsNullAndKey("ai_billing_mode")
                .map(com.testshaper.entity.GeneralSetting::getValue).orElse("FREE_POOL");
        int concurrencyLimit = "FREE_POOL".equals(billingMode) ? 3 : 10;
        
        java.util.concurrent.ExecutorService chunkExecutor = java.util.concurrent.Executors.newFixedThreadPool(concurrencyLimit);

        for (int i = job.getProcessedChunks(); i < totalChunks; i++) {
            final int chunkIndex = i;
            final int chunkNum = chunkIndex + 1;
            final int startPage = (chunkIndex * pagesPerChunk) + 1;
            final int endPage = Math.min(startPage + pagesPerChunk - 1, totalPages);

            CompletableFuture<Map<String, Object>> future = CompletableFuture.supplyAsync(() -> {
                long chunkStartTime = System.currentTimeMillis();
                try {
                    byte[] chunkPdfBytes = extractPages(originalPdfBytes, startPage, endPage);
                    Map<String, Object> result = analyzeChunkSmartly(chunkPdfBytes, job, startPage, endPage);

                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> questions = (List<Map<String, Object>>) result.get("questions");
                    long elapsed = System.currentTimeMillis() - chunkStartTime;

                    // Save chunk result to DB safely without blocking other threads
                    try {
                        if (!chunkResultRepo.existsByJobIdAndChunkNumber(jobId, chunkNum)) {
                            AiChunkResult chunkResult = AiChunkResult.builder()
                                    .jobId(jobId)
                                    .chunkNumber(chunkNum)
                                    .startPage(startPage)
                                    .endPage(endPage)
                                    .questionsJson(objectMapper.writeValueAsString(questions))
                                    .metadataJson(result.get("metadata") != null ? objectMapper.writeValueAsString(result.get("metadata")) : null)
                                    .questionsCount(questions.size())
                                    .processingTimeMs(elapsed)
                                    .build();
                            chunkResultRepo.save(chunkResult);
                        }
                    } catch (org.springframework.dao.DataIntegrityViolationException e) {
                        log.warn("Chunk {} already saved by another thread. Ignoring duplicate.", chunkNum);
                    } catch (Exception e) {
                        log.error("Failed to save parallel chunk {} result: {}", chunkNum, e.getMessage());
                    }
                    log.info("Saved chunk {} result: {} questions (Parallel)", chunkNum, questions.size());

                    // Log AI usage
                    recordUsageLog(job.getOriginalFileName() + " [Chunk " + chunkNum + "]", job.getQuestionType(),
                            questions.size(), chunkPdfBytes.length, elapsed, true, null, job.getUserEmail(), job.getUserName());

                    aiBillingService.deductQuestionQuota(questions.size());

                    result.put("chunkNumber", chunkNum);
                    result.put("elapsed", elapsed);
                    return result;

                } catch (Exception e) {
                    log.error("Chunk {} processing failed: {}", chunkNum, e.getMessage());
                    recordUsageLog(job.getOriginalFileName() + " [Chunk " + chunkNum + "]", job.getQuestionType(),
                            0, 0, System.currentTimeMillis() - chunkStartTime, false, e.getMessage(), job.getUserEmail(), job.getUserName());
                    throw new RuntimeException("Chunk " + chunkNum + " failed: " + e.getMessage(), e);
                }
            }, chunkExecutor);
            futures.add(future);
        }

        // Wait for all futures, collect exceptions
        CompletableFuture<Void> allOf = CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
        try {
            allOf.join();
        } catch (Exception e) {
            log.error("1 or more chunks failed during parallel processing: {}", e.getMessage());
            // It will continue and aggregate the successful ones, leaving the job in PAUSED state.
        } finally {
            chunkExecutor.shutdown();
        }

        long globalElapsed = System.currentTimeMillis() - globalStartTime;
        int successfulChunks = chunkResultRepo.countByJobId(jobId);

        // Fetch all successful questions for response
        List<AiChunkResult> allResults = chunkResultRepo.findByJobIdOrderByChunkNumber(jobId);
        List<Map<String, Object>> allQuestions = new ArrayList<>();
        Map<String, Object> firstMetadata = null;

        for (AiChunkResult cr : allResults) {
            List<Map<String, Object>> chunkQuestions = objectMapper.readValue(cr.getQuestionsJson(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
            allQuestions.addAll(chunkQuestions);
            if (firstMetadata == null && cr.getMetadataJson() != null) {
                firstMetadata = objectMapper.readValue(cr.getMetadataJson(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
            }
        }

        // Update Job metadata
        if (firstMetadata != null) {
            job.setDetectedClass(String.valueOf(firstMetadata.getOrDefault("className", "")));
            job.setDetectedSubject(String.valueOf(firstMetadata.getOrDefault("subject", "")));
            job.setDetectedChapter(String.valueOf(firstMetadata.getOrDefault("chapter", "")));
        }

        job.setProcessedChunks(successfulChunks);
        if (allResults.size() > 0) {
            job.setCurrentChunkStart(allResults.get(allResults.size()-1).getEndPage() + 1);
        }
        job.setTotalQuestionsFound(allQuestions.size());
        job.setTotalProcessingTimeMs(job.getTotalProcessingTimeMs() + globalElapsed);

        if (successfulChunks >= totalChunks) {
            job.setErrorMessage(null);
            job.setStatus(AiProcessingJob.JobStatus.COMPLETED);
        } else {
            job.setErrorMessage("Some chunks failed. Try resuming.");
            job.setStatus(AiProcessingJob.JobStatus.PAUSED);
        }

        jobRepo.save(job);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("questions", allQuestions);
        response.put("metadata", firstMetadata);
        response.put("chunkInfo", Map.of(
                "totalChunks", totalChunks,
                "totalPages", totalPages,
                "totalQuestionsFound", allQuestions.size(),
                "progress", (successfulChunks * 100) / totalChunks,
                "isComplete", job.getStatus() == AiProcessingJob.JobStatus.COMPLETED,
                "parallelExecutionTimeMs", globalElapsed
        ));

        return response;
    }

    /**
     * Determines if a file needs chunked processing (>= threshold pages).
     */
    public boolean needsChunkedProcessing(MultipartFile file) {
        if (!"application/pdf".equals(file.getContentType())) return false;
        try {
            byte[] bytes = file.getBytes();
            try (PDDocument doc = Loader.loadPDF(bytes)) {
                return doc.getNumberOfPages() > DEFAULT_PAGES_PER_CHUNK;
            }
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Gets the page count of a PDF file.
     */
    public int getPageCount(byte[] pdfBytes) {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            return doc.getNumberOfPages();
        } catch (Exception e) {
            return -1;
        }
    }

    /**
     * Extracts specific pages from a PDF into a new PDF byte array.
     */
    private byte[] extractPages(byte[] pdfBytes, int startPage, int endPage) throws Exception {
        try (PDDocument source = Loader.loadPDF(pdfBytes);
             PDDocument dest = new PDDocument()) {

            for (int i = startPage - 1; i < endPage && i < source.getNumberOfPages(); i++) {
                PDPage page = source.getPage(i);
                dest.addPage(page);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            dest.save(baos);
            return baos.toByteArray();
        }
    }

    /**
     * Smartly processes a chunk: acts natively on text if available, extracts images to URL,
     * builds a context prompt, and skips heavy Vision API if not necessary.
     */
    private Map<String, Object> analyzeChunkSmartly(byte[] chunkPdfBytes, AiProcessingJob job, int startPage, int endPage) throws Exception {
        String extractedText = null;
        List<String> imageUrls = new ArrayList<>();

        try (PDDocument doc = Loader.loadPDF(chunkPdfBytes)) {
            // 1. SKIP NATIVE TEXT EXTRACTION
            // PDFBox PDFTextStripper often corrupts complex Bengali scripts (Bijoy/Unicode rendering order).
            // We rely 100% on Gemini 1.5's native multimodal capabilities to OCR & understand the PDF directly.
            log.info("Smart Chunk {}-{}: Bypassing PDFTextStripper. Relying entirely on Multimodal Vision API.", startPage, endPage);

            // 2. Native Image / Diagram Extraction
            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                org.apache.pdfbox.pdmodel.PDResources resources = page.getResources();
                if (resources == null) continue;
                for (org.apache.pdfbox.cos.COSName name : resources.getXObjectNames()) {
                    org.apache.pdfbox.pdmodel.graphics.PDXObject xObject = resources.getXObject(name);
                    if (xObject instanceof org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject imgObject) {
                        java.awt.image.BufferedImage img = imgObject.getImage();
                        if (img.getWidth() > 100 && img.getHeight() > 100) {
                            java.io.ByteArrayOutputStream os = new java.io.ByteArrayOutputStream();
                            String format = imgObject.getSuffix() != null ? imgObject.getSuffix() : "png";
                            if (format.equalsIgnoreCase("jpx") || format.equalsIgnoreCase("jp2")) format = "jpg";
                            javax.imageio.ImageIO.write(img, format, os);
                            final byte[] imgBytes = os.toByteArray();
                            final String finalFormat = format;
                            
                            MultipartFile mockFile = new InMemoryMultipartFile(
                                "image." + finalFormat, "image." + finalFormat, "image/" + finalFormat, imgBytes);
                            String subFolder = "ai_imports/images/job_" + job.getId();
                            String imgUrl = storageService.uploadFile(mockFile, job.getTenantId(), subFolder);
                            if (imgUrl != null) imageUrls.add(imgUrl);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed native image extraction on chunk {}-{}: {}", startPage, endPage, e.getMessage());
        }

        // Attach image URLs to text context so AI can map them
        if (!imageUrls.isEmpty()) {
            String imgContext = "\n\n[ATTACHED STIMULUS IMAGE URLs FOR THIS PAGE: " + String.join(", ", imageUrls) + "]\n";
            log.info("Smart Chunk {}-{}: Extracted {} native images/diagrams.", startPage, endPage, imageUrls.size());
            if (extractedText == null) extractedText = imgContext;
            else extractedText += imgContext;
        }

        // We MUST ALWAYS pass the raw PDF to the AI so it can natively "read" via OCR.
        MultipartFile chunkFile = new InMemoryMultipartFile(
                "chunk.pdf",
                job.getOriginalFileName(),
                "application/pdf",
                chunkPdfBytes
        );

        Map<String, String> knownCtx = new HashMap<>();
        if (job.getCustomPrompt() != null && !job.getCustomPrompt().isBlank()) {
            knownCtx.put("customPrompt", job.getCustomPrompt());
        }

        Map<String, Object> result;
        try {
            result = aiQuestionService.scrapeWithMetadataAndText(chunkFile, extractedText, job.getQuestionType(), knownCtx);
        } catch (Exception ex) {
            if (ex.getMessage() != null && (ex.getMessage().contains("400") || ex.getMessage().contains("INVALID_ARGUMENT") || ex.getMessage().toLowerCase().contains("no pages"))) {
                log.warn("Chunk AI processing rejected (likely empty or just text without questions), skipping gracefully. Error: {}", ex.getMessage());
                result = new LinkedHashMap<>();
                result.put("questions", new ArrayList<>());
                result.put("metadata", null);
            } else {
                throw ex;
            }
        }
        return result;
    }


    private String computeHash(byte[] data) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteAndArchiveJob(UUID jobId) {
        AiProcessingJob job = jobRepo.findById(jobId).orElse(null);
        if (job == null) return;

        // Archive to Upload History
        AiUploadHistory history = AiUploadHistory.builder()
                .originalFileName(job.getOriginalFileName())
                .storedFilePath(job.getStoredFilePath())
                .fileHash(job.getFileHash())
                .fileSize(0L) // File size is not stored directly on processing job
                .mimeType("application/pdf")
                .actionType(AiUploadHistory.ActionType.SCRAPE)
                .questionType(job.getQuestionType())
                .questionsExtracted(job.getTotalQuestionsFound())
                .processingTimeMs(job.getTotalProcessingTimeMs())
                .success(job.getStatus() == AiProcessingJob.JobStatus.COMPLETED)
                .errorMessage(job.getErrorMessage())
                .detectedClass(job.getDetectedClass())
                .detectedSubject(job.getDetectedSubject())
                .detectedChapter(job.getDetectedChapter())
                .uploadedByEmail(job.getUserEmail())
                .uploadedByName(job.getUserName())
                .build();
        history.setTenantId(job.getTenantId());
        uploadHistoryRepo.save(history);

        // Delete associated chunks
        chunkResultRepo.deleteByJobId(jobId);

        // Delete the job itself
        jobRepo.delete(job);
        log.info("Archived and deleted AiProcessingJob '{}' ({})", job.getOriginalFileName(), jobId);
    }

    /** In-memory MultipartFile implementation (avoids spring-test dependency) */
    private static class InMemoryMultipartFile implements MultipartFile {
        private final String name;
        private final String originalFilename;
        private final String contentType;
        private final byte[] content;

        InMemoryMultipartFile(String name, String originalFilename, String contentType, byte[] content) {
            this.name = name;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.content = content;
        }

        @Override public String getName() { return name; }
        @Override public String getOriginalFilename() { return originalFilename; }
        @Override public String getContentType() { return contentType; }
        @Override public boolean isEmpty() { return content.length == 0; }
        @Override public long getSize() { return content.length; }
        @Override public byte[] getBytes() { return content; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(content); }
        @Override public void transferTo(File dest) { throw new UnsupportedOperationException(); }
    }

    private void recordUsageLog(String fileName, String questionType, int questionsCount, long fileSizeBytes,
                                long processingTimeMs, boolean success, String errorMessage,
                                String userEmail, String userName) {
        try {
            int inputTokens = (int) (fileSizeBytes / 4);
            int outputTokens = questionsCount * 180;

            java.util.Map<String, Integer> actualUsage = com.testshaper.service.impl.AIQuestionServiceImpl.tokenUsageLocal.get();
            if (actualUsage != null) {
                inputTokens = actualUsage.getOrDefault("inputTokens", inputTokens);
                outputTokens = actualUsage.getOrDefault("outputTokens", outputTokens);
                com.testshaper.service.impl.AIQuestionServiceImpl.tokenUsageLocal.remove();
            }

            int totalTokens = Math.max(inputTokens + outputTokens, 500);
            double costUsd = totalTokens * 0.00025 / 1000.0;

            String model = settingsRepo.findByTenantIdIsNullAndKey("ai_model")
                    .map(com.testshaper.entity.GeneralSetting::getValue).orElse("gemini-1.5-flash");

            aiBillingService.deductTokens(totalTokens);

            com.testshaper.entity.AiUsageLog logEntry = com.testshaper.entity.AiUsageLog.builder()
                    .action("SCRAPE")
                    .questionType(questionType)
                    .fileName(fileName)
                    .userId(0L) // Default system/chunk worker
                    .userEmail(userEmail != null ? userEmail : "system")
                    .userName(userName != null ? userName : "System")
                    .modelUsed(model)
                    .questionsCount(questionsCount)
                    .inputTokens((int)(totalTokens * 0.7))
                    .outputTokens((int)(totalTokens * 0.3))
                    .totalTokens(totalTokens)
                    .costUsd(costUsd)
                    .processingTimeMs(processingTimeMs)
                    .success(success)
                    .errorMessage(errorMessage)
                    .build();
            aiUsageLogRepository.save(logEntry);
        } catch (Exception e) {
            log.warn("Failed to log AI chunk usage: {}", e.getMessage());
        }
    }
}
