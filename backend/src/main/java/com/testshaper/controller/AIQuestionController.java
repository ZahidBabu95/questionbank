package com.testshaper.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.common.ApiResponse;
import com.testshaper.entity.AiApiKey;
import com.testshaper.entity.AiChunkResult;
import com.testshaper.entity.AiProcessingJob;
import com.testshaper.entity.AiUploadHistory;
import com.testshaper.entity.AiUsageLog;
import com.testshaper.repository.AiChunkResultRepository;
import com.testshaper.repository.AiProcessingJobRepository;
import com.testshaper.repository.AiUploadHistoryRepository;
import com.testshaper.repository.AiUsageLogRepository;
import com.testshaper.repository.GeneralSettingRepository;
import com.testshaper.service.AIQuestionService;
import com.testshaper.service.AiBillingService;
import com.testshaper.service.ApiKeyRotationService;
import com.testshaper.service.ChunkedProcessingService;
import com.testshaper.repository.AiApiKeyRepository;
import com.testshaper.service.DynamicStorageService;
import com.testshaper.service.FileStorageService;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.MessageDigest;
import java.util.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Slf4j
public class AIQuestionController {

    private final AIQuestionService aiQuestionService;
    private final AiBillingService aiBillingService;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final AiUploadHistoryRepository uploadHistoryRepo;
    private final AiProcessingJobRepository jobRepo;
    private final AiChunkResultRepository chunkResultRepo;
    private final GeneralSettingRepository settingsRepo;
    private final DynamicStorageService storageService;
    private final ChunkedProcessingService chunkedService;
    private final ApiKeyRotationService keyRotationService;
    private final AiApiKeyRepository aiApiKeyRepo;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;
    private final com.testshaper.service.CopilotService copilotService;
    private final com.testshaper.repository.CurriculumDocumentRepository curriculumRepo;
    private final com.testshaper.service.CurriculumAnalyzerService curriculumAnalyzerService;
    private final com.testshaper.service.ScrapeResultCacheService scrapeResultCacheService;

    private static final double COST_PER_1K_TOKENS = 0.00025;

    // In-flight lock: prevents concurrent duplicate resume/process calls for the same job
    private static final java.util.concurrent.ConcurrentHashMap<UUID, Boolean> IN_FLIGHT_JOBS =
            new java.util.concurrent.ConcurrentHashMap<>();

    @PostMapping("/scrape-questions")
    public ResponseEntity<?> scrapeQuestions(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "questionType", defaultValue = "MCQ") String questionType,
            @RequestParam(value = "knownClassName",  defaultValue = "") String knownClassName,
            @RequestParam(value = "knownSubject",    defaultValue = "") String knownSubject,
            @RequestParam(value = "knownChapter",    defaultValue = "") String knownChapter,
            @RequestParam(value = "knownTopic",      defaultValue = "") String knownTopic,
            @RequestParam(value = "knownClassLevel", defaultValue = "") String knownClassLevel,
            @RequestParam(value = "customPrompt",    defaultValue = "") String customPrompt) {

        long startTime = System.currentTimeMillis();
        AiUsageLog.AiUsageLogBuilder logBuilder = AiUsageLog.builder()
                .action("SCRAPE")
                .questionType(questionType)
                .fileName(file.getOriginalFilename());

        setUserInfo(logBuilder);

        // Build upload history entry
        AiUploadHistory.AiUploadHistoryBuilder historyBuilder = AiUploadHistory.builder()
                .originalFileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .mimeType(file.getContentType())
                .actionType(AiUploadHistory.ActionType.SCRAPE)
                .questionType(questionType);
        setUploadUserInfo(historyBuilder);

        try {
            // 1. Compute file hash for duplicate detection
            String fileHash = computeFileHash(file);
            historyBuilder.fileHash(fileHash);

            // Check for duplicates
            Optional<AiUploadHistory> existing = uploadHistoryRepo.findFirstByFileHashAndDeletedFalseOrderByCreatedAtDesc(fileHash);
            if (existing.isPresent()) {
                historyBuilder.isDuplicate(true).duplicateOfId(existing.get().getId().toString());
                log.info("Duplicate file detected: {} (matches {})", file.getOriginalFilename(), existing.get().getOriginalFileName());

                // Try to return cached result instead of error
                Optional<Map<String, Object>> cachedResult = scrapeResultCacheService.getCachedResult(fileHash);
                if (cachedResult.isPresent()) {
                    Map<String, Object> cached = cachedResult.get();
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> cachedQ = (List<Map<String, Object>>) cached.get("questions");
                    int qCount = cachedQ != null ? cachedQ.size() : 0;

                    Map<String, Object> responseData = new LinkedHashMap<>(cached);
                    responseData.put("count", qCount);
                    responseData.put("fromCache", true);
                    responseData.put("cacheNote", "এই ফাইলটি আগে প্রসেস করা হয়েছে। ক্যাশ থেকে " + qCount + "টি প্রশ্ন ফেরত দেওয়া হচ্ছে।");

                    log.info("Returning {} cached questions for duplicate file (hash: {}...)", qCount, fileHash.substring(0, 8));
                    return ResponseEntity.ok(ApiResponse.success(responseData, qCount + " questions from cache"));
                }

                return ResponseEntity.badRequest().body(ApiResponse.error(
                    "এই ফাইলটি ইতিমধ্যে আপলোড করা হয়েছে। পুনরায় আপলোড করতে চাইলে আপলোড হিস্ট্রি থেকে পুরনো রেকর্ডটি মুছে ফেলুন।", 
                    400
                ));
            }

            // 2. Save file to storage
            String storedPath = null;
            try {
                storedPath = storageService.uploadFile(file, null, "ai-uploads");
                historyBuilder.storedFilePath(storedPath);
                log.info("AI upload saved to: {}", storedPath);
            } catch (Exception storageEx) {
                log.warn("Failed to save AI upload file (non-fatal): {}", storageEx.getMessage());
                // Non-fatal: continue with scraping even if storage fails
            }

            // 3. Build known context from user's hierarchy selection
            Map<String, String> knownContext = new LinkedHashMap<>();
            if (!knownClassName.isBlank())  knownContext.put("className",   knownClassName);
            if (!knownSubject.isBlank())    knownContext.put("subject",     knownSubject);
            if (!knownChapter.isBlank())    knownContext.put("chapter",     knownChapter);
            if (!knownTopic.isBlank())      knownContext.put("topic",       knownTopic);
            if (!knownClassLevel.isBlank()) knownContext.put("classLevel",  knownClassLevel);
            if (!customPrompt.isBlank())    knownContext.put("customPrompt", customPrompt);

            // 4. Check AI Quotas before proceeding
            aiBillingService.checkAiQuota();

            // 5. AI Scrape — inject known context to save tokens
            Map<String, Object> result = aiQuestionService.scrapeWithMetadata(file, questionType, knownContext);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> questions = (List<Map<String, Object>>) result.get("questions");
            Object metadata = result.get("metadata");

            long elapsed = System.currentTimeMillis() - startTime;
            
            java.util.Map<String, Integer> usage = com.testshaper.service.impl.AIQuestionServiceImpl.tokenUsageLocal.get();
            int inputTokens, outputTokens, totalTokens;
            if (usage != null) {
                inputTokens = usage.getOrDefault("inputTokens", 0);
                outputTokens = usage.getOrDefault("outputTokens", 0);
                totalTokens = Math.max(inputTokens + outputTokens, 500);
                com.testshaper.service.impl.AIQuestionServiceImpl.tokenUsageLocal.remove();
            } else {
                totalTokens = estimateTokens(file.getSize(), questions.size());
                inputTokens = (int) (totalTokens * 0.7);
                outputTokens = (int) (totalTokens * 0.3);
            }

            // Enforce and deduct quota for standard questions
            aiBillingService.checkQuestionQuota(questions.size());
            aiBillingService.deductQuestionQuota(questions.size());
            aiBillingService.deductTokens(totalTokens);

            // Extract detected metadata for history
            if (metadata instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> metaMap = (Map<String, Object>) metadata;
                historyBuilder.detectedClass(String.valueOf(metaMap.getOrDefault("className", "")));
                historyBuilder.detectedSubject(String.valueOf(metaMap.getOrDefault("subject", "")));
                historyBuilder.detectedChapter(String.valueOf(metaMap.getOrDefault("chapter", "")));
            }

            historyBuilder.questionsExtracted(questions.size())
                    .processingTimeMs(elapsed)
                    .success(true);

            // ★ Store result in cache (both memory + DB) for future duplicate uploads
            Map<String, Object> cacheableResult = new LinkedHashMap<>();
            cacheableResult.put("questions", questions);
            cacheableResult.put("metadata", metadata);
            scrapeResultCacheService.cacheResult(fileHash, cacheableResult);
            log.info("Scrape result cached for hash: {}... ({} questions)", fileHash.substring(0, 8), questions.size());

            // 4. Save usage log
            logBuilder.questionsCount(questions.size())
                    .modelUsed(resolveModel())
                    .inputTokens(inputTokens)
                    .outputTokens(outputTokens)
                    .totalTokens(totalTokens)
                    .costUsd(totalTokens * COST_PER_1K_TOKENS / 1000.0)
                    .processingTimeMs(elapsed)
                    .success(true);

            aiUsageLogRepository.save(logBuilder.build());
            uploadHistoryRepo.save(historyBuilder.build());

            Map<String, Object> responseData = new LinkedHashMap<>();
            responseData.put("questions", questions);
            responseData.put("count", questions.size());
            responseData.put("metadata", metadata);
            if (existing.isPresent()) {
                responseData.put("duplicateWarning", "এই ফাইলটি আগেও আপলোড করা হয়েছে (" + existing.get().getOriginalFileName() + ")");
            }

            return ResponseEntity.ok(ApiResponse.success(
                    responseData,
                    questions.size() + " questions extracted successfully"
            ));
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            logBuilder.success(false).errorMessage(e.getMessage()).processingTimeMs(elapsed);
            historyBuilder.success(false).errorMessage(e.getMessage()).processingTimeMs(elapsed);
            aiUsageLogRepository.save(logBuilder.build());
            uploadHistoryRepo.save(historyBuilder.build());

            log.error("AI scrape failed: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), 400));
        }
    }

    @PostMapping("/generate-questions")
    public ResponseEntity<?> generateQuestions(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "topic", defaultValue = "") String topic,
            @RequestParam(value = "questionType", defaultValue = "MCQ") String questionType,
            @RequestParam(value = "count", defaultValue = "10") int count,
            @RequestParam(value = "difficulty", defaultValue = "MIXED") String difficulty,
            @RequestParam(value = "bloomLevel", defaultValue = "MIXED") String bloomLevel) {

        long startTime = System.currentTimeMillis();
        AiUsageLog.AiUsageLogBuilder logBuilder = AiUsageLog.builder()
                .action("GENERATE")
                .questionType(questionType)
                .fileName(file != null ? file.getOriginalFilename() : null);

        setUserInfo(logBuilder);

        try {
            if ((topic == null || topic.isBlank()) && (file == null || file.isEmpty())) {
                return ResponseEntity.badRequest().body(
                        ApiResponse.error("টপিক বা রেফারেন্স ফাইলের মধ্যে অন্তত একটি দিতে হবে।", 400)
                );
            }

            // Save reference file if provided
            if (file != null && !file.isEmpty()) {
                try {
                    String storedPath = storageService.uploadFile(file, null, "ai-uploads");
                    AiUploadHistory history = AiUploadHistory.builder()
                            .originalFileName(file.getOriginalFilename())
                            .storedFilePath(storedPath)
                            .fileSize(file.getSize())
                            .mimeType(file.getContentType())
                            .fileHash(computeFileHash(file))
                            .actionType(AiUploadHistory.ActionType.GENERATE)
                            .questionType(questionType)
                            .success(true)
                            .build();
                    setUploadUserInfo2(history);
                    uploadHistoryRepo.save(history);
                } catch (Exception storageEx) {
                    log.warn("Failed to save generate reference file: {}", storageEx.getMessage());
                }
            }

            // Check AI Quotas before proceeding
            aiBillingService.checkAiQuota();
            aiBillingService.checkQuestionQuota(count);

            List<Map<String, Object>> questions = aiQuestionService.generateQuestions(
                    file, topic, questionType, count, difficulty, bloomLevel
            );

            long elapsed = System.currentTimeMillis() - startTime;
            
            java.util.Map<String, Integer> usage = com.testshaper.service.impl.AIQuestionServiceImpl.tokenUsageLocal.get();
            int inputTokens, outputTokens, totalTokens;
            if (usage != null) {
                inputTokens = usage.getOrDefault("inputTokens", 0);
                outputTokens = usage.getOrDefault("outputTokens", 0);
                totalTokens = Math.max(inputTokens + outputTokens, 500);
                com.testshaper.service.impl.AIQuestionServiceImpl.tokenUsageLocal.remove();
            } else {
                long fileSize = file != null ? file.getSize() : topic.length() * 2L;
                totalTokens = estimateTokens(fileSize, questions.size());
                inputTokens = (int) (totalTokens * 0.4);
                outputTokens = (int) (totalTokens * 0.6);
            }

            aiBillingService.deductQuestionQuota(questions.size());
            aiBillingService.deductTokens(totalTokens);

            logBuilder.questionsCount(questions.size())
                    .modelUsed(resolveModel())
                    .inputTokens(inputTokens)
                    .outputTokens(outputTokens)
                    .totalTokens(totalTokens)
                    .costUsd(totalTokens * COST_PER_1K_TOKENS / 1000.0)
                    .processingTimeMs(elapsed)
                    .success(true);

            aiUsageLogRepository.save(logBuilder.build());

            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("questions", questions, "count", questions.size()),
                    questions.size() + " questions generated successfully"
            ));
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            logBuilder.success(false).errorMessage(e.getMessage()).processingTimeMs(elapsed);
            aiUsageLogRepository.save(logBuilder.build());

            log.error("AI generate failed: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), 400));
        }
    }

    // ═══════════════════ Upload History API ═══════════════════

    @GetMapping("/upload-history")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> getUploadHistory(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) Boolean success) {
        List<AiUploadHistory> history = uploadHistoryRepo.search(email, success);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/upload-history/stats")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> getUploadStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUploads", uploadHistoryRepo.count());
        stats.put("successfulUploads", uploadHistoryRepo.countSuccessful());
        stats.put("totalQuestionsExtracted", uploadHistoryRepo.totalQuestionsExtracted());
        stats.put("totalStorageUsed", uploadHistoryRepo.totalFileSize());
        return ResponseEntity.ok(stats);
    }

    @DeleteMapping("/upload-history/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> deleteUploadHistory(@PathVariable UUID id) {
        return uploadHistoryRepo.findById(id).map(h -> {
            h.setDeleted(true);
            uploadHistoryRepo.save(h);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // ═══════════════════ Processing Jobs Queue ═══════════════════

    @GetMapping("/processing-jobs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> getProcessingJobs() {
        List<AiProcessingJob> jobs = jobRepo.findAll(org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(jobs);
    }

    @DeleteMapping("/processing-jobs/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> deleteProcessingJob(@PathVariable UUID id) {
        return jobRepo.findById(id).map(j -> {
            chunkedService.deleteAndArchiveJob(id);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // ═══════════════════ Chunked Processing API ═══════════════════

    /** Check if file needs chunked processing and get page count */
    @PostMapping("/chunked/analyze")
    public ResponseEntity<?> analyzeFile(@RequestParam("file") MultipartFile file) {
        try {
            boolean needsChunking = chunkedService.needsChunkedProcessing(file);
            int pageCount = chunkedService.getPageCount(file.getBytes());
            return ResponseEntity.ok(Map.of(
                    "needsChunking", needsChunking,
                    "pageCount", pageCount,
                    "estimatedChunks", (int) Math.ceil((double) pageCount / 10),
                    "fileSize", file.getSize()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("needsChunking", false, "pageCount", 0));
        }
    }

    /** Create a chunked processing job */
    @PostMapping("/chunked/create-job")
    public ResponseEntity<?> createChunkedJob(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "questionType", defaultValue = "MCQ") String questionType,
            @RequestParam(value = "classSubjectId", required = false) String classSubjectId,
            @RequestParam(value = "chapterId",      required = false) String chapterId,
            @RequestParam(value = "topicId",        required = false) String topicId,
            @RequestParam(value = "customPrompt",   required = false) String customPrompt) {
        try {
            // Check for duplicates before creating the job
            String fileHash = computeFileHash(file);
            Optional<AiUploadHistory> existing = uploadHistoryRepo.findFirstByFileHashAndDeletedFalseOrderByCreatedAtDesc(fileHash);
            if (existing.isPresent()) {
                return ResponseEntity.badRequest().body(ApiResponse.error(
                    "এই ফাইলটি ইতিমধ্যে আপলোড করা হয়েছে। পুনরায় আপলোড করতে চাইলে আপলোড হিস্ট্রি থেকে পুরনো রেকর্ডটি মুছে ফেলুন।", 
                    400
                ));
            }

            String[] userInfo = getCurrentUserInfo();
            AiProcessingJob job = chunkedService.createJob(file, questionType, userInfo[0], userInfo[1], customPrompt);
            // Persist user-selected hierarchy IDs for history restore
            if (classSubjectId != null && !classSubjectId.isBlank()) job.setClassSubjectId(classSubjectId);
            if (chapterId      != null && !chapterId.isBlank())      job.setChapterId(chapterId);
            if (topicId        != null && !topicId.isBlank())        job.setTopicId(topicId);
            jobRepo.save(job);
            return ResponseEntity.ok(ApiResponse.success(job, "চাঙ্কড প্রসেসিং জব তৈরি হয়েছে"));
        } catch (Exception e) {
            log.error("Failed to create chunked job", e);
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), 400));
        }
    }

    /** Process the next chunk of a job */
    @PostMapping("/chunked/process/{jobId}")
    public ResponseEntity<?> processNextChunk(
            @PathVariable UUID jobId,
            @RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> result = chunkedService.processNextChunk(jobId, file.getBytes());
            return ResponseEntity.ok(ApiResponse.success(result, "চাঙ্ক প্রসেস হয়েছে"));
        } catch (Exception e) {
            log.error("Chunk processing failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), 400));
        }
    }

    /** Get all processing jobs */
    @GetMapping("/chunked/jobs")
    public ResponseEntity<?> getJobs() {
        return ResponseEntity.ok(jobRepo.findByDeletedFalseOrderByCreatedAtDesc());
    }

    /** Get resumable (paused/failed) jobs */
    @GetMapping("/chunked/jobs/resumable")
    public ResponseEntity<?> getResumableJobs() {
        return ResponseEntity.ok(jobRepo.findByStatusInAndDeletedFalseOrderByCreatedAtDesc(
                List.of(AiProcessingJob.JobStatus.PAUSED, AiProcessingJob.JobStatus.PENDING)
        ));
    }

    /** Resume a paused job — downloads stored file and processes next chunk */
    @PostMapping("/chunked/resume/{jobId}")
    public ResponseEntity<?> resumeJob(@PathVariable UUID jobId) {
        // Prevent concurrent duplicate resume calls for the same job
        if (IN_FLIGHT_JOBS.putIfAbsent(jobId, Boolean.TRUE) != null) {
            log.warn("Duplicate resume request rejected for job {} — already in flight", jobId);
            return ResponseEntity.status(409).body(ApiResponse.error("Job is already being processed", 409));
        }
        try {
            AiProcessingJob job = jobRepo.findById(jobId)
                    .orElseThrow(() -> new RuntimeException("Job not found"));

            if (job.getStatus() == AiProcessingJob.JobStatus.COMPLETED) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Job already completed", 400));
            }
            if (job.getStoredFilePath() == null || job.getStoredFilePath().isBlank()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("No stored file path — please re-upload", 400));
            }

            // Load stored file
            byte[] pdfBytes;
            String path = job.getStoredFilePath();
            if (path.startsWith("http")) {
                org.springframework.web.client.RestTemplate rt = new org.springframework.web.client.RestTemplate();
                pdfBytes = rt.getForObject(path, byte[].class);
            } else {
                pdfBytes = fileStorageService.loadFile(path);
            }

            if (pdfBytes == null || pdfBytes.length == 0) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Failed to read stored file", 400));
            }

            Map<String, Object> result = chunkedService.processNextChunk(jobId, pdfBytes);
            return ResponseEntity.ok(ApiResponse.success(result, "Chunk processed successfully"));
        } catch (Exception e) {
            log.error("Resume failed for job {}: {}", jobId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), 400));
        } finally {
            IN_FLIGHT_JOBS.remove(jobId);
        }
    }

    /** Process all remaining chunks concurrently/in parallel */
    @PostMapping("/chunked/process-all/{jobId}")
    public ResponseEntity<?> processAllChunks(@PathVariable UUID jobId) {
        try {
            AiProcessingJob job = jobRepo.findById(jobId)
                    .orElseThrow(() -> new RuntimeException("Job not found"));

            if (job.getStatus() == AiProcessingJob.JobStatus.COMPLETED) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Job already completed", 400));
            }
            if (job.getStoredFilePath() == null || job.getStoredFilePath().isBlank()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("No stored file path — please re-upload", 400));
            }

            // Load stored file
            byte[] pdfBytes;
            String path = job.getStoredFilePath();
            if (path.startsWith("http")) {
                org.springframework.web.client.RestTemplate rt = new org.springframework.web.client.RestTemplate();
                pdfBytes = rt.getForObject(path, byte[].class);
            } else {
                pdfBytes = fileStorageService.loadFile(path);
            }

            if (pdfBytes == null || pdfBytes.length == 0) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Failed to read stored file", 400));
            }

            Map<String, Object> result = chunkedService.processAllChunksParallel(jobId, pdfBytes);
            return ResponseEntity.ok(ApiResponse.success(result, "All chunks processed in parallel"));
        } catch (Exception e) {
            log.error("Parallel process failed for job {}: {}", jobId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), 400));
        }
    }

    /** Skip the current error chunk and move to the next one */
    @PostMapping("/chunked/skip/{jobId}")
    @Transactional
    public ResponseEntity<?> skipChunk(@PathVariable UUID jobId) {
        try {
            AiProcessingJob job = jobRepo.findById(jobId)
                    .orElseThrow(() -> new RuntimeException("Job not found"));

            if (job.getStatus() == AiProcessingJob.JobStatus.COMPLETED) {
                throw new RuntimeException("এই জব ইতিমধ্যে সম্পূর্ণ হয়েছে।");
            }

            int prevStart = job.getCurrentChunkStart();
            int newStart = Math.min(prevStart + job.getPagesPerChunk(), job.getTotalPages() + 1);
            
            job.setProcessedChunks(job.getProcessedChunks() + 1);
            job.setCurrentChunkStart(newStart);
            job.setErrorMessage("Chunk skipped manually by user.");
            job.setLastErrorChunk(null);

            if (job.getProcessedChunks() >= job.getTotalChunks()) {
                job.setStatus(AiProcessingJob.JobStatus.COMPLETED);
            } else {
                job.setStatus(AiProcessingJob.JobStatus.PAUSED);
            }

            jobRepo.save(job);
            
            Map<String, Object> result = new HashMap<>();
            result.put("status", job.getStatus());
            result.put("processedChunks", job.getProcessedChunks());
            result.put("totalChunks", job.getTotalChunks());
            return ResponseEntity.ok(ApiResponse.success(result, "Chunk skipped successfully"));
        } catch (Exception e) {
            log.error("Skip failed for job {}: {}", jobId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), 400));
        }
    }

    /** Re-process a completed job — resets it to PAUSED so resume flow can collect all questions chunk by chunk */
    @PostMapping("/chunked/reprocess/{jobId}")
    @Transactional
    public ResponseEntity<?> reprocessJob(@PathVariable UUID jobId) {
        try {
            AiProcessingJob job = jobRepo.findById(jobId)
                    .orElseThrow(() -> new RuntimeException("Job not found"));

            // Clean old chunk results
            chunkResultRepo.deleteByJobId(jobId);

            // Reset the job to beginning
            job.setStatus(AiProcessingJob.JobStatus.PAUSED);
            job.setProcessedChunks(0);
            job.setCurrentChunkStart(1);
            job.setTotalQuestionsFound(0);
            job.setTotalProcessingTimeMs(0L);
            job.setErrorMessage(null);
            job.setLastErrorChunk(null);
            jobRepo.save(job);

            Map<String, Object> result = new java.util.LinkedHashMap<>();
            result.put("jobId", job.getId());
            result.put("status", "RESET");
            result.put("message", "Job reset to beginning. Use Resume to process all chunks.");
            result.put("totalChunks", job.getTotalChunks());
            return ResponseEntity.ok(ApiResponse.success(result, "Job reset for re-processing"));
        } catch (Exception e) {
            log.error("Reprocess failed for job {}: {}", jobId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), 400));
        }
    }

    /** Collect all saved questions for a job (partial or complete) */
    @GetMapping("/chunked/questions/{jobId}")
    @PreAuthorize("hasAnyAuthority('PERMISSION_AI_MANAGE', 'ROLE_SUPER_ADMIN', 'ROLE_INST_ADMIN', 'ROLE_TEACHER')")
    public ResponseEntity<?> getJobQuestions(@PathVariable UUID jobId) {
        try {
            AiProcessingJob job = jobRepo.findById(jobId)
                    .orElseThrow(() -> new RuntimeException("Job not found"));

            List<AiChunkResult> chunkResults = chunkResultRepo.findByJobIdOrderByChunkNumber(jobId);

            if (chunkResults.isEmpty()) {
                Map<String, Object> emptyResult = new LinkedHashMap<>();
                emptyResult.put("questions", new ArrayList<>());
                emptyResult.put("metadata", null);
                emptyResult.put("totalQuestions", 0);
                emptyResult.put("chunksProcessed", 0);
                emptyResult.put("totalChunks", job.getTotalChunks());
                emptyResult.put("isPartial", true);
                emptyResult.put("fileName", job.getOriginalFileName());
                return ResponseEntity.ok(ApiResponse.success(emptyResult, "No saved questions found for this job"));
            }

            // Collect all questions from all chunks
            List<Map<String, Object>> allQuestions = new ArrayList<>();
            Map<String, Object> metadata = null;

            for (AiChunkResult cr : chunkResults) {
                try {
                    List<Map<String, Object>> chunkQuestions = objectMapper.readValue(
                            cr.getQuestionsJson(), new TypeReference<List<Map<String, Object>>>() {});
                    allQuestions.addAll(chunkQuestions);

                    // Use metadata from first chunk
                    if (metadata == null && cr.getMetadataJson() != null) {
                        metadata = objectMapper.readValue(cr.getMetadataJson(), new TypeReference<Map<String, Object>>() {});
                    }
                } catch (Exception parseErr) {
                    log.warn("Failed to parse chunk {} of job {}: {}", cr.getChunkNumber(), jobId, parseErr.getMessage());
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("questions", allQuestions);
            result.put("metadata", metadata);
            result.put("totalQuestions", allQuestions.size());
            result.put("chunksProcessed", chunkResults.size());
            result.put("totalChunks", job.getTotalChunks());
            result.put("isPartial", chunkResults.size() < job.getTotalChunks());
            result.put("fileName", job.getOriginalFileName());
            result.put("fileUrl", job.getStoredFilePath()); // Expose for Remote Viewer
            
            // Detect file type for remote viewer
            String fName = (job.getOriginalFileName() != null) ? job.getOriginalFileName().toLowerCase() : "";
            boolean isPdf = fName.endsWith(".pdf");
            result.put("fileType", isPdf ? "application/pdf" : "image/jpeg");

            return ResponseEntity.ok(ApiResponse.success(result, "Questions collected successfully"));
        } catch (Exception e) {
            log.error("Failed to collect questions for job {}: {}", jobId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), 400));
        }
    }

    private String[] getCurrentUserInfo() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                return new String[]{ud.getUsername(), ud.getUsername()};
            }
        } catch (Exception ignored) {}
        return new String[]{"unknown", "Unknown"};
    }

    // ═══════════════════ Helpers ═══════════════════

    private String computeFileHash(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            log.warn("Failed to compute file hash: {}", e.getMessage());
            return null;
        }
    }

    private void setUserInfo(AiUsageLog.AiUsageLogBuilder builder) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails userDetails) {
                builder.userEmail(userDetails.getUsername());
                builder.userName(userDetails.getUsername());
                if (auth.getPrincipal() instanceof com.testshaper.security.CustomUserDetails customUser) {
                    builder.userId(customUser.getUserId());
                    builder.userName(customUser.getUsername());
                } else {
                    builder.userId(0L);
                }
            } else {
                builder.userId(0L).userEmail("unknown").userName("Unknown");
            }
        } catch (Exception e) {
            builder.userId(0L).userEmail("unknown").userName("Unknown");
        }
    }

    private void setUploadUserInfo(AiUploadHistory.AiUploadHistoryBuilder builder) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails userDetails) {
                builder.uploadedByEmail(userDetails.getUsername());
                builder.uploadedByName(userDetails.getUsername());
            }
        } catch (Exception ignored) {}
    }

    private void setUploadUserInfo2(AiUploadHistory history) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails userDetails) {
                history.setUploadedByEmail(userDetails.getUsername());
                history.setUploadedByName(userDetails.getUsername());
            }
        } catch (Exception ignored) {}
    }

    private int estimateTokens(long fileSizeBytes, int questionsCount) {
        int inputEstimate = (int) (fileSizeBytes / 4);
        int outputEstimate = questionsCount * 180;
        return Math.max(inputEstimate + outputEstimate, 500);
    }

    private String resolveModel() {
        try {
            return settingsRepo.findByTenantIdIsNullAndKey("ai_model")
                    .map(s -> s.getValue()).orElse("gemini-2.5-flash");
        } catch (Exception e) {
            return "gemini-2.5-flash";
        }
    }

    // ═══════════════════ API Key Pool Management ═══════════════════

    @PostMapping("/keys/{id}/test")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> testApiKey(@PathVariable UUID id) {
        return aiApiKeyRepo.findById(id).map(key -> {
            try {
                long start = System.currentTimeMillis();
                // Use key's own provider/model/baseUrl for an accurate test
                String keyProvider = (key.getProvider() != null && !key.getProvider().isBlank()) ? key.getProvider() : "Google";
                String keyModel   = (key.getModel()    != null && !key.getModel().isBlank())    ? key.getModel()    : resolveModel();
                String keyBaseUrl = (key.getBaseUrl()  != null && !key.getBaseUrl().isBlank())  ? key.getBaseUrl()  : "https://openrouter.ai/api/v1";
                boolean isOpenAI  = isOpenAICompatible(keyProvider);

                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

                String url, body;
                if (isOpenAI) {
                    url  = keyBaseUrl.endsWith("/") ? keyBaseUrl + "chat/completions" : keyBaseUrl + "/chat/completions";
                    body = "{\"model\":\"" + keyModel + "\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly: OK\"}],\"temperature\":0,\"max_tokens\":10}";
                    headers.setBearerAuth(key.getApiKey());
                } else {
                    // Gemini native
                    url  = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", keyModel, key.getApiKey());
                    body = "{\"contents\":[{\"parts\":[{\"text\":\"Reply with exactly: OK\"}]}],\"generationConfig\":{\"maxOutputTokens\":10}}";
                }

                org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(body, headers);
                org.springframework.web.client.RestTemplate rt = new org.springframework.web.client.RestTemplate();
                org.springframework.http.ResponseEntity<String> response = rt.exchange(url, org.springframework.http.HttpMethod.POST, entity, String.class);
                long elapsed = System.currentTimeMillis() - start;

                return ResponseEntity.ok(ApiResponse.success(Map.of(
                        "connected", true,
                        "keyName", key.getKeyName(),
                        "provider", keyProvider,
                        "model", keyModel,
                        "responseTimeMs", elapsed,
                        "status", response.getStatusCode().value()
                ), "Key test successful"));
            } catch (Exception e) {
                String err = e.getMessage();
                if (err != null && err.length() > 300) err = err.substring(0, 300);
                return ResponseEntity.ok(ApiResponse.success(Map.of(
                        "connected", false,
                        "keyName", key.getKeyName(),
                        "error", err != null ? err : "Unknown error"
                ), "Key test failed"));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/keys/pool-status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> getKeyPoolStatus() {
        return ResponseEntity.ok(ApiResponse.success(keyRotationService.getKeyPoolStatus(), "Key pool status"));
    }

    @GetMapping("/keys")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> getAllKeys() {
        List<AiApiKey> keys = keyRotationService.getAllKeys();
        maskApiKeys(keys);
        return ResponseEntity.ok(ApiResponse.success(keys, "API Keys"));
    }

    @GetMapping("/keys/deleted")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> getDeletedKeys() {
        List<AiApiKey> keys = aiApiKeyRepo.findByDeletedTrueOrderByPriorityAsc();
        maskApiKeys(keys);
        return ResponseEntity.ok(ApiResponse.success(keys, "Deleted API Keys"));
    }

    private void maskApiKeys(List<AiApiKey> keys) {
        keys.forEach(k -> {
            String key = k.getApiKey();
            if (key != null && key.length() > 8) {
                // Keep first 4 and last 4 chars
                k.setApiKey(key.substring(0, 4) + "********************" + key.substring(key.length() - 4));
            }
        });
    }

    @PostMapping("/keys/{id}/reveal")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> revealApiKey(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        String password = payload.get("password");
        if (!"Z@hid95".equals(password)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Incorrect password", 403));
        }
        return aiApiKeyRepo.findById(id).map(key ->
                ResponseEntity.ok(ApiResponse.success(Map.of("apiKey", key.getApiKey()), "API Key revealed"))
        ).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/keys")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> addApiKey(@RequestBody Map<String, Object> body) {
        String keyName   = (String) body.getOrDefault("keyName", "Key " + (keyRotationService.getAllKeys().size() + 1));
        String apiKey    = (String) body.get("apiKey");
        String provider  = (String) body.getOrDefault("provider", "Google");
        String baseUrl   = (String) body.getOrDefault("baseUrl", "");
        String model     = (String) body.getOrDefault("model", "");
        int dailyLimit   = body.containsKey("dailyLimit") ? ((Number) body.get("dailyLimit")).intValue() : 50000;
        int priority     = body.containsKey("priority")   ? ((Number) body.get("priority")).intValue()   : 10;
        boolean isPaid   = body.containsKey("isPaid")     ? (Boolean) body.get("isPaid")                 : false;

        if (apiKey == null || apiKey.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("API Key is required", 400));
        }

        // Default RPM based on provider tier
        int defaultRpm = "Google".equalsIgnoreCase(provider) ? 15 : 60;

        AiApiKey newKey = AiApiKey.builder()
                .keyName(keyName)
                .apiKey(apiKey)
                .provider(provider)
                .baseUrl(baseUrl.isBlank() ? null : baseUrl)
                .model(model.isBlank() ? null : model)
                .active(true)
                .dailyLimit(dailyLimit)
                .rpmLimit(defaultRpm)
                .priority(isPaid ? 1 : priority) // Paid keys have higher priority (1 usually)
                .isPaid(isPaid)
                .requestsToday(0)
                .totalRequests(0)
                .build();
        newKey.setTenantId("GLOBAL");
        newKey = aiApiKeyRepo.save(newKey);

        log.info("New API key added: {} [provider={}]", keyName, provider);
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("id", newKey.getId().toString(), "name", keyName, "provider", provider),
                "API Key added"));
    }

    private boolean isOpenAICompatible(String provider) {
        if (provider == null) return false;
        return provider.equalsIgnoreCase("OpenAI")
                || provider.equalsIgnoreCase("Anthropic")
                || provider.equalsIgnoreCase("AgentRouter")
                || provider.equalsIgnoreCase("OpenRouter")
                || provider.equalsIgnoreCase("Custom");
    }

    @PutMapping("/keys/{id}/toggle")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> toggleKey(@PathVariable UUID id) {
        return aiApiKeyRepo.findById(id).map(key -> {
            key.setActive(!key.isActive());
            aiApiKeyRepo.save(key);
            return ResponseEntity.ok(ApiResponse.success(key.isActive() ? "activated" : "deactivated", key.isActive() ? "Key activated" : "Key deactivated"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/keys/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> updateApiKey(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return aiApiKeyRepo.findById(id).map(key -> {
            if (body.containsKey("model")) key.setModel((String) body.get("model"));
            if (body.containsKey("keyName")) key.setKeyName((String) body.get("keyName"));
            if (body.containsKey("baseUrl")) key.setBaseUrl((String) body.get("baseUrl"));
            if (body.containsKey("dailyLimit")) key.setDailyLimit(((Number) body.get("dailyLimit")).intValue());
            if (body.containsKey("isPaid")) {
                boolean paid = (Boolean) body.get("isPaid");
                key.setIsPaid(paid);
                key.setPriority(paid ? 1 : 10);
            }
            if (body.containsKey("apiKey")) {
                String newVal = (String) body.get("apiKey");
                // Avoid saving masked keys back to db if user didn't change it
                if (newVal != null && !newVal.isBlank() && !newVal.contains("****")) {
                     key.setApiKey(newVal);
                }
            }
            aiApiKeyRepo.save(key);
            return ResponseEntity.ok(ApiResponse.success(key, "API Key updated successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/keys/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> deleteKey(@PathVariable UUID id) {
        return aiApiKeyRepo.findById(id).map(key -> {
            key.setDeleted(true);
            key.setActive(false);
            aiApiKeyRepo.save(key);
            keyRotationService.evictKeyCache();
            return ResponseEntity.ok(ApiResponse.success("deleted", "Key soft deleted"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/keys/{id}/restore")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> restoreKey(@PathVariable UUID id) {
        return aiApiKeyRepo.findById(id).map(key -> {
            key.setDeleted(false);
            aiApiKeyRepo.save(key);
            keyRotationService.evictKeyCache();
            return ResponseEntity.ok(ApiResponse.success("restored", "Key restored successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/keys/hard/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> hardDeleteKey(@PathVariable UUID id) {
        if (aiApiKeyRepo.existsById(id)) {
            aiApiKeyRepo.deleteById(id);
            return ResponseEntity.ok(ApiResponse.success("hard_deleted", "Key permanently deleted"));
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/copilot/ask")
    public ResponseEntity<?> askCopilot(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        String docId = request.get("docId");
        String filter = request.get("filter"); // e.g., Subject/Class
        String mode = request.getOrDefault("mode", "strict");
        String tone = request.getOrDefault("tone", "professional");

        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Query cannot be empty", 400));
        }

        try {
            String answer = copilotService.askCopilot(query, null, docId, filter, null, mode, tone, null);
            return ResponseEntity.ok(ApiResponse.success(answer, "Copilot answered successfully"));
        } catch (Exception e) {
            log.error("Copilot asking failed: ", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("Copilot failed: " + e.getMessage(), 500));
        }
    }

    @PostMapping("/upload-history/push-to-rag")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<?> pushToRag(@RequestBody Map<String, List<UUID>> request) {
        List<UUID> historyIds = request.getOrDefault("historyIds", Collections.emptyList());
        if (historyIds.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("No files selected", 400));
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = auth != null ? auth.getName() : "system";
        int count = 0;

        for (UUID historyId : historyIds) {
            AiUploadHistory history = uploadHistoryRepo.findById(historyId).orElse(null);
            if (history != null && !history.isAutoSavedToCurriculum() && history.getStoredFilePath() != null) {
                try {
                    com.testshaper.entity.CurriculumDocument doc = new com.testshaper.entity.CurriculumDocument();
                    doc.setTitle(history.getOriginalFileName());
                    doc.setAcademicYear(java.time.Year.now().getValue());
                    doc.setDocType(com.testshaper.entity.CurriculumDocument.DocType.SAMPLE_PAPER);
                    doc.setClassName(history.getDetectedClass());
                    doc.setSubjectName(history.getDetectedSubject());
                    doc.setFilePath(history.getStoredFilePath());
                    doc.setFileName(history.getOriginalFileName());
                    doc.setFileSize(history.getFileSize());
                    doc.setMimeType(history.getMimeType());
                    doc.setUploadedBy(userEmail);
                    doc.setTags("AI_IMPORT, RAG_ADDED");
                    doc.setProcessingStatus(com.testshaper.entity.CurriculumDocument.ProcessingStatus.PENDING);
                    doc = curriculumRepo.save(doc);

                    byte[] fileBytes = storageService.loadFileBytes(history.getStoredFilePath());
                    curriculumAnalyzerService.processAndSaveChunks(doc.getId(), fileBytes, false);

                    history.setAutoSavedToCurriculum(true);
                    uploadHistoryRepo.save(history);
                    count++;
                } catch (Exception e) {
                    log.error("Failed to push history {} to RAG: {}", historyId, e.getMessage());
                }
            }
        }

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("pushed", count),
                count + " files pushed to RAG successfully"
        ));
    }
}

