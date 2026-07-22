package com.testshaper.controller;

import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import com.testshaper.entity.QuestionSource;
import com.testshaper.entity.User;
import com.testshaper.repository.QuestionSourceRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.DynamicStorageService;
import com.testshaper.service.AcademicAutoLinkService;
import com.testshaper.service.QuestionImportService;
import com.testshaper.service.QuestionService;
import com.testshaper.dto.QuestionSearchParams;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;
    private final QuestionImportService importService;
    private final DynamicStorageService dynamicStorageService;
    private final UserRepository userRepository;
    private final QuestionSourceRepository questionSourceRepository;
    private final AcademicAutoLinkService autoLinkService;
    private final com.testshaper.repository.CurriculumDocumentChunkRepository chunkRepository;
    private final com.testshaper.repository.KnowledgePageRepository knowledgePageRepository;

    @PostMapping("/import/excel")
    public ResponseEntity<Map<String, Object>> importFromExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type) {
        return ResponseEntity.ok(importService.importQuestions(file, type));
    }

    @PostMapping("/mcq/create")
    public ResponseEntity<Question> createMCQ(@RequestBody CreateMCQRequest request) {
        // Auto-link academic structure from metadata if present
        if (request.getMetadata() != null && !request.getMetadata().isEmpty()) {
            autoLinkService.autoLink(request.getQuestion(), request.getMetadata());
        }
        return ResponseEntity.ok(questionService.createMCQ(request.getQuestion(), request.getOptions()));
    }

    @PostMapping("/mcq/bulk/create")
    public ResponseEntity<Map<String, Object>> createMCQBulk(@RequestBody CreateMCQBulkRequest request) {
        if (request.getQuestions() == null || request.getOptionsList() == null ||
            request.getQuestions().size() != request.getOptionsList().size()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Questions and options list mismatch"));
        }

        boolean hasAcademicIds = request.getAcademicIds() != null && !request.getAcademicIds().isEmpty();
        boolean hasMetadata    = request.getMetadata()    != null && !request.getMetadata().isEmpty();

        if (!request.getQuestions().isEmpty()) {
            Question referenceQ = new Question();

            if (hasAcademicIds) {
                // Fast path: use direct DB IDs from hierarchy picker
                autoLinkService.autoLinkByIds(referenceQ, request.getAcademicIds());
            }

            // Hybrid: also apply name-based metadata for fields not covered by IDs
            // e.g. classSubjectId was provided but chapter/topic are AI-detected names
            if (hasMetadata) {
                Map<String, String> remainingMeta = new java.util.HashMap<>(request.getMetadata());
                // Skip className+subject if classSubject was already linked by ID
                if (hasAcademicIds && request.getAcademicIds().containsKey("classSubjectId")) {
                    remainingMeta.remove("className");
                    remainingMeta.remove("subject");
                }
                // Only run name-based linking if there's something left to link
                if (!remainingMeta.isEmpty()) {
                    // Pass the already-linked classSubject so chapter/topic can be created under it
                    if (referenceQ.getClassSubject() != null) {
                        remainingMeta.put("_classSubjectId", referenceQ.getClassSubject().getId().toString());
                    }
                    autoLinkService.autoLinkPartial(referenceQ, remainingMeta);
                }
            }

            // Copy resolved FK references to every question
            for (Question q : request.getQuestions()) {
                if (referenceQ.getClassSubject() != null && q.getClassSubject() == null) {
                    q.setClassSubject(referenceQ.getClassSubject());
                }
                if (referenceQ.getChapter() != null && q.getChapter() == null) {
                    q.setChapter(referenceQ.getChapter());
                }
                if (referenceQ.getTopic() != null && q.getTopic() == null) {
                    q.setTopic(referenceQ.getTopic());
                }

                // Handle manual overriding names per individual scraped question
                if ((q.getTopicName() != null && !q.getTopicName().isBlank()) || 
                    (q.getChapterName() != null && !q.getChapterName().isBlank())) {
                    Map<String, String> localMeta = new java.util.HashMap<>();
                    if (q.getTopicName() != null) localMeta.put("topic", q.getTopicName());
                    if (q.getChapterName() != null) localMeta.put("chapter", q.getChapterName());
                    
                    // We must attempt to resolve under the known classSubject
                    if (q.getClassSubject() != null) {
                         localMeta.put("_classSubjectId", q.getClassSubject().getId().toString());
                    }
                    autoLinkService.autoLinkPartial(q, localMeta);
                }
            }
        }

        questionService.createMCQBulk(request.getQuestions(), request.getOptionsList());
        return ResponseEntity.ok(Map.of(
            "message", "Successfully created " + request.getQuestions().size() + " questions.",
            "count", request.getQuestions().size()
        ));
    }

    @PostMapping("/short/create")
    public ResponseEntity<Question> createShortQuestion(@RequestBody Question question) {
        return ResponseEntity.ok(questionService.createShortQuestion(question));
    }

    @PostMapping("/cq/create")
    public ResponseEntity<Question> createCQ(@RequestBody Question question) {
        return ResponseEntity.ok(questionService.createCQ(question));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Question> getQuestion(@PathVariable UUID id) {
        return ResponseEntity.ok(questionService.getQuestion(id));
    }

    @GetMapping("/{id}/source-context")
    public ResponseEntity<Map<String, Object>> getQuestionSourceContext(@PathVariable UUID id) {
        Question question = questionService.getQuestion(id);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("sourceReference", question.getSourceReference());
        
        if (question.getSourceReference() != null && question.getSourceReference().toLowerCase().startsWith("chunk_")) {
            try {
                String chunkIdStr = question.getSourceReference().substring(6);
                UUID chunkId = UUID.fromString(chunkIdStr);
                
                com.testshaper.entity.CurriculumDocumentChunk chunk = chunkRepository.findById(chunkId).orElse(null);
                if (chunk != null) {
                    Map<String, Object> chunkData = new java.util.HashMap<>();
                    chunkData.put("id", chunk.getId());
                    chunkData.put("chunkText", chunk.getChunkText());
                    chunkData.put("pageNumber", chunk.getPageNumber());
                    chunkData.put("imageUrl", chunk.getImageUrl());
                    chunkData.put("isVisionExtracted", chunk.getIsVisionExtracted());
                    
                    if (chunk.getSourceBook() != null) {
                        Map<String, Object> bookData = new java.util.HashMap<>();
                        bookData.put("id", chunk.getSourceBook().getId());
                        bookData.put("title", chunk.getSourceBook().getTitle());
                        bookData.put("bookType", chunk.getSourceBook().getBookType() != null ? chunk.getSourceBook().getBookType().name() : null);
                        bookData.put("coverImageUrl", chunk.getSourceBook().getCoverImageUrl());
                        chunkData.put("sourceBook", bookData);
                        
                        if (chunk.getPageNumber() != null) {
                            com.testshaper.entity.KnowledgePage kPage = knowledgePageRepository
                                    .findBySourceBookIdAndPageNumber(chunk.getSourceBook().getId(), chunk.getPageNumber())
                                    .orElse(null);
                            if (kPage != null) {
                                Map<String, Object> pageData = new java.util.HashMap<>();
                                pageData.put("id", kPage.getId());
                                pageData.put("pageNumber", kPage.getPageNumber());
                                pageData.put("imageUrl", kPage.getR2FilePath());
                                pageData.put("extractionStatus", kPage.getExtractionStatus() != null ? kPage.getExtractionStatus().name() : null);
                                chunkData.put("page", pageData);
                            }
                        }
                    }
                    
                    if (chunk.getSourceBookIndex() != null) {
                        Map<String, Object> indexData = new java.util.HashMap<>();
                        indexData.put("id", chunk.getSourceBookIndex().getId());
                        indexData.put("title", chunk.getSourceBookIndex().getIndexName());
                        chunkData.put("sourceBookIndex", indexData);
                    }
                    
                    result.put("chunk", chunkData);
                }
            } catch (Exception e) {
                // fallback
            }
        }
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<Question>> getQuestionsBatch(@RequestBody List<UUID> ids) {
        return ResponseEntity.ok(questionService.getQuestionsBatch(ids));
    }


    @PostMapping("/my-revisions")
    public ResponseEntity<Map<UUID, Question>> getMyPendingRevisions(@RequestBody List<UUID> originalQuestionIds, Authentication auth) {
        String email = auth.getName();
        List<Question> revisions = questionService.getMyPendingRevisions(originalQuestionIds, email);
        
        Map<UUID, Question> revisionMap = new java.util.HashMap<>();
        for (Question rev : revisions) {
            revisionMap.put(rev.getParentQuestionId(), rev);
        }
        return ResponseEntity.ok(revisionMap);
    }

    @GetMapping("/{id}/options")
    public ResponseEntity<List<QuestionOption>> getOptions(@PathVariable UUID id) {
        return ResponseEntity.ok(questionService.getOptions(id));
    }

    @GetMapping("/list")
    public ResponseEntity<List<Question>> getAllQuestions() {
        return ResponseEntity.ok(questionService.getAllQuestions());
    }

    @GetMapping("/list-paginated")
    public ResponseEntity<org.springframework.data.domain.Page<Question>> getAllQuestionsPaginated(
            @RequestParam java.util.Map<String, String> filters,
            @org.springframework.data.web.PageableDefault(size = 50, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) org.springframework.data.domain.Pageable pageable) {
        
        org.springframework.data.domain.Page<Question> questions = questionService.getAllQuestionsPaginated(filters, pageable);
        // Removed the stripping of options and explanations so the frontend N+1 problem is fixed
        // and inline answers/explanations work without extra fetches.
        
        return ResponseEntity.ok(questions);
    }

    @GetMapping("/list-ids")
    public ResponseEntity<List<UUID>> getAllQuestionIds(
            @RequestParam java.util.Map<String, String> filters) {
        return ResponseEntity.ok(questionService.getAllQuestionIds(filters));
    }

    @GetMapping("/source-tags")
    public ResponseEntity<Map<String, Object>> getSourceTags(@RequestParam(required = false) Map<String, String> filters) {
        if (filters == null) filters = new java.util.HashMap<>();
        return ResponseEntity.ok(questionService.getSourceTags(filters));
    }

    @GetMapping("/overview-stats")
    public ResponseEntity<Map<String, Object>> getOverviewStats(@RequestParam(required = false) Map<String, String> filters) {
        if (filters == null) filters = new java.util.HashMap<>();
        return ResponseEntity.ok(questionService.getOverviewStats(filters));
    }

    @GetMapping("/availability")
    public ResponseEntity<Map<String, Object>> getQuestionAvailability(
            @RequestParam UUID classSubjectId,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String sourceMode,
            @RequestParam(required = false) List<UUID> lectureIds,
            @RequestParam(required = false) List<String> boards,
            @RequestParam(required = false) List<Integer> years,
            @RequestParam(required = false) List<String> schools) {
        
        System.out.println(">>> getQuestionAvailability params: classSubjectId=" + classSubjectId 
                + ", language=" + language + ", sourceMode=" + sourceMode 
                + ", lectureIds=" + lectureIds + ", boards=" + boards 
                + ", years=" + years + ", schools=" + schools);
        
        QuestionSearchParams params = new QuestionSearchParams();
        params.setClassSubjectId(classSubjectId);
        params.setLanguage(language);
        params.setSourceMode(sourceMode != null ? sourceMode : "ALL");
        params.setLectureIds(lectureIds);
        params.setBoards(boards);
        params.setYears(years);
        params.setSchools(schools);

        return ResponseEntity.ok(questionService.getQuestionAvailability(params));
    }

    @PostMapping("/availability/bulk")
    public ResponseEntity<Map<UUID, Boolean>> getQuestionAvailabilityBulk(
            @RequestBody BulkAvailabilityRequest request) {
        return ResponseEntity.ok(questionService.getQuestionsAvailabilityBulk(
                request.getClassSubjectIds(), 
                request.getLanguage()
        ));
    }

    // --- Revision / Contribution System ---
    @PostMapping("/{id}/revision")
    public ResponseEntity<Map<String, Object>> submitRevision(
            @PathVariable UUID id,
            @RequestBody CreateMCQRequest request,
            Authentication authentication) {
        Question revision = questionService.submitRevision(
            id, 
            request.getQuestion(), 
            request.getOptions(), 
            authentication.getName(), 
            request.getQuestion().getVersionComment()
        );
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Revision submitted successfully for review.",
            "data", revision
        ));
    }

    @PostMapping("/{revisionId}/approve-revision")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> approveRevision(
            @PathVariable UUID revisionId,
            Authentication authentication) {
        Question mergedQuestion = questionService.approveRevision(revisionId, authentication.getName());
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Revision approved. Original question updated, XP awarded.",
            "data", mergedQuestion
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('QUESTION_BANK_REPOSITORY_ALL_QUESTIONS_DELETE', 'QUESTION_BANK_REPOSITORY_PENDING_DELETE', 'QUESTION_BANK_REPOSITORY_APPROVED_DELETE', 'QUESTION_BANK_REPOSITORY_REJECTED_DELETE')")
    public ResponseEntity<Void> deleteQuestion(@PathVariable UUID id) {
        questionService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk/delete")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('QUESTION_BANK_REPOSITORY_ALL_QUESTIONS_DELETE', 'QUESTION_BANK_REPOSITORY_PENDING_DELETE', 'QUESTION_BANK_REPOSITORY_APPROVED_DELETE', 'QUESTION_BANK_REPOSITORY_REJECTED_DELETE')")
    public ResponseEntity<Void> deleteQuestionsBulk(@RequestBody List<UUID> ids) {
        questionService.deleteQuestionsBulk(ids);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<Question> approveQuestion(@PathVariable UUID id) {
        // TODO: Get approver from SecurityContext
        String approverId = "ADMIN";
        return ResponseEntity.ok(questionService.approveQuestion(id, approverId));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<Question> rejectQuestion(@PathVariable UUID id) {
        return ResponseEntity.ok(questionService.rejectQuestion(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Question> updateQuestion(@PathVariable UUID id, @RequestBody UpdateQuestionRequest request) {
        return ResponseEntity.ok(questionService.updateQuestion(id, request.getQuestion(), request.getOptions()));
    }

    // ─── User Revise — Creates a CHILD revision (original stays untouched) ────
    @PatchMapping("/{id}/revise")
    public ResponseEntity<Map<String, Object>> reviseQuestion(
            @PathVariable UUID id,
            @RequestBody ReviseRequest request,
            Authentication authentication) {
        
        Question original = questionService.getQuestion(id);
        String userEmail = authentication.getName();

        // Build revision draft as a CHILD question
        Question draft = new Question();
        draft.setParentQuestionId(original.getId());
        draft.setType(original.getType());
        draft.setDifficulty(original.getDifficulty());
        draft.setMarks(original.getMarks());
        draft.setNegativeMarks(original.getNegativeMarks());
        draft.setLanguage(original.getLanguage());
        draft.setBloomLevel(original.getBloomLevel());
        draft.setClassSubject(original.getClassSubject());
        draft.setChapter(original.getChapter());
        draft.setTopic(original.getTopic());
        draft.setSourceReference(original.getSourceReference());
        draft.setAiGenerated(original.getAiGenerated());

        // Apply revised content from request (or keep original if not changed)
        draft.setStimulus(request.getStimulus() != null ? request.getStimulus() : original.getStimulus());
        draft.setQuestionText(request.getQuestionText() != null ? request.getQuestionText() : original.getQuestionText());
        draft.setCorrectAnswer(request.getCorrectAnswer() != null ? request.getCorrectAnswer() : original.getCorrectAnswer());
        draft.setExplanation(request.getExplanation() != null ? request.getExplanation() : original.getExplanation());
        
        draft.setMcqType(original.getMcqType());
        if (request.getStatements() != null && !request.getStatements().isEmpty()) {
            draft.setStatements(new java.util.ArrayList<>(request.getStatements()));
        } else if (original.getStatements() != null) {
            draft.setStatements(new java.util.ArrayList<>(original.getStatements()));
        }

        // Revision metadata
        draft.setStatus(Question.QuestionStatus.REVISED);
        draft.setVersionComment(request.getRevisionNotes());
        draft.setRevisedBy(userEmail);
        draft.setRevisedAt(java.time.LocalDateTime.now());
        draft.setCreatedBy(userEmail);

        // Prepare options for MCQ
        List<QuestionOption> draftOptions = null;
        if (original.getType().equals(Question.QuestionType.MCQ.name())) {
            if (request.getOptions() != null && !request.getOptions().isEmpty()) {
                // Use revised options from request
                draftOptions = new java.util.ArrayList<>();
                for (QuestionOption incoming : request.getOptions()) {
                    QuestionOption opt = new QuestionOption();
                    opt.setOptionLabel(incoming.getOptionLabel());
                    opt.setOptionText(incoming.getOptionText());
                    opt.setCorrect(incoming.isCorrect());
                    draftOptions.add(opt);
                }
            } else {
                // Copy original options
                List<QuestionOption> origOpts = questionService.getOptions(id);
                draftOptions = new java.util.ArrayList<>();
                for (QuestionOption o : origOpts) {
                    QuestionOption opt = new QuestionOption();
                    opt.setOptionLabel(o.getOptionLabel());
                    opt.setOptionText(o.getOptionText());
                    opt.setCorrect(o.isCorrect());
                    draftOptions.add(opt);
                }
            }
        }

        // Save the child revision (status=REVISED is already set on draft)
        Question savedRevision = questionService.submitRevision(
            id, draft, draftOptions, userEmail, request.getRevisionNotes()
        );

        // Increment revision count on original (no status change to original)
        original.setRevisionCount((original.getRevisionCount() == null ? 0 : original.getRevisionCount()) + 1);
        // original is a managed JPA entity within this request — save is handled by the service layer

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Revision draft created. Original question is untouched. Awaiting Super Admin review.",
            "revisionId", savedRevision.getId(),
            "originalId", id,
            "data", savedRevision
        ));
    }

    @PatchMapping("/bulk/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('QUESTION_BANK_REPOSITORY_ALL_QUESTIONS_UPDATE', 'QUESTION_BANK_REPOSITORY_PENDING_UPDATE')")
    public ResponseEntity<Void> approveQuestionsBulk(@RequestBody List<UUID> ids, Authentication authentication) {
        String approverId = authentication.getName();
        questionService.approveQuestionsBulk(ids, approverId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/bulk/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('QUESTION_BANK_REPOSITORY_ALL_QUESTIONS_UPDATE', 'QUESTION_BANK_REPOSITORY_PENDING_UPDATE', 'QUESTION_BANK_REPOSITORY_REJECTED_UPDATE')")
    public ResponseEntity<Void> rejectQuestionsBulk(@RequestBody List<UUID> ids) {
        questionService.rejectQuestionsBulk(ids);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/bulk/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or hasAnyAuthority('QUESTION_BANK_REPOSITORY_ALL_QUESTIONS_UPDATE', 'QUESTION_BANK_REPOSITORY_PENDING_UPDATE', 'QUESTION_BANK_REPOSITORY_REJECTED_UPDATE')")
    public ResponseEntity<Void> updateStatusBulk(@RequestBody BulkStatusUpdateRequest request,
            Authentication authentication) {
        questionService.updateStatusBulk(request.getIds(), request.getStatus(), authentication.getName());
        return ResponseEntity.noContent().build();
    }

    // --- Stimulus Image Upload (Cloudflare R2) ---

    @PostMapping("/upload-image")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, String>> uploadStimulusImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String tenantId = null;
            if (user.getInstitute() != null) {
                boolean isSuperAdmin = user.getRoles().stream()
                        .anyMatch(role -> "SUPER_ADMIN".equals(role.getName()));
                if (!isSuperAdmin) {
                    tenantId = user.getInstitute().getId().toString();
                }
            }

            String subFolder = "questions/stimulus";
            if (tenantId != null) {
                subFolder += "/" + tenantId;
            }

            String fileUrl = dynamicStorageService.uploadFile(file, tenantId, subFolder);

            // Prepend public path for local files
            if (!fileUrl.startsWith("http") && !fileUrl.startsWith("/")) {
                fileUrl = "/api/v1/public/files/" + fileUrl;
            }

            return ResponseEntity.ok(Map.of("url", fileUrl));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Upload failed"));
        }
    }

    // --- Question Source / Exam Label CRUD ---

    @GetMapping("/{id}/sources")
    public ResponseEntity<List<QuestionSource>> getQuestionSources(@PathVariable UUID id) {
        return ResponseEntity.ok(questionSourceRepository.findByQuestionId(id));
    }

    @PostMapping("/{id}/sources")
    public ResponseEntity<QuestionSource> addQuestionSource(@PathVariable UUID id, @RequestBody QuestionSource source) {
        Question question = questionService.getQuestion(id);
        source.setQuestion(question);
        return ResponseEntity.ok(questionSourceRepository.save(source));
    }

    @DeleteMapping("/sources/{sourceId}")
    public ResponseEntity<Void> deleteQuestionSource(@PathVariable UUID sourceId) {
        questionSourceRepository.deleteById(sourceId);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class BulkStatusUpdateRequest {
        private List<UUID> ids;
        private Question.QuestionStatus status;
    }

    @Data
    public static class CreateMCQRequest {
        private Question question;
        private List<QuestionOption> options;
        private Map<String, String> metadata; // AI auto-link: className, subject, chapter, topic
    }

    @Data
    public static class CreateMCQBulkRequest {
        private List<Question> questions;
        private List<List<QuestionOption>> optionsList;
        private Map<String, String> metadata;       // AI name-based fallback
        private Map<String, String> academicIds;    // Direct IDs from hierarchy picker (priority)
    }

    @Data
    public static class UpdateQuestionRequest {
        private Question question;
        private List<QuestionOption> options;
    }

    @Data
    public static class ReviseRequest {
        private String stimulus;
        private String questionText;
        private String correctAnswer;
        private String explanation;
        private List<String> statements;
        private List<QuestionOption> options;
        private String revisionNotes;
        private Question.QuestionStatus status;
    }

    @Data
    public static class BulkAvailabilityRequest {
        private List<UUID> classSubjectIds;
        private String language;
    }
}
