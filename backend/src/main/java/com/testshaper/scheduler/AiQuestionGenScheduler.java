package com.testshaper.scheduler;

import com.testshaper.entity.AiQuestionGenerationJob;
import com.testshaper.entity.KnowledgePage;
import com.testshaper.repository.AiQuestionGenerationJobRepository;
import com.testshaper.repository.KnowledgePageRepository;
import com.testshaper.service.KnowledgeHubService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiQuestionGenScheduler {

    private final AiQuestionGenerationJobRepository jobRepository;
    private final KnowledgePageRepository pageRepository;
    private final KnowledgeHubService knowledgeHubService;

    // Checks queue every 3 seconds to avoid clashing directly with extraction scheduler API limits
    @Scheduled(fixedDelay = 3000)
    public void processQuestionGenerationQueue() {
        // Fetch up to 1 IN_PROGRESS job or QUEUED job
        List<AiQuestionGenerationJob> activeJobs = jobRepository.findByStatus(AiQuestionGenerationJob.JobStatus.IN_PROGRESS);
        AiQuestionGenerationJob jobToProcess = null;

        if (!activeJobs.isEmpty()) {
            jobToProcess = activeJobs.get(0);
        } else {
            List<AiQuestionGenerationJob> queuedJobs = jobRepository.findByStatus(AiQuestionGenerationJob.JobStatus.QUEUED);
            if (!queuedJobs.isEmpty()) {
                jobToProcess = queuedJobs.get(0);
                jobToProcess.setStatus(AiQuestionGenerationJob.JobStatus.IN_PROGRESS);
                jobRepository.save(jobToProcess);
                log.info("Started question generation job for SourceBook: {}", jobToProcess.getSourceBook().getId());
            }
        }

        if (jobToProcess == null) {
            return; // No pending or active jobs
        }

        UUID currentlyProcessingPageId = null;
        try {
            // Find exactly one next pending page for this book
            // Wait, how do we track if a page has been processed for questions?
            // Since we don't have a "questionGeneratedStatus" in KnowledgePage, we check the pages based on whether they are EXTRACTED.
            // A more robust way is to load pages and keep track of offset in the Job. 
            // For now, let's use the job's processedPagesCount as the OFFSET.
            
            int offset = jobToProcess.getProcessedPagesCount();
            
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(offset, 1, org.springframework.data.domain.Sort.by("pageNumber").ascending());
            
            // Get the next PROOFREAD page
            org.springframework.data.domain.Page<KnowledgePage> pageResult = pageRepository.findBySourceBookIdAndExtractionStatusIn(
                    jobToProcess.getSourceBook().getId(),
                    java.util.List.of(KnowledgePage.ExtractionStatus.PROOFREAD),
                    pageable
            );

            if (pageResult.isEmpty()) {
                // If there are no more pages, mark job as completed
                jobToProcess.setStatus(AiQuestionGenerationJob.JobStatus.COMPLETED);
                jobRepository.save(jobToProcess);
                log.info("Completed question generation job for SourceBook: {}", jobToProcess.getSourceBook().getId());
                return;
            }

            KnowledgePage page = pageResult.getContent().get(0);
            currentlyProcessingPageId = page.getId();
            log.info("Background generating questions for Page Number: {} of SourceBook: {}", page.getPageNumber(), jobToProcess.getSourceBook().getId());

            int generatedCount = knowledgeHubService.generateQuestionsForPage(jobToProcess.getSourceBook().getId(), currentlyProcessingPageId);

            // Refetch to prevent ObjectOptimisticLockingFailureException if modified by another thread
            jobToProcess = jobRepository.findById(jobToProcess.getId()).orElse(jobToProcess);

            // Even if we are generating multiple questions, process count moves by 1 page
            jobToProcess.setProcessedPagesCount(jobToProcess.getProcessedPagesCount() + 1);
            jobToProcess.setTotalQuestionsGenerated(jobToProcess.getTotalQuestionsGenerated() + generatedCount);
            jobRepository.save(jobToProcess);

        } catch (Exception e) {
            log.error("Failed to generate questions in background for SourceBook: {}. Error: {}", jobToProcess.getSourceBook().getId(), e.getMessage());

            // Refetch to prevent ObjectOptimisticLockingFailureException if modified by another thread
            jobToProcess = jobRepository.findById(jobToProcess.getId()).orElse(jobToProcess);

            if (e.getMessage() != null && e.getMessage().contains("429")) {
                log.warn("Rate limit detected! Pausing Question Gen job temporarily. Offset preserved for retry.");
                jobToProcess.setStatus(AiQuestionGenerationJob.JobStatus.PAUSED);
            } else {
                jobToProcess.setFailedPagesCount(jobToProcess.getFailedPagesCount() + 1);
                // Move to next page only if it's a non-rate-limit error
                jobToProcess.setProcessedPagesCount(jobToProcess.getProcessedPagesCount() + 1);
            }
            
            jobRepository.save(jobToProcess);
        }
    }
}
