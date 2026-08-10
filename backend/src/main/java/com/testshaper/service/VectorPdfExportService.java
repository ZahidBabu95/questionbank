package com.testshaper.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class VectorPdfExportService {

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public byte[] generateVectorPdf(UUID examId, String pageSize, String orientation, String authToken) throws IOException, InterruptedException {
        String targetUrl = frontendUrl + "/exams/print-view/" + examId;
        Path tempFile = Files.createTempFile("exam_vector_pdf_" + examId + "_", ".pdf");

        File projectRoot = new File(System.getProperty("user.dir"));
        File scriptFile = new File(projectRoot, "scripts/pdf-generator.js");
        if (!scriptFile.exists()) {
            scriptFile = new File(projectRoot, "backend/scripts/pdf-generator.js");
        }

        String safePageSize = (pageSize != null && !pageSize.isBlank()) ? pageSize : "A4";
        String safeOrientation = (orientation != null && !orientation.isBlank()) ? orientation : "portrait";
        String safeToken = (authToken != null && !authToken.isBlank()) ? authToken : "";

        ProcessBuilder pb = new ProcessBuilder(
                "node",
                scriptFile.getAbsolutePath(),
                targetUrl,
                tempFile.toAbsolutePath().toString(),
                safePageSize,
                safeOrientation,
                safeToken
        );
        pb.directory(projectRoot);
        pb.redirectErrorStream(true);

        log.info("[VectorPDF] Launching Puppeteer for exam: {}, URL: {}", examId, targetUrl);
        Process process = pb.start();

        boolean finished = process.waitFor(45, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            Files.deleteIfExists(tempFile);
            throw new RuntimeException("Puppeteer vector PDF generation timed out after 45 seconds");
        }

        if (process.exitValue() != 0) {
            String errorLog = new String(process.getInputStream().readAllBytes());
            log.error("[VectorPDF] Puppeteer script failed with code {}: {}", process.exitValue(), errorLog);
            Files.deleteIfExists(tempFile);
            throw new RuntimeException("Puppeteer script execution failed: " + errorLog);
        }

        byte[] pdfBytes = Files.readAllBytes(tempFile);
        Files.deleteIfExists(tempFile);
        log.info("[VectorPDF] Vector PDF generated successfully for exam {}, size: {} bytes", examId, pdfBytes.length);
        return pdfBytes;
    }
}
