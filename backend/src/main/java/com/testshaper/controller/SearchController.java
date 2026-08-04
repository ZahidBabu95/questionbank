package com.testshaper.controller;

import com.testshaper.common.ApiResponse;
import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import com.testshaper.repository.QuestionOptionRepository;
import com.testshaper.repository.QuestionRepository;
import com.testshaper.service.MeilisearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final MeilisearchService meilisearchService;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;

    @GetMapping("/instant")
    public ResponseEntity<ApiResponse<Map<String, Object>>> instantSearch(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) String classSubjectId,
            @RequestParam(required = false) String chapterId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String difficulty,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Map<String, Object> searchResult = meilisearchService.searchQuestions(
                q, tenantId, classSubjectId, chapterId, type, difficulty, page, size
        );

        return ResponseEntity.ok(ApiResponse.success(searchResult, "Search processed successfully"));
    }

    @PostMapping("/reindex")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('INSTITUTE_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reindexAllQuestions() {
        if (!meilisearchService.isAvailable()) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Meilisearch engine is offline or disabled.");
            return ResponseEntity.ok(ApiResponse.success(err, "Meilisearch server offline"));
        }

        meilisearchService.initIndexSettings();

        int pageSize = 500;
        int currentPage = 0;
        int totalIndexed = 0;
        Page<Question> questionPage;

        do {
            questionPage = questionRepository.findAll(PageRequest.of(currentPage, pageSize));
            List<Question> questions = questionPage.getContent();
            
            if (!questions.isEmpty()) {
                List<Map<String, Object>> batchDocs = new ArrayList<>();
                for (Question q : questions) {
                    List<QuestionOption> options = optionRepository.findByQuestionIdOrderByOptionLabelAsc(q.getId());
                    batchDocs.add(meilisearchService.buildDocument(q, options));
                }
                totalIndexed += meilisearchService.bulkIndexDocuments(batchDocs);
            }
            currentPage++;
        } while (questionPage.hasNext());

        Map<String, Object> res = new HashMap<>();
        res.put("totalIndexed", totalIndexed);
        res.put("status", "SUCCESS");

        return ResponseEntity.ok(ApiResponse.success(res, "Bulk indexing completed successfully"));
    }
}
