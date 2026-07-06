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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.concurrent.Executors;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import jakarta.annotation.PostConstruct;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiExtractionScheduler {

    private final AiBulkExtractionJobRepository jobRepository;
    private final KnowledgePageRepository pageRepository;
    private final KnowledgeHubService knowledgeHubService;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.testshaper.repository.GeneralSettingRepository settingRepository;

    // Phase 6: Dynamic UI-Configured Worker Pool
    public static volatile int currentWorkerSize = 6;
    private final ThreadPoolTaskExecutor workerPool = new ThreadPoolTaskExecutor();

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void init() {
        // Load worker size from DB if exists
        settingRepository.findByTenantIdIsNullAndKey("AI_WORKER_POOL_SIZE").ifPresent(setting -> {
            try {
                currentWorkerSize = Integer.parseInt(setting.getValue());
                log.info("Loaded AI Worker Pool size from DB: {}", currentWorkerSize);
            } catch (NumberFormatException ignored) {}
        });

        workerPool.setCorePoolSize(currentWorkerSize);
        workerPool.setMaxPoolSize(currentWorkerSize);
        workerPool.setQueueCapacity(5000);
        workerPool.setThreadNamePrefix("AiExtractWorker-");
        workerPool.setDaemon(true);
        workerPool.initialize();
    }

    public void setMaxWorkers(int size) {
        if (size < 1) size = 1;
        if (size > 200) size = 200;
        
        if (size > currentWorkerSize) {
            // Increasing size: set max first, then core
            workerPool.setMaxPoolSize(size);
            workerPool.setCorePoolSize(size);
        } else if (size < currentWorkerSize) {
            // Decreasing size: set core first, then max
            workerPool.setCorePoolSize(size);
            workerPool.setMaxPoolSize(size);
        }
        
        currentWorkerSize = size;
        log.info("AI Worker Pool size updated dynamically to: {}", size);

        // Persist to DB
        com.testshaper.entity.GeneralSetting setting = settingRepository.findByTenantIdIsNullAndKey("AI_WORKER_POOL_SIZE")
                .orElseGet(() -> {
                    com.testshaper.entity.GeneralSetting s = new com.testshaper.entity.GeneralSetting();
                    s.setCategory(com.testshaper.entity.GeneralSetting.SettingCategory.AI);
                    s.setKey("AI_WORKER_POOL_SIZE");
                    return s;
                });
        setting.setValue(String.valueOf(size));
        settingRepository.save(setting);
    }

    @Scheduled(fixedDelay = 3000)
    public void processExtractionQueue() {
        // Fetch ALL jobs that are currently IN_PROGRESS
        List<AiBulkExtractionJob> activeJobs = jobRepository.findByStatus(AiBulkExtractionJob.JobStatus.IN_PROGRESS);

        // Auto-promote QUEUED jobs strictly based on unused capacity
        if (activeJobs.size() < currentWorkerSize) {
            List<AiBulkExtractionJob> queuedJobs = jobRepository.findByStatus(AiBulkExtractionJob.JobStatus.QUEUED);
            for (AiBulkExtractionJob qj : queuedJobs) {
                qj.setStatus(AiBulkExtractionJob.JobStatus.IN_PROGRESS);
                jobRepository.save(qj);
                activeJobs.add(qj);
                log.info("Dispatcher promoted QUEUED job to IN_PROGRESS for SourceBook: {}", qj.getSourceBook().getId());
                
                // Don't overwhelm the thread pool limits
                if (activeJobs.size() >= currentWorkerSize) break; 
            }
        }

        if (activeJobs.isEmpty()) {
            return; // No pending or active jobs
        }

        // Calculate distribution: Greedy vs Fair Round-Robin
        // If 1 job is active -> gets 6 threads (Greedy), if 3 jobs active -> 2 threads each (Fair)
        int threadsPerJob = Math.max(1, currentWorkerSize / activeJobs.size());
        
        List<Callable<Void>> concurrentTasks = new ArrayList<>();
        
        for (AiBulkExtractionJob job : activeJobs) {
            // Fetch next batch of pending pages up to exactly the allocated threads limit
            org.springframework.data.domain.Page<KnowledgePage> pageBatch = pageRepository.findBySourceBookIdAndExtractionStatusIn(
                job.getSourceBook().getId(),
                java.util.List.of(KnowledgePage.ExtractionStatus.PENDING),
                PageRequest.of(0, threadsPerJob, Sort.by("pageNumber").ascending())
            );

            if (pageBatch.isEmpty()) {
                job.setStatus(AiBulkExtractionJob.JobStatus.COMPLETED);
                jobRepository.save(job);
                log.info("Completed bulk extraction job for SourceBook: {}", job.getSourceBook().getId());
                continue;
            }

            for (KnowledgePage page : pageBatch.getContent()) {
                concurrentTasks.add(() -> {
                    processSinglePage(job, page);
                    return null;
                });
            }
        }

        // Execute all collected tasks concurrently and block until this entire batch finishes
        // This naturally syncs the rate limiter across multiple keys
        if (!concurrentTasks.isEmpty()) {
            try {
                workerPool.getThreadPoolExecutor().invokeAll(concurrentTasks);
            } catch (InterruptedException e) {
                log.error("Worker pool interrupted during batch execution", e);
                Thread.currentThread().interrupt();
            }
        }
    }

    private void processSinglePage(AiBulkExtractionJob job, KnowledgePage page) {
        log.info("Thread [{}] extracting Markdown for Page: {} of Book: {}", Thread.currentThread().getName(), page.getPageNumber(), job.getSourceBook().getId());
        
        try {
            // Service method initiates Google Gemini REST Call using the rotation pool
            knowledgeHubService.extractKnowledgePageContent(job.getSourceBook().getId(), page.getId());

            // Optimistic lock mitigation
            synchronized (job.getId().toString().intern()) {
                AiBulkExtractionJob freshJob = jobRepository.findById(job.getId()).orElse(job);
                freshJob.setProcessedPagesCount(freshJob.getProcessedPagesCount() + 1);
                jobRepository.save(freshJob);
            }

        } catch (Exception e) {
            log.error("Extraction Thread failed for Page: {}. Error: {}", page.getId(), e.getMessage());
            
            pageRepository.findById(page.getId()).ifPresent(p -> {
                p.setExtractionStatus(KnowledgePage.ExtractionStatus.FAILED);
                pageRepository.save(p);
            });

            synchronized (job.getId().toString().intern()) {
                AiBulkExtractionJob freshJob = jobRepository.findById(job.getId()).orElse(job);
                freshJob.setFailedPagesCount(freshJob.getFailedPagesCount() + 1);
                
                // Distributed Rate limit interception
                if (e.getMessage() != null && e.getMessage().contains("429")) {
                    log.warn("Rate limit detected in Worker Pool! Pausing job temporarily.");
                    freshJob.setStatus(AiBulkExtractionJob.JobStatus.PAUSED);
                }
                
                jobRepository.save(freshJob);
            }
        }
    }

    // Phase 6: Ensure steady, real-time UI updates without spamming WebSocket connections
    @Scheduled(fixedRate = 2000)
    public void broadcastHealthRealTime() {
        try {
            messagingTemplate.convertAndSend("/topic/system-health-jobs", knowledgeHubService.getSystemHealthAndJobs());
        } catch (Exception ignored) { }
    }
}
