package com.testshaper.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testshaper.entity.CurriculumDocument;
import com.testshaper.entity.CurriculumDocumentChunk;
import com.testshaper.repository.CurriculumDocumentChunkRepository;
import com.testshaper.repository.GeneralSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class CurriculumAnalyzerService {

    private final AIQuestionService aiQuestionService;
    private final CurriculumDocumentChunkRepository chunkRepository;
    private final com.testshaper.repository.CurriculumDocumentRepository documentRepository;
    private final ObjectMapper objectMapper;
    private final DynamicStorageService storageService;
    private final VectorDatabaseService vectorDatabaseService;
    private final GeneralSettingRepository settingRepository;

    private static volatile int currentWorkerSize = 4;
    private final ThreadPoolTaskExecutor workerPool = new ThreadPoolTaskExecutor();

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void init() {
        log.info("Checking for stuck curriculum processing jobs from previous server run...");
        List<CurriculumDocument> stuckDocs = documentRepository.findByProcessingStatus(CurriculumDocument.ProcessingStatus.PROCESSING);
        if (!stuckDocs.isEmpty()) {
            for (CurriculumDocument doc : stuckDocs) {
                log.warn("Found stuck document (ID: {}). Resetting status to FAILED.", doc.getId());
                doc.setProcessingStatus(CurriculumDocument.ProcessingStatus.FAILED);
                doc.setErrorMessage("Server was restarted abruptly while processing this document.");
            }
            documentRepository.saveAll(stuckDocs);
            log.info("Reset {} stuck documents to FAILED so they can be resumed.", stuckDocs.size());
        }

        // Initialize Dynamic Worker Pool for Curriculum Processing
        settingRepository.findByTenantIdIsNullAndKey("AI_WORKER_POOL_SIZE").ifPresent(setting -> {
            try {
                currentWorkerSize = Integer.parseInt(setting.getValue());
                log.info("Loaded AI Worker Pool size from DB for CurriculumAnalyzer: {}", currentWorkerSize);
            } catch (NumberFormatException ignored) {}
        });

        workerPool.setCorePoolSize(currentWorkerSize);
        workerPool.setMaxPoolSize(currentWorkerSize);
        workerPool.setQueueCapacity(5000);
        workerPool.setThreadNamePrefix("CurriculumWorker-");
        workerPool.setDaemon(true);
        workerPool.initialize();
    }

    /**
     * One-time utility to sync existing MySQL chunks into Pinecone.
     */
    @Async
    @org.springframework.transaction.annotation.Transactional
    public void syncAllExistingChunksToPinecone() {
        log.info("Starting background sync of ALL existing chunks to Pinecone Vector DB...");
        List<CurriculumDocumentChunk> allChunks = chunkRepository.findAll();
        int count = 0;
        
        for (CurriculumDocumentChunk chunkEntity : allChunks) {
            try {
                Map<String, Object> metadata = new HashMap<>();
                if (chunkEntity.getDocument() != null) {
                    metadata.put("docId", chunkEntity.getDocument().getId().toString());
                    metadata.put("subjectName", chunkEntity.getDocument().getSubjectName() != null ? chunkEntity.getDocument().getSubjectName() : "Unknown");
                    metadata.put("className", chunkEntity.getDocument().getClassName() != null ? chunkEntity.getDocument().getClassName() : "Unknown");
                }
                metadata.put("pageNum", chunkEntity.getPageNumber());
                
                if (chunkEntity.getImageUrl() != null && !chunkEntity.getImageUrl().isEmpty()) {
                    metadata.put("hasImage", true);
                }
                
                vectorDatabaseService.upsertChunk(chunkEntity.getId().toString(), chunkEntity.getChunkText(), metadata);
                count++;
                
                if (count % 50 == 0) {
                    log.info("Synced {} chunks to Pinecone...", count);
                }
            } catch (Exception e) {
                log.error("Failed to sync chunk {} to Pinecone", chunkEntity.getId(), e);
            }
        }
        log.info("Finished syncing {} chunks to Pinecone Vector DB successfully!", count);
    }

    /**
     * Reads the first few pages of a PDF to extract metadata using AI.
     */
    public Map<String, Object> analyzeDocumentPreview(MultipartFile file) throws Exception {
        // Read only first 3 pages to save AI token processing time & cost
        String extractedText = extractTextFromPdf(file, 1, 3); 
        
        String prompt = """
            You are an expert at analyzing Bangladeshi Curriculum (NCTB) and Syllabus documents.
            Read the following text extracted from the first few pages of a curriculum document.
            
            Extract the following information and return ONLY a valid JSON object:
            - title: The full title of the document (in Bangla or English, clean it up)
            - academicYear: The academic year it applies to (integer, e.g. 2024 or 2026). Try to guess from text. Else return current year.
            - docType: One of [CURRICULUM, SYLLABUS, QUESTION_GUIDELINE, MARK_DISTRIBUTION, SAMPLE_PAPER]
            - className: The specific class or classes (e.g., "Class 6 - 8" or "নবম-দশম শ্রেণি")
            - subjectName: The subject (e.g., "বাংলা", "Science"). If it covers all subjects, put "All Subjects".
            - description: A short, professional summary of the rules, mark distribution, and guidelines (keep it under 4 sentences).
            
            Focus on extracting standard Question Shaper Configuration (Marks, Structure, Types of questions).
            
            Text:
            """ + extractedText;

        String jsonResponse = aiQuestionService.generateRawCompletion(prompt, null);
        
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(jsonResponse, Map.class);
            return result;
        } catch (Exception e) {
            log.error("Failed to parse AI JSON response: {}", jsonResponse);
            throw new RuntimeException("AI faild to return valid JSON metadata. Raw: " + jsonResponse);
        }
    }

    /**
     * Reads the entire PDF, splits it into smaller chunks, and saves to database.
     * This forms the "Knowledge Base" for the RAG Chatbot.
     * Executed asynchronously using the dynamic worker pool so UI is not blocked.
     */
    public void processAndSaveChunks(UUID documentId, byte[] fileBytes, boolean forceRegenerate) {
        workerPool.execute(() -> {
            doProcessAndSaveChunks(documentId, fileBytes, forceRegenerate);
        });
    }

    private void doProcessAndSaveChunks(UUID documentId, byte[] fileBytes, boolean forceRegenerate) {
        log.info("Starting background RAG chunking for document id: {}", documentId);
        
        Optional<CurriculumDocument> docOpt = documentRepository.findById(documentId);
        if (docOpt.isEmpty()) {
            log.error("Document not found for chunking: {}", documentId);
            return;
        }
        
        CurriculumDocument document = docOpt.get();
        int startIndex = 0;
        
        if (forceRegenerate || document.getProcessedChunks() == null || document.getProcessedChunks() == 0) {
            document.setProcessedChunks(0);
            document.setTotalChunks(0);
            // Clear existing chunks for this document
            chunkRepository.deleteByDocumentId(document.getId());
        } else {
            // Resuming from the last completed point
            startIndex = document.getProcessedChunks();
            log.info("Resuming chunking for document {} from index {}", document.getTitle(), startIndex);
        }
        
        document.setProcessingStatus(CurriculumDocument.ProcessingStatus.PROCESSING);
        document.setErrorMessage(null);
        document = documentRepository.save(document);

        java.io.File tempFile = null;
        try {
            // Write bytes to a temporary file to prevent Memory issues (OutOfMemoryError) when loading large PDFs
            tempFile = java.io.File.createTempFile("curriculum_", ".pdf");
            java.nio.file.Files.write(tempFile.toPath(), fileBytes);
            
            try (PDDocument pdf = org.apache.pdfbox.Loader.loadPDF(tempFile)) {
                int totalPages = pdf.getNumberOfPages();
                document.setTotalChunks(totalPages); // Tracking progress by PAGES for a smoother UI experience
                document = documentRepository.save(document);
                
                PDFTextStripper stripper = new PDFTextStripper();
                org.apache.pdfbox.rendering.PDFRenderer pdfRenderer = Boolean.TRUE.equals(document.getVisionEnabled()) ? new org.apache.pdfbox.rendering.PDFRenderer(pdf) : null;
                List<CurriculumDocumentChunk> entities = new ArrayList<>();
                int globalChunkIndex = 0;
                
                // If resuming, startIndex is treated as the last completed page
                for (int pageNum = startIndex + 1; pageNum <= totalPages; pageNum++) {
                    String pageText = null;
                    boolean usedVision = false;

                    if (Boolean.TRUE.equals(document.getVisionEnabled()) && pdfRenderer != null) {
                        try {
                            log.info("Running Multimodal Vision OCR on document {}, page {}", document.getId(), pageNum);
                            java.awt.image.BufferedImage bim = pdfRenderer.renderImageWithDPI(pageNum - 1, 150, org.apache.pdfbox.rendering.ImageType.RGB);
                            java.io.ByteArrayOutputStream os = new java.io.ByteArrayOutputStream();
                            javax.imageio.ImageIO.write(bim, "png", os);
                            final byte[] imgBytes = os.toByteArray();
                            
                            org.springframework.web.multipart.MultipartFile mockFile = new org.springframework.web.multipart.MultipartFile() {
                                @Override public String getName() { return "page.png"; }
                                @Override public String getOriginalFilename() { return "page.png"; }
                                @Override public String getContentType() { return "image/png"; }
                                @Override public boolean isEmpty() { return imgBytes.length == 0; }
                                @Override public long getSize() { return imgBytes.length; }
                                @Override public byte[] getBytes() { return imgBytes; }
                                @Override public java.io.InputStream getInputStream() { return new java.io.ByteArrayInputStream(imgBytes); }
                                @Override public void transferTo(java.io.File dest) throws java.io.IOException { java.nio.file.Files.write(dest.toPath(), imgBytes); }
                            };
                            
                            String prompt = "Extract all text, math equations, and Physics formulas from this page EXACTLY as they appear. "
                                    + "Use standard LaTeX blocks ($$ and $) for math equations. "
                                    + "If there are diagrams, graphs, or visual stimulus (উদ্দীপক) used for questions, describe them briefly so they can be recreated or understood, and prepend them with [DIAGRAM_DESCRIPTION]. "
                                    + "Do NOT hallucinate or provide extra answers. Return ONLY the extracted markdown content.";
                            
                            pageText = aiQuestionService.generateRawCompletion(prompt, mockFile);
                            usedVision = true;
                        } catch (Exception e) {
                            log.error("Vision OCR failed for page {}. Falling back to standard text extraction.", pageNum, e);
                        }
                    }

                    if (pageText == null || pageText.isBlank()) {
                        stripper.setStartPage(pageNum);
                        stripper.setEndPage(pageNum);
                        pageText = stripper.getText(pdf);
                    }
                    
                    String pageImages = extractNativeImagesFromPage(pdf.getPage(pageNum - 1), document, pageNum);
                    
                    if (pageText != null && !pageText.isBlank()) {
                        List<String> pageChunks = chunkText(pageText.trim(), 2500);
                        
                        for (String textChunk : pageChunks) {
                            CurriculumDocumentChunk chunk = new CurriculumDocumentChunk();
                            chunk.setDocument(document);
                            chunk.setChunkText(textChunk);
                            chunk.setChunkIndex(globalChunkIndex++);
                            chunk.setTokenCount(textChunk.length() / 4);
                            chunk.setPageNumber(pageNum);
                            chunk.setImageUrl(pageImages);
                            chunk.setIsVisionExtracted(usedVision);
                            entities.add(chunk);
                        }
                    }
                    
                    // Save and update progress every 2 pages to be extremely responsive
                    if (pageNum % 2 == 0 || pageNum == totalPages) {
                        if (!entities.isEmpty()) {
                            // 1. Save chunks to MySQL Database
                            List<CurriculumDocumentChunk> savedEntities = chunkRepository.saveAll(entities);
                            
                            // 2. Index chunks into Vector Database
                            for (CurriculumDocumentChunk chunkEntity : savedEntities) {
                                Map<String, Object> metadata = new HashMap<>();
                                metadata.put("docId", document.getId().toString());
                                metadata.put("subjectName", document.getSubjectName() != null ? document.getSubjectName() : "Unknown");
                                metadata.put("className", document.getClassName() != null ? document.getClassName() : "Unknown");
                                metadata.put("pageNum", chunkEntity.getPageNumber());
                                if (chunkEntity.getImageUrl() != null && !chunkEntity.getImageUrl().isEmpty()) {
                                    metadata.put("hasImage", true);
                                }
                                
                                try {
                                    vectorDatabaseService.upsertChunk(chunkEntity.getId().toString(), chunkEntity.getChunkText(), metadata);    
                                } catch (Exception e) {
                                    log.error("Pinecone Upsert failed for chunk ID: {}", chunkEntity.getId(), e);
                                }
                            }
                            
                            entities.clear();
                        }
                        
                        document.setProcessedChunks(pageNum);
                        // Save to trigger progress update in UI
                        document = documentRepository.save(document);
                        
                        // Give garbage collector a tiny breath on large PDFs
                        if (pageNum % 10 == 0) System.gc();
                    }
                }
                
                document.setProcessingStatus(CurriculumDocument.ProcessingStatus.COMPLETED);
                document.setProcessedChunks(totalPages);
                document = documentRepository.save(document);
                log.info("Finished indexing document {} ({} pages)", document.getTitle(), totalPages);
            }
            
        } catch (Throwable e) {
            log.error("CRITICAL: Failed to process chunks for document: " + document.getId(), e);
            document.setProcessingStatus(CurriculumDocument.ProcessingStatus.FAILED);
            document.setErrorMessage(e.getMessage() != null ? e.getMessage() : "System crashed (Out Of Memory or Fatal Error)");
            document = documentRepository.save(document);
        } finally {
            if (tempFile != null && tempFile.exists()) {
                tempFile.delete();
            }
        }
    }

    private String extractTextFromPdf(MultipartFile file, int startPage, int endPage) throws Exception {
        try (PDDocument pdf = org.apache.pdfbox.Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(startPage);
            stripper.setEndPage(Math.min(endPage, pdf.getNumberOfPages()));
            
            String text = stripper.getText(pdf);
            return text != null ? text.trim() : "";
        } catch (Exception e) {
            log.error("PDF Extraction error: ", e);
            throw new Exception("Could not read PDF text: " + e.getMessage());
        }
    }

    private List<String> chunkText(String text, int maxChunkSize) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) return chunks;
        
        // Split by paragraphs to avoid cutting in the middle of sentences if possible
        String[] paragraphs = text.split("\\n\\s*\\n");
        StringBuilder currentChunk = new StringBuilder();
        
        for (String p : paragraphs) {
            if (currentChunk.length() + p.length() > maxChunkSize && currentChunk.length() > 0) {
                chunks.add(currentChunk.toString().trim());
                currentChunk.setLength(0);
            }
            currentChunk.append(p).append("\n\n");
        }
        
        if (currentChunk.length() > 0) {
            chunks.add(currentChunk.toString().trim());
        }
        return chunks;
    }

    private String cleanResponse(String raw) {
        if (raw == null) return "";
        if (raw.startsWith("```json")) raw = raw.replaceFirst("```json", "");
        if (raw.startsWith("```")) raw = raw.replaceFirst("```", "");
        if (raw.endsWith("```")) raw = raw.substring(0, raw.length() - 3);
        return raw.trim();
    }

    private String extractNativeImagesFromPage(org.apache.pdfbox.pdmodel.PDPage page, CurriculumDocument document, int pageNum) {
        List<String> imageUrls = new ArrayList<>();
        org.apache.pdfbox.pdmodel.PDResources resources = page.getResources();
        if (resources == null) return null;
        try {
            for (org.apache.pdfbox.cos.COSName name : resources.getXObjectNames()) {
                org.apache.pdfbox.pdmodel.graphics.PDXObject xObject = resources.getXObject(name);
                if (xObject instanceof org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject imgObject) {
                    java.awt.image.BufferedImage img = imgObject.getImage();
                    
                    // Ignore tiny icons, watermarks or borders (< 100x100)
                    if (img.getWidth() > 100 && img.getHeight() > 100) {
                        java.io.ByteArrayOutputStream os = new java.io.ByteArrayOutputStream();
                        String format = imgObject.getSuffix() != null ? imgObject.getSuffix() : "png";
                        if (format.equalsIgnoreCase("jpx") || format.equalsIgnoreCase("jp2")) format = "jpg";
                        
                        javax.imageio.ImageIO.write(img, format, os);
                        final byte[] imgBytes = os.toByteArray();
                        final String finalFormat = format;
                        
                        org.springframework.web.multipart.MultipartFile mockFile = new org.springframework.web.multipart.MultipartFile() {
                            @Override public String getName() { return "image." + finalFormat; }
                            @Override public String getOriginalFilename() { return "image." + finalFormat; }
                            @Override public String getContentType() { return "image/" + finalFormat; }
                            @Override public boolean isEmpty() { return imgBytes.length == 0; }
                            @Override public long getSize() { return imgBytes.length; }
                            @Override public byte[] getBytes() { return imgBytes; }
                            @Override public java.io.InputStream getInputStream() { return new java.io.ByteArrayInputStream(imgBytes); }
                            @Override public void transferTo(java.io.File dest) throws java.io.IOException { java.nio.file.Files.write(dest.toPath(), imgBytes); }
                        };
                        
                        String subFolder = "curriculum/images/doc_" + document.getId() + "/p" + pageNum;
                        String imgUrl = storageService.uploadFile(mockFile, document.getTenantId(), subFolder);
                        if (imgUrl != null) imageUrls.add(imgUrl);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract native images on page {}", pageNum, e);
        }
        return imageUrls.isEmpty() ? null : String.join(",", imageUrls);
    }

    /**
     * Context-aware API that passes the latest DB chunks to Gemini
     */
    public String generateRAGChatResponse(String userQuestion) throws Exception {
        log.info("Generating RAG chat response for: {}", userQuestion);
        
        // 1. Fetch chunks from local knowledge base (RAG text)
        // Taking latest 200 chunks, giving roughly 500,000 characters context window (approx 125,000 tokens)
        // Gemini 2.5 Flash handles up to 1M tokens natively!
        List<CurriculumDocumentChunk> chunks = chunkRepository.findTop200ByDocumentIsActiveTrueOrderByIdDesc();
        
        if (chunks.isEmpty()) {
            return "দুঃখিত, বর্তমানে কোনো কারিকুলাম বা পিডিএফ ডকুমেন্ট ডেটাবেসে মজুত নেই। দয়া করে প্রথমে কিছু ডকুমেন্ট আপলোড করুন, তারপর আমি সেগুলো অ্যানালাইসিস করে আপনার প্রশ্নের উত্তর দিতে পারবো।";
        }
        
        // 2. Build massive context string
        StringBuilder contextText = new StringBuilder();
        int chunkCount = 0;
        for (CurriculumDocumentChunk c : chunks) {
            if (c.getDocument() == null) continue;
            contextText.append("--- Document Source: [").append(c.getDocument().getTitle())
                       .append(" | Class: ").append(c.getDocument().getClassName() != null ? c.getDocument().getClassName() : "Unknown")
                       .append("] ---\n");
            contextText.append(c.getChunkText()).append("\n");
            if (c.getImageUrl() != null && !c.getImageUrl().isEmpty()) {
                contextText.append("\n--- Attached Extracted Diagram / Image URLs ---\n");
                for (String url : c.getImageUrl().split(",")) {
                    contextText.append("![Diagram](").append(url).append(")\n");
                }
            }
            contextText.append("\n\n");
            chunkCount++;
        }
        log.debug("Built context with {} chunks...", chunkCount);
        
        // 3. Build highly specific prompt
        String prompt = "You are QuestionShaper's Curriculum Intelligence Assistant. You are an expert at analyzing educational syllabus and mark distributions for the Bangladesh NCTB system. \n\n"
                      + "Answer the User's question using ONLY the following context extracted from uploaded PDFs. Answer in pure Bengali language (Bangla) unless English is explicitly requested. Format your output with clear bullet points and bold text where appropriate to make it readable.\n\n"
                      + "CONTEXT DOCUMENT KNOWLEDGE BASE:\n"
                      + contextText.toString() + "\n\n"
                      + "USER QUESTION: " + userQuestion + "\n\n"
                      + "Remember: Never hallucinate! If the answer is not in the context, politely state that you could not find the information in the uploaded documents.";

        // 4. Send to Gemini
        return aiQuestionService.generateRawCompletion(prompt, null);
    }

    /**
     * Schema generation — uses AI to analyze document context and produce a question structure JSON.
     * Called by CurriculumController's /generate-schema endpoint.
     */
    public String generateSchemaCompletion(String prompt) throws Exception {
        return aiQuestionService.generateRawCompletion(prompt, null);
    }
}
