package com.testshaper.controller;

import com.testshaper.dto.PdfDownloadOptions;
import com.testshaper.service.impl.ExamPdfService;
import com.testshaper.service.impl.ExamWordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/exams/download")
@RequiredArgsConstructor
@Slf4j
public class ExamDownloadController {

    private final ExamPdfService examPdfService;
    private final ExamWordService examWordService;

    /**
     * GET /api/v1/exams/download/pdf/{examId}
     *
     * Query params:
     * includeAnswers=false
     * includeAnswerSheet=false
     * includeWatermark=false
     * shuffleQuestions=false
     * shuffleOptions=false
     * paperSize=A4
     * template=default
     * fontSize=11
     */
    @PostMapping(value = "/upload-temp/{examId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadTempPdf(
            @PathVariable UUID examId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(defaultValue = "false") boolean includeAnswers) {
        try {
            byte[] bytes = file.getBytes();
            java.nio.file.Path tempDir = java.nio.file.Paths.get("uploads", "temp-pdf").toAbsolutePath().normalize();
            java.nio.file.Files.createDirectories(tempDir);
            String filename = "beautiful-" + examId + (includeAnswers ? "-answers" : "") + ".pdf";
            java.nio.file.Path targetFile = tempDir.resolve(filename);
            java.nio.file.Files.write(targetFile, bytes);
            log.info("Successfully uploaded beautiful client-side PDF (answers={}) for examId: {}", includeAnswers, examId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Failed to upload temporary client-side PDF", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/pdf/{examId}")
    public ResponseEntity<byte[]> downloadPdf(
            @PathVariable UUID examId,
            @RequestParam(defaultValue = "false") boolean includeAnswers,
            @RequestParam(defaultValue = "false") boolean includeAnswerSheet,
            @RequestParam(defaultValue = "false") boolean includeWatermark,
            @RequestParam(defaultValue = "false") boolean shuffleQuestions,
            @RequestParam(defaultValue = "false") boolean shuffleOptions,
            @RequestParam(defaultValue = "A4") String paperSize,
            @RequestParam(defaultValue = "default") String template,
            @RequestParam(defaultValue = "11") float fontSize,
            @RequestParam(required = false) String filename) {

        // Check if there is a beautiful client-side PDF pre-uploaded for this examId and includeAnswers state
        String targetFilename = "beautiful-" + examId + (includeAnswers ? "-answers" : "") + ".pdf";
        java.nio.file.Path targetFile = java.nio.file.Paths.get("uploads", "temp-pdf", targetFilename).toAbsolutePath().normalize();
        if (java.nio.file.Files.exists(targetFile)) {
            try {
                // Check if file is younger than 15 seconds (immediate download session only)
                long ageMs = java.time.Instant.now().toEpochMilli() - java.nio.file.Files.getLastModifiedTime(targetFile).toMillis();
                if (ageMs < 15000) {
                    byte[] pdf = java.nio.file.Files.readAllBytes(targetFile);
                    String fileDownloadName = (filename != null && !filename.trim().isEmpty())
                            ? filename.trim() + (filename.toLowerCase().endsWith(".pdf") ? "" : ".pdf")
                            : "exam-" + examId + ".pdf";

                    log.info("Serving beautiful client-side PDF (answers={}) for examId: {}", includeAnswers, examId);
                    return ResponseEntity.ok()
                            .contentType(MediaType.APPLICATION_PDF)
                            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileDownloadName + "\"")
                            .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                            .header("X-Exam-Id", examId.toString())
                            .body(pdf);
                } else {
                    // Stale file, delete it
                    try {
                        java.nio.file.Files.delete(targetFile);
                        log.info("Deleted stale temporary client-side PDF for examId: {}", examId);
                    } catch (Exception deleteErr) {
                        log.warn("Failed to delete stale temporary PDF: {}", deleteErr.getMessage());
                    }
                }
            } catch (Exception e) {
                log.error("Failed to read beautiful client-side PDF, falling back to server-side generation", e);
            }
        }

        PdfDownloadOptions opts = new PdfDownloadOptions();
        opts.setIncludeAnswers(includeAnswers);
        opts.setIncludeAnswerSheet(includeAnswerSheet);
        opts.setIncludeWatermark(includeWatermark);
        opts.setShuffleQuestions(shuffleQuestions);
        opts.setShuffleOptions(shuffleOptions);
        opts.setPaperSize(paperSize);
        opts.setTemplate(template);
        opts.setFontSize(fontSize);

        byte[] pdf = examPdfService.generatePdf(examId, opts);

        String fileDownloadName = (filename != null && !filename.trim().isEmpty())
                ? filename.trim() + (filename.toLowerCase().endsWith(".pdf") ? "" : ".pdf")
                : "exam-" + examId + ".pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileDownloadName + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .header("X-Exam-Id", examId.toString())
                .body(pdf);
    }

    /**
     * GET /api/v1/exams/download/word/{examId}
     */
    @GetMapping("/word/{examId}")
    public ResponseEntity<byte[]> downloadWord(
            @PathVariable UUID examId,
            @RequestParam(defaultValue = "false") boolean includeAnswers,
            @RequestParam(defaultValue = "false") boolean includeAnswerSheet,
            @RequestParam(defaultValue = "false") boolean includeWatermark,
            @RequestParam(defaultValue = "false") boolean shuffleQuestions,
            @RequestParam(defaultValue = "false") boolean shuffleOptions,
            @RequestParam(defaultValue = "A4") String paperSize,
            @RequestParam(defaultValue = "default") String template,
            @RequestParam(defaultValue = "11") float fontSize,
            @RequestParam(required = false) String filename) {

        PdfDownloadOptions opts = new PdfDownloadOptions();
        opts.setIncludeAnswers(includeAnswers);
        opts.setIncludeAnswerSheet(includeAnswerSheet);
        opts.setIncludeWatermark(includeWatermark);
        opts.setShuffleQuestions(shuffleQuestions);
        opts.setShuffleOptions(shuffleOptions);
        opts.setPaperSize(paperSize);
        opts.setTemplate(template);
        opts.setFontSize(fontSize);

        byte[] wordBytes = examWordService.generateWord(examId, opts);

        String fileDownloadName = (filename != null && !filename.trim().isEmpty())
                ? filename.trim() + (filename.toLowerCase().endsWith(".docx") ? "" : ".docx")
                : "exam-" + examId + ".docx";

        return ResponseEntity.ok()
                .contentType(MediaType
                        .parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileDownloadName + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .header("X-Exam-Id", examId.toString())
                .body(wordBytes);
    }
}
