package com.testshaper.controller;

import com.testshaper.dto.SourceBookMasterDto;
import com.testshaper.service.KnowledgeHubService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.testshaper.service.DynamicStorageService;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/knowledge-hub")
@RequiredArgsConstructor
public class KnowledgeHubController {

    private final KnowledgeHubService knowledgeHubService;
    private final DynamicStorageService storageService;

    @org.springframework.beans.factory.annotation.Autowired
    private com.testshaper.scheduler.AiExtractionScheduler aiExtractionScheduler;

    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            String url = storageService.uploadFile(file, null, "knowledge_hub/covers");
            return ResponseEntity.ok(Collections.singletonMap("url", url));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", "Upload failed: " + e.getMessage()));
        }
    }

    /**
     * Proxies any CDN/R2 image through the backend so the browser (same-origin)
     * can draw it onto a canvas without the SecurityError "Tainted canvas".
     * The R2 bucket itself does not need CORS headers configured.
     */
    @GetMapping("/proxy-image")
    public ResponseEntity<byte[]> proxyImage(@RequestParam("url") String imageUrl) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(imageUrl))
                    .GET()
                    .build();
            HttpResponse<byte[]> resp = client.send(req, HttpResponse.BodyHandlers.ofByteArray());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                return ResponseEntity.status(resp.statusCode()).build();
            }
            String contentType = resp.headers().firstValue("content-type")
                    .orElse("image/jpeg");
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            // Allow the same-origin frontend to use the response in canvas
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set("Cache-Control", "public, max-age=86400");
            return ResponseEntity.ok().headers(headers).body(resp.body());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(("Proxy error: " + e.getMessage()).getBytes());
        }
    }

    @PutMapping("/source-books/{id}")
    public ResponseEntity<SourceBookMasterDto> updateSourceBook(@PathVariable UUID id, @RequestBody SourceBookMasterDto dto) {
        return ResponseEntity.ok(knowledgeHubService.updateSourceBook(id, dto));
    }

    @PostMapping(value = "/source-books/{id}/pages/bulk", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadSourceBookPages(
            @PathVariable UUID id,
            @RequestParam(value = "files") java.util.List<MultipartFile> files,
            @RequestParam(value = "startPage", defaultValue = "1") int startPage) {
        
        try {
            java.util.List<java.io.File> tempFiles = new java.util.ArrayList<>();
            String tempDirPath = System.getProperty("java.io.tmpdir");
            
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                String originalFilename = file.getOriginalFilename();
                if (originalFilename == null) originalFilename = "unknown.bin";
                
                // Remove spaces and special chars, append UUID to prevent conflict
                String safeName = UUID.randomUUID().toString() + "_" + originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
                java.io.File tempFile = new java.io.File(tempDirPath, safeName);
                
                file.transferTo(tempFile);
                tempFiles.add(tempFile);
            }
            
            // Dispatch completely async
            knowledgeHubService.processUploadsBackground(id, tempFiles, startPage);
            
            return ResponseEntity.ok(Map.of(
                "success", true, 
                "message", "Upload received. Files are processing in the background."
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/source-books/{id}/pages/bulk/prepare-upload")
    public ResponseEntity<Map<String, Object>> prepareUploads(@PathVariable UUID id, @RequestBody java.util.List<Map<String, String>> filesData) {
        try {
            Map<String, Object> result = storageService.generatePresignedUploadUrls(filesData, null, "knowledge_hub/pages/" + id);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/source-books/{id}/pages/bulk/finalize-upload")
    public ResponseEntity<Map<String, Object>> finalizeUploads(@PathVariable UUID id, @RequestBody java.util.List<Map<String, Object>> uploadedFiles) {
        try {
            knowledgeHubService.finalizeUploads(id, uploadedFiles);
            return ResponseEntity.ok(Map.of("success", true, "message", "Pages successfully queued"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/source-books/{id}/pages/bulk/register-session")
    public ResponseEntity<Map<String, Object>> registerUploadSession(@PathVariable UUID id, @RequestBody Map<String, Integer> payload) {
        try {
            int totalPages = payload.getOrDefault("totalPages", 0);
            return ResponseEntity.ok(knowledgeHubService.registerUploadSession(id, totalPages));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/source-books/{id}/pages/bulk/upload-status")
    public ResponseEntity<Map<String, Object>> getUploadStatus(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(knowledgeHubService.getUploadStatus(id));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/source-books/{id}/pages")
    public ResponseEntity<List<com.testshaper.dto.KnowledgePageDto>> getSourceBookPages(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeHubService.getSourceBookPages(id));
    }

    @PutMapping(value = "/source-books/{id}/pages/{pageId}/image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> updateKnowledgePageImage(
            @PathVariable UUID id,
            @PathVariable UUID pageId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            String newUrl = knowledgeHubService.updateKnowledgePageImage(id, pageId, file);
            return ResponseEntity.ok(Map.of("success", true, "imageUrl", newUrl));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @DeleteMapping("/source-books/{id}/pages/{pageId}")
    public ResponseEntity<Void> deleteSourceBookPage(@PathVariable UUID id, @PathVariable UUID pageId) {
        knowledgeHubService.deleteKnowledgePage(id, pageId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/source-books/{id}/pages/{pageId}/extract")
    public ResponseEntity<Map<String, String>> extractKnowledgePageContent(@PathVariable UUID id, @PathVariable UUID pageId) {
        try {
            String markdown = knowledgeHubService.extractKnowledgePageContent(id, pageId);
            return ResponseEntity.ok(Collections.singletonMap("markdown", markdown));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/source-books/{id}/pages/{pageId}/extract-toc")
    public ResponseEntity<Map<String, Object>> extractTableOfContents(@PathVariable UUID id, @PathVariable UUID pageId) {
        try {
            int count = knowledgeHubService.extractAndSaveTableOfContents(id, pageId);
            return ResponseEntity.ok(Map.of("message", "Generated " + count + " indices", "count", count));
        } catch (Exception e) {
            System.err.println("Error extracting TOC:");
            e.printStackTrace();
            String msg = e.getMessage() != null ? e.getMessage() : "Unknown internal error";
            return ResponseEntity.internalServerError().body(Map.of("error", msg));
        }
    }

    @PostMapping("/source-books/{id}/pages/{pageId}/extract-pub-info")
    public ResponseEntity<Object> extractPublicationInfo(@PathVariable UUID id, @PathVariable UUID pageId) {
        try {
            com.testshaper.dto.SourceBookMasterDto updatedBook = knowledgeHubService.extractAndSavePublicationInfo(id, pageId);
            return ResponseEntity.ok(updatedBook);
        } catch (Exception e) {
            System.err.println("Error extracting Pub Info:");
            e.printStackTrace();
            String msg = e.getMessage() != null ? e.getMessage() : "Unknown internal error";
            return ResponseEntity.internalServerError().body(Map.of("error", msg));
        }
    }

    @PostMapping("/source-books/{id}/pages/{pageId}/preview-toc")
    public ResponseEntity<Object> previewTableOfContents(@PathVariable UUID id, @PathVariable UUID pageId) {
        try {
            List<Map<String, Object>> chapters = knowledgeHubService.previewTableOfContents(id, pageId);
            return ResponseEntity.ok(chapters);
        } catch (Exception e) {
            System.err.println("Error previewing TOC:");
            e.printStackTrace();
            String msg = e.getMessage() != null ? e.getMessage() : "Unknown internal error";
            return ResponseEntity.internalServerError().body(Map.of("error", msg));
        }
    }

    @PatchMapping("/source-books/{id}/pages/{pageId}/flags")
    public ResponseEntity<Void> updatePageFlags(
            @PathVariable UUID id, 
            @PathVariable UUID pageId,
            @RequestBody java.util.Map<String, Boolean> flags) {
        knowledgeHubService.updatePageFlags(
            id, 
            pageId, 
            flags.get("isPubInfo"), 
            flags.get("isTocPage")
        );
        return ResponseEntity.ok().build();
    }

    @PutMapping("/source-books/{id}/pages/bulk-reorder")
    public ResponseEntity<Void> reorderPagesBulk(
            @PathVariable UUID id,
            @RequestBody java.util.Map<UUID, Integer> pageOrderMap) {
        knowledgeHubService.reorderPagesBulk(id, pageOrderMap);
        return ResponseEntity.ok().build();
    }

    // --- Phase 3A: Page-to-Chapter Assignment ---
    @PutMapping("/source-books/{id}/pages/{pageId}/assign-index")
    public ResponseEntity<com.testshaper.dto.KnowledgePageDto> assignPageToIndex(
            @PathVariable UUID id, @PathVariable UUID pageId,
            @RequestBody Map<String, String> body) {
        try {
            String indexIdStr = body.get("sourceBookIndexId");
            if (indexIdStr == null || indexIdStr.isBlank()) {
                return ResponseEntity.ok(knowledgeHubService.unassignPageFromIndex(id, pageId));
            }
            UUID indexId = UUID.fromString(indexIdStr);
            return ResponseEntity.ok(knowledgeHubService.assignPageToIndex(id, pageId, indexId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/source-books/{id}/auto-assign-indices")
    public ResponseEntity<Void> autoAssignPagesBulk(@PathVariable UUID id) {
        knowledgeHubService.autoAssignPagesBulk(id);
        return ResponseEntity.ok().build();
    }

    // --- Phase 3B: Golden Content Workflow ---
    @PutMapping("/source-books/{id}/pages/{pageId}/golden")
    public ResponseEntity<com.testshaper.dto.KnowledgePageDto> markAsGolden(
            @PathVariable UUID id, @PathVariable UUID pageId,
            @RequestBody Map<String, String> body) {
        try {
            String goldenMarkdown = body.get("goldenMarkdown"); // nullable — falls back to extractedMarkdown
            return ResponseEntity.ok(knowledgeHubService.markAsGolden(id, pageId, goldenMarkdown));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(null);
        }
    }

    // --- Source Book Index API ---
    @GetMapping("/source-books/{id}/indices")
    public ResponseEntity<List<com.testshaper.dto.SourceBookIndexDto>> getSourceBookIndices(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeHubService.getSourceBookIndices(id));
    }

    @PostMapping("/source-books/{id}/indices")
    public ResponseEntity<com.testshaper.dto.SourceBookIndexDto> createSourceBookIndex(@PathVariable UUID id, @RequestBody com.testshaper.dto.SourceBookIndexDto dto) {
        return ResponseEntity.ok(knowledgeHubService.createSourceBookIndex(id, dto));
    }

    @PutMapping("/source-books/{id}/indices/{indexId}")
    public ResponseEntity<com.testshaper.dto.SourceBookIndexDto> updateSourceBookIndex(
            @PathVariable UUID id, @PathVariable UUID indexId, 
            @RequestBody com.testshaper.dto.SourceBookIndexDto dto) {
        return ResponseEntity.ok(knowledgeHubService.updateSourceBookIndex(id, indexId, dto));
    }

    @DeleteMapping("/source-books/{id}/indices/{indexId}")
    public ResponseEntity<Void> deleteSourceBookIndex(@PathVariable UUID id, @PathVariable UUID indexId) {
        knowledgeHubService.deleteSourceBookIndex(id, indexId);
        return ResponseEntity.noContent().build();
    }

    // --- Source Books Registry ---
    @GetMapping("/source-books/{id}")
    public ResponseEntity<SourceBookMasterDto> getSourceBook(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeHubService.getSourceBook(id));
    }

    @PostMapping("/source-books")
    public ResponseEntity<SourceBookMasterDto> createSourceBook(@RequestBody SourceBookMasterDto dto) {
        return ResponseEntity.ok(knowledgeHubService.createSourceBook(dto));
    }

    @GetMapping("/source-books")
    public ResponseEntity<List<SourceBookMasterDto>> getAllSourceBooks() {
        return ResponseEntity.ok(knowledgeHubService.getAllSourceBooks());
    }

    @GetMapping("/source-books/paginated")
    public ResponseEntity<org.springframework.data.domain.Page<SourceBookMasterDto>> getPaginatedSourceBooks(
            @RequestParam(required = false) String searchTerm,
            @RequestParam(defaultValue = "ALL") String bookType,
            @RequestParam(required = false) java.util.List<UUID> classSubjectIds,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(knowledgeHubService.getPaginatedSourceBooks(searchTerm, bookType, classSubjectIds, page, size));
    }

    @DeleteMapping("/source-books/{id}")
    public ResponseEntity<Void> deleteSourceBook(@PathVariable UUID id) {
        knowledgeHubService.deleteSourceBook(id);
        return ResponseEntity.noContent().build();
    }

    // --- Background AI Extraction Jobs ---

    @PostMapping("/jobs/bulk-extract/source-books/{id}")
    public ResponseEntity<com.testshaper.entity.AiBulkExtractionJob> startAiExtractionQueue(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeHubService.startAiExtractionQueue(id));
    }

    @GetMapping("/jobs/bulk-extract/source-books/{id}/status")
    public ResponseEntity<com.testshaper.entity.AiBulkExtractionJob> getAiExtractionQueueStatus(@PathVariable UUID id) {
        com.testshaper.entity.AiBulkExtractionJob job = knowledgeHubService.getAiExtractionQueueStatus(id);
        if (job == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(job);
    }

    @PostMapping("/jobs/bulk-extract/{jobId}/pause")
    public ResponseEntity<com.testshaper.entity.AiBulkExtractionJob> pauseAiExtractionQueue(@PathVariable UUID jobId) {
        return ResponseEntity.ok(knowledgeHubService.pauseAiExtractionQueue(jobId));
    }

    @PostMapping("/jobs/bulk-extract/{jobId}/resume")
    public ResponseEntity<com.testshaper.entity.AiBulkExtractionJob> resumeAiExtractionQueue(@PathVariable UUID jobId) {
        return ResponseEntity.ok(knowledgeHubService.resumeAiExtractionQueue(jobId));
    }

    @PostMapping("/jobs/bulk-extract/{jobId}/cancel")
    public ResponseEntity<com.testshaper.entity.AiBulkExtractionJob> cancelAiExtractionQueue(@PathVariable UUID jobId) {
        return ResponseEntity.ok(knowledgeHubService.cancelAiExtractionQueue(jobId));
    }

    // --- Background Tasks (Ai Question Generation Queue) ---
    @PostMapping("/jobs/generate-questions/source-books/{id}/start")
    public ResponseEntity<com.testshaper.entity.AiQuestionGenerationJob> startAiQuestionQueue(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeHubService.startAiQuestionQueue(id));
    }

    @GetMapping("/jobs/generate-questions/source-books/{id}/status")
    public ResponseEntity<com.testshaper.entity.AiQuestionGenerationJob> getAiQuestionQueueStatus(@PathVariable UUID id) {
        com.testshaper.entity.AiQuestionGenerationJob job = knowledgeHubService.getAiQuestionQueueStatus(id);
        if (job == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(job);
    }

    @PostMapping("/jobs/generate-questions/{jobId}/pause")
    public ResponseEntity<com.testshaper.entity.AiQuestionGenerationJob> pauseAiQuestionQueue(@PathVariable UUID jobId) {
        return ResponseEntity.ok(knowledgeHubService.pauseAiQuestionQueue(jobId));
    }

    @PostMapping("/jobs/generate-questions/{jobId}/resume")
    public ResponseEntity<com.testshaper.entity.AiQuestionGenerationJob> resumeAiQuestionQueue(@PathVariable UUID jobId) {
        return ResponseEntity.ok(knowledgeHubService.resumeAiQuestionQueue(jobId));
    }

    @PostMapping("/jobs/generate-questions/{jobId}/cancel")
    public ResponseEntity<com.testshaper.entity.AiQuestionGenerationJob> cancelAiQuestionQueue(@PathVariable UUID jobId) {
        return ResponseEntity.ok(knowledgeHubService.cancelAiQuestionQueue(jobId));
    }

    // --- System Health and Active Jobs ---
    @GetMapping("/system-health-jobs")
    public ResponseEntity<Map<String, Object>> getSystemHealthAndJobs() {
        return ResponseEntity.ok(knowledgeHubService.getSystemHealthAndJobs());
    }

    @PostMapping("/system-health-jobs/workers")
    public ResponseEntity<Map<String, Object>> updateWorkerSize(@RequestParam("size") int size) {
        aiExtractionScheduler.setMaxWorkers(size);
        return ResponseEntity.ok(Map.of("success", true, "newSize", size));
    }

    // ── AI Text Editing — GoldenEditor AI Tooltips ──────────────────────────
    /**
     * AI-powered inline text editing for GoldenEditor.
     * Actions: fix_grammar | rewrite | translate_en | translate_bn
     */
    @PostMapping("/ai/edit-text")
    public ResponseEntity<Map<String, Object>> aiEditText(@RequestBody Map<String, String> body) {
        String action = body.getOrDefault("action", "fix_grammar");
        String selectedText = body.getOrDefault("text", "");

        if (selectedText == null || selectedText.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No text provided"));
        }

        String prompt;
        switch (action) {
            case "rewrite" ->
                prompt = "You are a professional Bengali text editor. Rewrite the following text to make it clearer, " +
                         "more natural and well-structured. Preserve the original meaning and language (Bengali/English as-is). " +
                         "Do NOT add explanations. Return ONLY the rewritten text.\n\nText:\n" + selectedText;
            case "translate_en" ->
                prompt = "Translate the following Bengali text to English accurately. " +
                         "Use natural, professional language. Return ONLY the translated text.\n\nText:\n" + selectedText;
            case "translate_bn" ->
                prompt = "Translate the following English text to Bengali accurately. " +
                         "Use natural, standard Bengali. Return ONLY the translated text.\n\nText:\n" + selectedText;
            default -> // fix_grammar
                prompt = "You are a professional Bengali/English grammar corrector. " +
                         "Fix all spelling mistakes, grammatical errors, and OCR artifacts in the following text. " +
                         "Preserve the original language and meaning exactly. " +
                         "If the text is in Bengali, correct it in Bengali. If English, correct in English. " +
                         "Do NOT add explanations. Return ONLY the corrected text.\n\nText:\n" + selectedText;
        }

        try {
            String result = knowledgeHubService.callAiTextEdit(prompt);
            return ResponseEntity.ok(Map.of("result", result, "action", action));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "AI edit failed: " + e.getMessage()));
        }
    }
}
