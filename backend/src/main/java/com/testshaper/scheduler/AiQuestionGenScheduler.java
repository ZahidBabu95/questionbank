package com.testshaper.scheduler;

import com.testshaper.entity.AiQuestionGenerationJob;
import com.testshaper.entity.KnowledgePage;
import com.testshaper.repository.AiQuestionGenerationJobRepository;
import com.testshaper.repository.CurriculumDocumentChunkRepository;
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
    private final CurriculumDocumentChunkRepository chunkRepository;
    private final com.testshaper.repository.SourceBookIndexRepository sourceBookIndexRepository;
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
        java.util.Set<java.util.UUID> completedJobIds = new java.util.HashSet<>();
        
        for (AiQuestionGenerationJob job : activeJobs) {
            int currentOffset = job.getProcessedPagesCount();
            boolean hasReachedEnd = false;

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.testshaper.dto.AiQuestionGenConfigDto config = null;
            if (job.getJobConfiguration() != null) {
                try { config = mapper.readValue(job.getJobConfiguration(), com.testshaper.dto.AiQuestionGenConfigDto.class); } catch (Exception ignored) {}
            }

            // Fetch exactly 'threadsPerJob' distinct chunks using strict offset queries
            for (int i = 0; i < threadsPerJob; i++) {
                int targetOffset = currentOffset + i;
                com.testshaper.entity.CurriculumDocumentChunk chunk = null;

                if (config != null && config.getTargetIndexIds() != null && !config.getTargetIndexIds().isEmpty()) {
                    org.springframework.data.domain.Page<com.testshaper.entity.CurriculumDocumentChunk> chunkResult = chunkRepository.findBySourceBookIndexIdIn(
                            config.getTargetIndexIds(),
                            PageRequest.of(targetOffset, 1, Sort.by("chunkIndex").ascending())
                    );
                    if (!chunkResult.isEmpty()) {
                        chunk = chunkResult.getContent().get(0);
                    } else {
                        // Fallback for legacy extracted chunks without sourceBookIndexId
                        java.util.List<java.util.UUID> targetChapterIds = new java.util.ArrayList<>();
                        for (java.util.UUID idxId : config.getTargetIndexIds()) {
                            com.testshaper.entity.SourceBookIndex idx = sourceBookIndexRepository.findById(idxId).orElse(null);
                            if (idx != null && idx.getMappedChapter() != null) {
                                targetChapterIds.add(idx.getMappedChapter().getId());
                            }
                        }
                        if (!targetChapterIds.isEmpty()) {
                            chunkResult = chunkRepository.findBySourceBookIdAndMappedTopic_Chapter_IdIn(
                                    job.getSourceBook().getId(),
                                    targetChapterIds,
                                    org.springframework.data.domain.PageRequest.of(targetOffset, 1, org.springframework.data.domain.Sort.by("chunkIndex").ascending())
                            );
                            if (!chunkResult.isEmpty()) {
                                chunk = chunkResult.getContent().get(0);
                            }
                        }
                    }
                } else {
                    org.springframework.data.domain.Page<com.testshaper.entity.CurriculumDocumentChunk> chunkResult = chunkRepository.findBySourceBookId(
                            job.getSourceBook().getId(),
                            PageRequest.of(targetOffset, 1, Sort.by("chunkIndex").ascending())
                    );
                    if (!chunkResult.isEmpty()) {
                        chunk = chunkResult.getContent().get(0);
                    }
                }

                if (chunk == null) {
                    hasReachedEnd = true;
                    break;
                }

                final com.testshaper.entity.CurriculumDocumentChunk finalChunk = chunk;
                concurrentTasks.add(() -> {
                    processSingleChunkForQuestions(job, finalChunk);
                    return null;
                });
            }

            if (hasReachedEnd) {
                completedJobIds.add(job.getId());
                log.info("Queue finished constructing, recording completion wait for Question Job: {}", job.getSourceBook().getId());
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

        for (java.util.UUID cjId : completedJobIds) {
            AiQuestionGenerationJob cj = jobRepository.findById(cjId).orElse(null);
            if (cj != null) {
                cj.setStatus(AiQuestionGenerationJob.JobStatus.COMPLETED);
                jobRepository.save(cj);
                log.info("Completed full question generation job for SourceBook: {}", cj.getSourceBook().getId());
            }
        }

        try {
            messagingTemplate.convertAndSend("/topic/system-health-jobs", knowledgeHubService.getSystemHealthAndJobs());
        } catch (Exception ignored) { }
    }

    private void processSingleChunkForQuestions(AiQuestionGenerationJob job, com.testshaper.entity.CurriculumDocumentChunk chunk) {
        log.info("Thread [{}] generating questions for Chunk: {} of Book: {}", Thread.currentThread().getName(), chunk.getId(), job.getSourceBook().getId());

        try {
            int generatedCount = knowledgeHubService.generateQuestionsForChunk(job.getSourceBook().getId(), chunk.getId(), job.getJobConfiguration());

            synchronized (job.getId().toString().intern()) {
                AiQuestionGenerationJob freshJob = jobRepository.findById(job.getId()).orElse(job);
                freshJob.setProcessedPagesCount(freshJob.getProcessedPagesCount() + 1);
                freshJob.setTotalQuestionsGenerated(freshJob.getTotalQuestionsGenerated() + generatedCount);
                jobRepository.save(freshJob);
            }

        } catch (Exception e) {
            log.error("Question Gen Thread failed for Chunk: {}. Error: {}", chunk.getId(), e.getMessage());

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
