package com.testshaper.controller;

import com.testshaper.entity.CurriculumDocument;
import com.testshaper.repository.CurriculumDocumentRepository;
import com.testshaper.service.DynamicStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/v1/curriculum")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class CurriculumController {

    private final CurriculumDocumentRepository repository;
    private final com.testshaper.repository.CurriculumDocumentChunkRepository chunkRepository;
    private final DynamicStorageService storageService;
    private final com.testshaper.service.CurriculumAnalyzerService analyzerService;

    /** List all curriculum documents with filters */
    @GetMapping
    public ResponseEntity<List<CurriculumDocument>> list(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String docType,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String subject) {
        
        CurriculumDocument.DocType typeEnum = null;
        if (docType != null && !docType.isBlank()) {
            try { typeEnum = CurriculumDocument.DocType.valueOf(docType); } 
            catch (Exception ignored) {}
        }
        
        List<CurriculumDocument> docs = repository.search(year, typeEnum, level, className, subject);
        return ResponseEntity.ok(docs);
    }

    @GetMapping("/years")
    public ResponseEntity<List<Integer>> getYears() {
        return ResponseEntity.ok(repository.findDistinctYears());
    }

    /** AI Preview: Read PDF and Extract Rules JSON */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeDocumentPreview(@RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> preview = analyzerService.analyzeDocumentPreview(file);
            return ResponseEntity.ok(preview);
        } catch (Exception e) {
            log.error("AI Analysis Failed", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /** AI Chatbot: Query the internal RAG database */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chatWithCurriculum(
            @RequestBody Map<String, String> payload) {
        try {
            String question = payload.get("question");
            if (question == null || question.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Question is required"));
            }
            String answer = analyzerService.generateRAGChatResponse(question);
            return ResponseEntity.ok(Map.of("answer", answer));
        } catch (Exception e) {
            log.error("RAG Chat Failed", e);
            return ResponseEntity.status(500).body(Map.of("error", "AI Server Error: " + e.getMessage()));
        }
    }

    /** Upload a new curriculum document */
    @PostMapping("/upload")
    public ResponseEntity<CurriculumDocument> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("academicYear") Integer academicYear,
            @RequestParam("docType") String docType,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "educationLevel", required = false) String educationLevel,
            @RequestParam(value = "subjectName", required = false) String subjectName,
            @RequestParam(value = "className", required = false) String className,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam(value = "visionEnabled", required = false, defaultValue = "false") boolean visionEnabled,
            @org.springframework.security.core.annotation.AuthenticationPrincipal
            org.springframework.security.core.userdetails.UserDetails userDetails) {

        try {
            // Read bytes BEFORE uploading to storage, as Cloudflare R2/S3 upload consumes the stream
            byte[] fileBytes = file.getBytes();
            
            String filePath = storageService.uploadFile(file, null, "curriculum/" + academicYear);

            CurriculumDocument doc = new CurriculumDocument();
            doc.setTitle(title);
            doc.setVisionEnabled(visionEnabled);
            doc.setDescription(description);
            doc.setAcademicYear(academicYear);
            doc.setEducationLevel(educationLevel);
            doc.setSubjectName(subjectName);
            doc.setClassName(className);
            doc.setDocType(CurriculumDocument.DocType.valueOf(docType));
            doc.setFilePath(filePath);
            doc.setFileName(file.getOriginalFilename());
            doc.setFileSize(file.getSize());
            doc.setMimeType(file.getContentType());
            doc.setUploadedBy(userDetails.getUsername());
            doc.setTags(tags);
            doc.setNotes(notes);
            doc.setIsActive(true);

            CurriculumDocument saved = repository.save(doc);
            log.info("Curriculum document uploaded: {} ({})", title, academicYear);

            // Trigger AI Chunking for RAG asynchronously
            analyzerService.processAndSaveChunks(saved.getId(), fileBytes, false);

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Failed to upload curriculum document", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /** Update document metadata */
    @PutMapping("/{id}")
    public ResponseEntity<CurriculumDocument> update(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> updates) {

        return repository.findById(id).map(doc -> {
            if (updates.containsKey("title")) doc.setTitle((String) updates.get("title"));
            if (updates.containsKey("description")) doc.setDescription((String) updates.get("description"));
            if (updates.containsKey("academicYear")) doc.setAcademicYear((Integer) updates.get("academicYear"));
            if (updates.containsKey("educationLevel")) doc.setEducationLevel((String) updates.get("educationLevel"));
            if (updates.containsKey("subjectName")) doc.setSubjectName((String) updates.get("subjectName"));
            if (updates.containsKey("className")) doc.setClassName((String) updates.get("className"));
            if (updates.containsKey("tags")) doc.setTags((String) updates.get("tags"));
            if (updates.containsKey("notes")) doc.setNotes((String) updates.get("notes"));
            if (updates.containsKey("isActive")) doc.setIsActive((Boolean) updates.get("isActive"));
            if (updates.containsKey("docType")) {
                String docTypeStr = (String) updates.get("docType");
                if (docTypeStr != null && !docTypeStr.trim().isEmpty()) {
                    try {
                        doc.setDocType(CurriculumDocument.DocType.valueOf(docTypeStr));
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid docType provided: {}", docTypeStr);
                    }
                }
            }
            return ResponseEntity.ok(repository.save(doc));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Delete (soft) a document */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        return repository.findById(id).map(doc -> {
            doc.setDeleted(true);
            repository.save(doc);
            log.info("Curriculum document deleted: {}", doc.getTitle());
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    /** View chunks (Markdown + Cropped Diagram URLs) of a document */
    @GetMapping("/{id}/chunks")
    public ResponseEntity<List<com.testshaper.entity.CurriculumDocumentChunk>> getDocumentChunks(@PathVariable UUID id) {
        return ResponseEntity.ok(chunkRepository.findByDocumentIdOrderByChunkIndexAsc(id));
    }

    /** Regenerate AI Chunks for existing document */
    @PostMapping("/{id}/regenerate-chunks")
    public ResponseEntity<Map<String, String>> regenerateChunks(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "true") boolean force) {
        return repository.findById(id).map(doc -> {
            try {
                byte[] fileBytes = storageService.loadFileBytes(doc.getFilePath());
                analyzerService.processAndSaveChunks(doc.getId(), fileBytes, force);
                return ResponseEntity.ok(Map.of("message", "Regeneration started successfully."));
            } catch (Exception e) {
                log.error("Failed to regenerate chunks for document {}", id, e);
                return ResponseEntity.status(500).body(Map.of("error", "Could not load file or start processing."));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Get stats summary */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<CurriculumDocument> all = repository.findByIsActiveTrueOrderByAcademicYearDescCreatedAtDesc();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalDocuments", all.size());
        stats.put("years", repository.findDistinctYears());
        stats.put("totalSize", all.stream().mapToLong(d -> d.getFileSize() != null ? d.getFileSize() : 0).sum());

        // Count by type
        Map<String, Long> byType = new LinkedHashMap<>();
        for (CurriculumDocument.DocType t : CurriculumDocument.DocType.values()) {
            long count = all.stream().filter(d -> d.getDocType() == t).count();
            if (count > 0) byType.put(t.name(), count);
        }
        stats.put("byType", byType);
        return ResponseEntity.ok(stats);
    }

    /** AI Generate Schema: Read document chunks and generate a question structure JSON schema */
    @PostMapping("/generate-schema")
    public ResponseEntity<Map<String, Object>> generateSchema(@RequestBody Map<String, Object> payload) {
        try {
            @SuppressWarnings("unchecked")
            List<String> docIds = (List<String>) payload.getOrDefault("documentIds", List.of());
            String subjectName = (String) payload.getOrDefault("subjectName", "Unknown");
            String className = (String) payload.getOrDefault("className", "Unknown");

            if (docIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No document IDs provided"));
            }

            // Gather chunks from all specified documents (top-priority first)
            StringBuilder contextBuilder = new StringBuilder();
            int totalChunks = 0;
            for (String idStr : docIds) {
                try {
                    UUID docId = UUID.fromString(idStr);
                    List<com.testshaper.entity.CurriculumDocumentChunk> chunks = 
                            chunkRepository.findByDocumentIdOrderByChunkIndexAsc(docId);
                    
                    if (!chunks.isEmpty()) {
                        Optional<CurriculumDocument> docOpt = repository.findById(docId);
                        String docTitle = docOpt.map(CurriculumDocument::getTitle).orElse("Unknown");
                        String docType = docOpt.map(d -> d.getDocType().name()).orElse("OTHER");

                        contextBuilder.append("\n=== SOURCE: ").append(docTitle)
                                .append(" [Type: ").append(docType).append("] ===\n");
                        
                        // Take max 30 chunks per document to stay within context limits
                        int limit = Math.min(chunks.size(), 30);
                        for (int i = 0; i < limit; i++) {
                            contextBuilder.append(chunks.get(i).getChunkText()).append("\n\n");
                            totalChunks++;
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to load chunks for doc {}: {}", idStr, e.getMessage());
                }
            }

            if (totalChunks == 0) {
                return ResponseEntity.ok(Map.of(
                    "error", "NO_CHUNKS",
                    "message", "Selected documents have no AI-processed chunks yet. Please process documents first."
                ));
            }

            // Build AI prompt — learn question FORMAT from pre-processed chunks (NOT re-analyzing PDF)
            String prompt = """
                আপনি QuestionShaper-এর Question Format Analyzer। নিচে কারিকুলাম ইন্টেলিজেন্স ইঞ্জিনে আগে থেকেই প্রসেস ও ভেক্টরাইজ করা ডকুমেন্ট থেকে এক্সট্রাক্ট করা কন্টেন্ট দেওয়া হয়েছে।

                **আপনার কাজ:** ফাইল আবার analyse করবেন না। শুধুমাত্র এই কন্টেন্ট থেকে প্রশ্নের ধরন, প্যাটার্ন ও ফরমেট শিখুন এবং একটি JSON OBJECT তৈরি করুন যেটা QuestionShaper স্বয়ংক্রিয়ভাবে প্রশ্ন স্ক্র্যাপ, তৈরি এবং Exam Editor কনফিগার করতে ব্যবহার করবে।

                **বিষয়:** %s
                **শ্রেণী:** %s

                আপনাকে অবশ্যই নিচের JSON ফরম্যাটে উত্তর দিতে হবে:
                {
                  "subject": "%s",
                  "generation_rules": {
                    "guidelines": "[অত্যন্ত গুরুত্বপূর্ণ: ইমেজের লিঙ্ক (যেমন: ![Diagram](url)) পেলে তা অবশ্যই questionText বা stimulus-এর ভেতরে রাখতে হবে। ইমেজ আলাদা করে ফাঁকা প্রশ্ন বানানো সম্পূর্ণ নিষেধ।]"
                  },
                  "scraping_rules": [
                    {
                      "questionType": "MULTIPLE_CHOICE | SHORT_ANSWER | CREATIVE | ESSAY | TRUE_FALSE | FILL_BLANK",
                      "questionText": "ডকুমেন্ট থেকে একটি বাস্তব উদাহরণ প্রশ্ন (চিত্র থাকলে ![Diagram](url) এখানেই বসবে)",
                      "options": ["MCQ-এর জন্য অপশন অ্যারে, অন্যদের জন্য ফাঁকা []"],
                      "answer": "সঠিক উত্তর",
                      "marks": "বরাদ্দকৃত নম্বর (number)",
                      "totalQuestions": "এই ধরনের মোট প্রশ্ন সংখ্যা (number)",
                      "instructions": "এই প্রশ্নের ধরনের বিশেষ নির্দেশনা",
                      "className": "%s",
                      "subjectName": "%s",
                      "bloomLevel": "REMEMBERING | UNDERSTANDING | APPLYING | ANALYZING | EVALUATING | CREATING",
                      "difficulty": "EASY | MEDIUM | HARD",
                      "sectionName": "সেকশনের নাম (যদি থাকে)",
                      "questionPattern": "প্রশ্নের প্যাটার্ন বর্ণনা"
                    }
                  ],
                  "editor_config": {
                    "allowed_blocks": ["MCQ", "CQ", "SHORT", "EQUATION", "DIAGRAM" (ডকুমেন্টের উপর ভিত্তি করে নির্ধারণ করুন)],
                    "toolbar_features": ["math_formula", "draw_canvas", "table" (প্রয়োজন অনুযায়ী)],
                    "validation_rules": {
                      "CQ_TOTAL_MARKS": 10,
                      "MCQ_TOTAL_MARKS": 1,
                      "CQ_MAX_SUBPARTS": 4
                    }
                  },
                  "generation_blueprint": {
                    "mandatory_sections": [
                      { "name": "বহুনির্বাচনি প্রশ্ন (MCQ)", "type": "MCQ", "target_ratio": "30%%" },
                      { "name": "সৃজনশীল প্রশ্ন (CQ)", "type": "CQ", "target_ratio": "70%%" }
                    ],
                    "bloom_target": {
                      "KNOWLEDGE": 30,
                      "COMPREHENSION": 30,
                      "APPLICATION": 20,
                      "HIGHER_ORDER": 20
                    },
                    "custom_prompts": {
                      "generation": "এই বিষয়ের জন্য এআই-কে প্রশ্ন জেনারেট করার বিশেষ নির্দেশিকা।"
                    }
                  }
                }

                শুধুমাত্র বৈধ JSON OBJECT রিটার্ন করুন। কোনো markdown বা ব্যাখ্যা দিবেন না।

                PRE-PROCESSED DOCUMENT CHUNKS:
                %s
                """.formatted(subjectName, className, subjectName, className, subjectName, contextBuilder.toString());

            String aiResponse = analyzerService.generateSchemaCompletion(prompt);

            // Clean and validate JSON
            String cleanedJson = aiResponse;
            if (cleanedJson.startsWith("```json")) cleanedJson = cleanedJson.replaceFirst("```json", "");
            if (cleanedJson.startsWith("```")) cleanedJson = cleanedJson.replaceFirst("```", "");
            if (cleanedJson.endsWith("```")) cleanedJson = cleanedJson.substring(0, cleanedJson.length() - 3);
            cleanedJson = cleanedJson.trim();

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("schema", cleanedJson);
            result.put("chunksAnalyzed", totalChunks);
            result.put("documentsUsed", docIds.size());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to generate schema", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /** Trigger background sync of all existing chunks to Pinecone */
    @PostMapping("/sync-pinecone")
    public ResponseEntity<Map<String, String>> syncPinecone() {
        try {
            analyzerService.syncAllExistingChunksToPinecone();
            return ResponseEntity.ok(Map.of("message", "Pinecone background sync started successfully."));
        } catch (Exception e) {
            log.error("Failed to trigger Pinecone sync", e);
            return ResponseEntity.status(500).body(Map.of("error", "Could not start Pinecone sync: " + e.getMessage()));
        }
    }

    /**
     * NEW: Generate schema directly from pasted sample question text (no PDF needed).
     * Also accepts an optional extra userPrompt to guide the AI.
     */
    @PostMapping("/generate-schema-from-text")
    public ResponseEntity<Map<String, Object>> generateSchemaFromText(@RequestBody Map<String, Object> payload) {
        try {
            String sampleText   = (String) payload.getOrDefault("sampleText", "");
            String subjectName  = (String) payload.getOrDefault("subjectName", "Unknown");
            String className    = (String) payload.getOrDefault("className", "Unknown");
            String userPrompt   = (String) payload.getOrDefault("userPrompt", "");

            if (sampleText == null || sampleText.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "sampleText is required"));
            }

            String extraInstruction = userPrompt.isBlank() ? ""
                    : "\n\n**অতিরিক্ত নির্দেশনা (Admin থেকে):** " + userPrompt;

            String prompt = """
                আপনি QuestionShaper-এর Question Format Analyzer।

                **আপনার কাজ:** নিচের প্রদত্ত sample প্রশ্নের টেক্সট বিশ্লেষণ করুন এবং QuestionShaper-এর জন্য একটি JSON OBJECT তৈরি করুন যা প্রশ্ন স্ক্র্যাপিং, তৈরি এবং Exam Editor কনফিগারেশনে ব্যবহৃত হবে।

                **বিষয়:** %s
                **শ্রেণী:** %s
                %s

                আপনাকে অবশ্যই নিচের JSON ফরম্যাটে উত্তর দিতে হবে:
                {
                  "subject": "%s",
                  "generation_rules": {
                    "guidelines": "[অত্যন্ত গুরুত্বপূর্ণ: ইমেজের লিঙ্ক (যেমন: ![Diagram](url)) পেলে তা অবশ্যই questionText বা stimulus-এর ভেতরে রাখতে হবে। ইমেজ আলাদা করে ফাঁকা প্রশ্ন বানানো সম্পূর্ণ নিষেধ।]"
                  },
                  "scraping_rules": [
                    {
                      "questionType": "MULTIPLE_CHOICE | SHORT_ANSWER | CREATIVE | ESSAY | TRUE_FALSE | FILL_BLANK",
                      "questionText": "sample থেকে একটি বাস্তব উদাহরণ প্রশ্ন (চিত্র থাকলে ![Diagram](url) এখানেই বসবে)",
                      "options": ["MCQ-এর জন্য অপশন অ্যারে, অন্যদের জন্য ফাঁকা []"],
                      "answer": "সঠিক উত্তর",
                      "marks": "বরাদ্দকৃত নম্বর (number)",
                      "totalQuestions": "এই ধরনের মোট প্রশ্ন সংখ্যা (number)",
                      "instructions": "এই প্রশ্নের ধরনের বিশেষ নির্দেশনা",
                      "className": "%s",
                      "subjectName": "%s",
                      "bloomLevel": "REMEMBERING | UNDERSTANDING | APPLYING | ANALYZING | EVALUATING | CREATING",
                      "difficulty": "EASY | MEDIUM | HARD",
                      "sectionName": "সেকশনের নাম (যদি থাকে)",
                      "questionPattern": "প্রশ্নের প্যাটার্ন বর্ণনা"
                    }
                  ],
                  "editor_config": {
                    "allowed_blocks": ["MCQ", "CQ", "SHORT", "EQUATION", "DIAGRAM"],
                    "toolbar_features": ["math_formula", "draw_canvas", "table"],
                    "validation_rules": {
                      "CQ_TOTAL_MARKS": 10,
                      "MCQ_TOTAL_MARKS": 1,
                      "CQ_MAX_SUBPARTS": 4
                    }
                  },
                  "generation_blueprint": {
                    "mandatory_sections": [
                      { "name": "বহুনির্বাচনি প্রশ্ন (MCQ)", "type": "MCQ", "target_ratio": "30%%" },
                      { "name": "সৃজনশীল প্রশ্ন (CQ)", "type": "CQ", "target_ratio": "70%%" }
                    ],
                    "bloom_target": {
                      "KNOWLEDGE": 30,
                      "COMPREHENSION": 30,
                      "APPLICATION": 20,
                      "HIGHER_ORDER": 20
                    },
                    "custom_prompts": {
                      "generation": "এই বিষয়ের জন্য এআই-কে প্রশ্ন জেনারেট করার বিশেষ নির্দেশিকা।"
                    }
                  }
                }

                শুধুমাত্র বৈধ JSON OBJECT রিটার্ন করুন। কোনো markdown বা বাড়তি text দিবেন না।

                SAMPLE QUESTIONS TEXT:
                %s
                """.formatted(subjectName, className, extraInstruction, subjectName, className, subjectName, sampleText);

            String aiResponse = analyzerService.generateSchemaCompletion(prompt);

            // Clean JSON
            String cleanedJson = aiResponse;
            if (cleanedJson.startsWith("```json")) cleanedJson = cleanedJson.replaceFirst("```json", "");
            if (cleanedJson.startsWith("```"))     cleanedJson = cleanedJson.replaceFirst("```", "");
            if (cleanedJson.endsWith("```"))       cleanedJson = cleanedJson.substring(0, cleanedJson.length() - 3);
            cleanedJson = cleanedJson.trim();

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("schema", cleanedJson);
            result.put("source", "text-input");
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to generate schema from text", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * NEW: Upload a curriculum document from plain TEXT (no PDF file needed).
     * The text is stored as a single "chunk" so it participates in RAG and schema generation.
     */
    @PostMapping("/upload-text")
    public ResponseEntity<CurriculumDocument> uploadFromText(
            @RequestBody Map<String, Object> payload,
            @org.springframework.security.core.annotation.AuthenticationPrincipal
            org.springframework.security.core.userdetails.UserDetails userDetails) {
        try {
            String title         = (String) payload.getOrDefault("title", "Untitled");
            String content       = (String) payload.getOrDefault("content", "");
            String docType       = (String) payload.getOrDefault("docType", "OTHER");
            String educationLevel= (String) payload.getOrDefault("educationLevel", "");
            String subjectName   = (String) payload.getOrDefault("subjectName", "");
            String className     = (String) payload.getOrDefault("className", "");
            String tags          = (String) payload.getOrDefault("tags", "");
            String notes         = (String) payload.getOrDefault("notes", "");
            Integer academicYear = payload.containsKey("academicYear")
                    ? ((Number) payload.get("academicYear")).intValue() : java.time.Year.now().getValue();

            if (content.isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            CurriculumDocument doc = new CurriculumDocument();
            doc.setTitle(title);
            doc.setDescription("Text-based document (no file)");
            doc.setAcademicYear(academicYear);
            doc.setEducationLevel(educationLevel);
            doc.setSubjectName(subjectName);
            doc.setClassName(className);
            doc.setDocType(CurriculumDocument.DocType.valueOf(docType));
            doc.setFilePath("text://inline");        // Marker: no actual file
            doc.setFileName(title + ".txt");
            doc.setFileSize((long) content.length());
            doc.setMimeType("text/plain");
            doc.setUploadedBy(userDetails != null ? userDetails.getUsername() : "system");
            doc.setTags(tags);
            doc.setNotes(notes);
            doc.setIsActive(true);
            CurriculumDocument saved = repository.save(doc);

            // Directly save a single chunk so it's immediately available for schema generation
            com.testshaper.entity.CurriculumDocumentChunk chunk = new com.testshaper.entity.CurriculumDocumentChunk();
            chunk.setDocument(saved);
            chunk.setChunkIndex(0);
            chunk.setChunkText(content);
            chunk.setPageNumber(1);
            chunkRepository.save(chunk);

            // Mark as processed
            saved.setProcessingStatus(CurriculumDocument.ProcessingStatus.COMPLETED);
            saved.setTotalChunks(1);
            saved.setProcessedChunks(1);
            repository.save(saved);

            log.info("Text-based curriculum document created: {} ({})", title, academicYear);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Failed to create text curriculum document", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
