package com.testshaper.scheduler;

import com.testshaper.entity.AiBulkExtractionJob;
import com.testshaper.entity.KnowledgePage;
import com.testshaper.repository.AiBulkExtractionJobRepository;
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
public class AiExtractionScheduler {

    private final AiBulkExtractionJobRepository jobRepository;
    private final KnowledgePageRepository pageRepository;
    private final KnowledgeHubService knowledgeHubService;

    // Checks queue every 2 seconds for faster extraction using paid API.
    @Scheduled(fixedDelay = 2000)
    public void processExtractionQueue() {
        // Fetch up to 1 IN_PROGRESS job or QUEUED job
        List<AiBulkExtractionJob> activeJobs = jobRepository.findByStatus(AiBulkExtractionJob.JobStatus.IN_PROGRESS);
        AiBulkExtractionJob jobToProcess = null;

        if (!activeJobs.isEmpty()) {
            jobToProcess = activeJobs.get(0);
        } else {
            List<AiBulkExtractionJob> queuedJobs = jobRepository.findByStatus(AiBulkExtractionJob.JobStatus.QUEUED);
            if (!queuedJobs.isEmpty()) {
                jobToProcess = queuedJobs.get(0);
                jobToProcess.setStatus(AiBulkExtractionJob.JobStatus.IN_PROGRESS);
                jobRepository.save(jobToProcess);
                log.info("Started bulk extraction job for SourceBook: {}", jobToProcess.getSourceBook().getId());
            }
        }

        if (jobToProcess == null) {
            return; // No pending or active jobs
        }

        UUID currentlyProcessingPageId = null;
        try {
            // Find exactly one next pending page for this book
            Optional<KnowledgePage> nextPageOpt = pageRepository.findFirstBySourceBookIdAndExtractionStatusOrderByPageNumberAsc(
                    jobToProcess.getSourceBook().getId(),
                    KnowledgePage.ExtractionStatus.PENDING
            );

            if (nextPageOpt.isEmpty()) {
                // If there are no more pending pages, mark job as completed
                jobToProcess.setStatus(AiBulkExtractionJob.JobStatus.COMPLETED);
                jobRepository.save(jobToProcess);
                log.info("Completed bulk extraction job for SourceBook: {}", jobToProcess.getSourceBook().getId());
                return;
            }

            KnowledgePage page = nextPageOpt.get();
            currentlyProcessingPageId = page.getId();
            log.info("Background extracting Markdown for Page Number: {} of SourceBook: {}", page.getPageNumber(), jobToProcess.getSourceBook().getId());

            // Process via Gemini (this typically takes a few seconds)
            knowledgeHubService.extractKnowledgePageContent(jobToProcess.getSourceBook().getId(), currentlyProcessingPageId);

            // Refetch to prevent ObjectOptimisticLockingFailureException if modified by another thread
            jobToProcess = jobRepository.findById(jobToProcess.getId()).orElse(jobToProcess);

            // Since extraction succeeded without exception, it's already marked EXTRACTED in service
            jobToProcess.setProcessedPagesCount(jobToProcess.getProcessedPagesCount() + 1);
            jobRepository.save(jobToProcess);

        } catch (Exception e) {
            log.error("Failed to extract page in background for SourceBook: {}. Error: {}", jobToProcess.getSourceBook().getId(), e.getMessage());
            
            // Mark the specific page as FAILED
            if (currentlyProcessingPageId != null) {
                pageRepository.findById(currentlyProcessingPageId).ifPresent(p -> {
                    p.setExtractionStatus(KnowledgePage.ExtractionStatus.FAILED);
                    pageRepository.save(p);
                });
            }

            // Refetch to prevent ObjectOptimisticLockingFailureException if modified by another thread
            jobToProcess = jobRepository.findById(jobToProcess.getId()).orElse(jobToProcess);

            jobToProcess.setFailedPagesCount(jobToProcess.getFailedPagesCount() + 1);
            
            // If we hit too many failures (maybe rate limit exhausted), automatically pause the job
            if (e.getMessage() != null && e.getMessage().contains("429")) {
                log.warn("Rate limit detected! Pausing job temporarily.");
                jobToProcess.setStatus(AiBulkExtractionJob.JobStatus.PAUSED);
            }
            
            jobRepository.save(jobToProcess);
        }
    }
}
