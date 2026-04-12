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
    @GetMapping("/pdf/{examId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<byte[]> downloadPdf(
            @PathVariable UUID examId,
            @RequestParam(defaultValue = "false") boolean includeAnswers,
            @RequestParam(defaultValue = "false") boolean includeAnswerSheet,
            @RequestParam(defaultValue = "false") boolean includeWatermark,
            @RequestParam(defaultValue = "false") boolean shuffleQuestions,
            @RequestParam(defaultValue = "false") boolean shuffleOptions,
            @RequestParam(defaultValue = "A4") String paperSize,
            @RequestParam(defaultValue = "default") String template,
            @RequestParam(defaultValue = "11") float fontSize) {

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

        String filename = "exam-" + examId + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .header("X-Exam-Id", examId.toString())
                .body(pdf);
    }

    /**
     * GET /api/v1/exams/download/word/{examId}
     */
    @GetMapping("/word/{examId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<byte[]> downloadWord(
            @PathVariable UUID examId,
            @RequestParam(defaultValue = "false") boolean includeAnswers,
            @RequestParam(defaultValue = "false") boolean includeAnswerSheet,
            @RequestParam(defaultValue = "false") boolean includeWatermark,
            @RequestParam(defaultValue = "false") boolean shuffleQuestions,
            @RequestParam(defaultValue = "false") boolean shuffleOptions,
            @RequestParam(defaultValue = "A4") String paperSize,
            @RequestParam(defaultValue = "default") String template,
            @RequestParam(defaultValue = "11") float fontSize) {

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

        String filename = "exam-" + examId + ".docx";
        return ResponseEntity.ok()
                .contentType(MediaType
                        .parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .header("X-Exam-Id", examId.toString())
                .body(wordBytes);
    }
}
