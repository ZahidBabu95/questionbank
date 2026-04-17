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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiQuestionGenScheduler {

    private final AiQuestionGenerationJobRepository jobRepository;
    private final KnowledgePageRepository pageRepository;
    private final KnowledgeHubService knowledgeHubService;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    // Phase 6: Dynamic Worker Pool (Configured to map available Active API Keys)
    private static final int MAX_WORKERS = 6;
    private final ExecutorService workerPool = Executors.newFixedThreadPool(MAX_WORKERS, runnable -> {
        Thread thread = new Thread(runnable);
        thread.setDaemon(true); // Ensures JVM can shutdown gracefully
        thread.setName("AiQuestionWorker-" + thread.getId());
        return thread;
    });

    // Skewed slightly from Extraction Scheduler (which runs at 3000ms delay)
    @Scheduled(fixedDelay = 4000)
    public void processQuestionGenerationQueue() {
        // Fetch ALL jobs that are currently IN_PROGRESS
        List<AiQuestionGenerationJob> activeJobs = jobRepository.findByStatus(AiQuestionGenerationJob.JobStatus.IN_PROGRESS);

        // Auto-promote QUEUED jobs safely
        if (activeJobs.size() < MAX_WORKERS) {
            List<AiQuestionGenerationJob> queuedJobs = jobRepository.findByStatus(AiQuestionGenerationJob.JobStatus.QUEUED);
            for (AiQuestionGenerationJob qj : queuedJobs) {
                qj.setStatus(AiQuestionGenerationJob.JobStatus.IN_PROGRESS);
                jobRepository.save(qj);
                activeJobs.add(qj);
                log.info("Dispatcher promoted QUEUED question gen job for SourceBook: {}", qj.getSourceBook().getId());
                if (activeJobs.size() >= MAX_WORKERS) break;
            }
        }

        // Always broadcast to keep frontend in sync with idle, queued, paused state
        try {
            messagingTemplate.convertAndSend("/topic/system-health-jobs", knowledgeHubService.getSystemHealthAndJobs());
        } catch (Exception ignored) { }

        if (activeJobs.isEmpty()) {
            return;
        }

        // Distributed Round-Robin assignment
        int threadsPerJob = Math.max(1, MAX_WORKERS / activeJobs.size());
        
        List<Callable<Void>> concurrentTasks = new ArrayList<>();
        
        for (AiQuestionGenerationJob job : activeJobs) {
            int currentOffset = job.getProcessedPagesCount();
            boolean hasReachedEnd = false;

            // Fetch exactly 'threadsPerJob' distinct pages using strict offset queries
            // Since ExtractionStatus.PROOFREAD remains static after Gen, we must use precise offsets
            for (int i = 0; i < threadsPerJob; i++) {
                int targetOffset = currentOffset + i;
                org.springframework.data.domain.Page<KnowledgePage> pageResult = pageRepository.findBySourceBookIdAndExtractionStatusIn(
                        job.getSourceBook().getId(),
                        java.util.List.of(KnowledgePage.ExtractionStatus.PROOFREAD),
                        PageRequest.of(targetOffset, 1, Sort.by("pageNumber").ascending())
                );

                if (pageResult.isEmpty()) {
                    hasReachedEnd = true;
                    break;
                }

                KnowledgePage page = pageResult.getContent().get(0);
                
                concurrentTasks.add(() -> {
                    processSinglePageForQuestions(job, page);
                    return null;
                });
            }

            if (hasReachedEnd) {
                job.setStatus(AiQuestionGenerationJob.JobStatus.COMPLETED);
                jobRepository.save(job);
                log.info("Completed full question generation job for SourceBook: {}", job.getSourceBook().getId());
            }
        }

        if (!concurrentTasks.isEmpty()) {
            try {
                workerPool.invokeAll(concurrentTasks);
            } catch (InterruptedException e) {
                log.error("Worker pool interrupted during Question Gen execution", e);
                Thread.currentThread().interrupt();
            }
        }

        try {
            messagingTemplate.convertAndSend("/topic/system-health-jobs", knowledgeHubService.getSystemHealthAndJobs());
        } catch (Exception ignored) { }
    }

    private void processSinglePageForQuestions(AiQuestionGenerationJob job, KnowledgePage page) {
        log.info("Thread [{}] generating questions for Page: {} of Book: {}", Thread.currentThread().getName(), page.getPageNumber(), job.getSourceBook().getId());

        try {
            int generatedCount = knowledgeHubService.generateQuestionsForPage(job.getSourceBook().getId(), page.getId());

            synchronized (job.getId().toString().intern()) {
                AiQuestionGenerationJob freshJob = jobRepository.findById(job.getId()).orElse(job);
                freshJob.setProcessedPagesCount(freshJob.getProcessedPagesCount() + 1);
                freshJob.setTotalQuestionsGenerated(freshJob.getTotalQuestionsGenerated() + generatedCount);
                jobRepository.save(freshJob);
            }

        } catch (Exception e) {
            log.error("Question Gen Thread failed for Page: {}. Error: {}", page.getId(), e.getMessage());

            synchronized (job.getId().toString().intern()) {
                AiQuestionGenerationJob freshJob = jobRepository.findById(job.getId()).orElse(job);

                if (e.getMessage() != null && e.getMessage().contains("429")) {
                    log.warn("Rate limit detected in Pool! Pausing Question Gen job temporarily. Offset safely preserved.");
                    freshJob.setStatus(AiQuestionGenerationJob.JobStatus.PAUSED);
                } else {
                    freshJob.setFailedPagesCount(freshJob.getFailedPagesCount() + 1);
                    // Move marker forward safely only if it's a non-API exhaustion error
                    freshJob.setProcessedPagesCount(freshJob.getProcessedPagesCount() + 1);
                }
                
                jobRepository.save(freshJob);
            }
        } finally {
            try {
                messagingTemplate.convertAndSend("/topic/system-health-jobs", knowledgeHubService.getSystemHealthAndJobs());
            } catch (Exception ignored) { }
        }
    }
}
