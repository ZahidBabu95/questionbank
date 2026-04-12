package com.testshaper.scheduler;

import com.testshaper.entity.AiProcessingJob;
import com.testshaper.repository.AiProcessingJobRepository;
import com.testshaper.repository.GeneralSettingRepository;
import com.testshaper.service.ChunkedProcessingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiQueueCleanupScheduler {

    private final AiProcessingJobRepository jobRepository;
    private final ChunkedProcessingService chunkedProcessingService;
    private final GeneralSettingRepository settingsRepo;

    // Run every day at 3:00 AM
    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanupOldQueueJobs() {
        log.info("Starting AI Queue Auto-Cleanup Job...");

        // Try to read setting, default 30 days if not set
        int cleanupDays;
        try {
            String val = settingsRepo.findByTenantIdIsNullAndKey("ai_queue_cleanup_days")
                    .map(com.testshaper.entity.GeneralSetting::getValue).orElse("30");
            cleanupDays = Integer.parseInt(val);
        } catch (Exception e) {
            log.warn("Could not read 'ai_queue_cleanup_days' setting correctly, using default 30 days.");
            cleanupDays = 30;
        }

        if (cleanupDays <= 0) {
            log.info("Auto Cleanup target days is 0 or disabled. Skipping cleanup.");
            return;
        }

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(cleanupDays);

        // Find old jobs
        List<AiProcessingJob> oldJobs = jobRepository.findByUpdatedAtBeforeAndDeletedFalse(cutoffDate);

        if (oldJobs.isEmpty()) {
            log.info("No old jobs found to clean up.");
            return;
        }

        for (AiProcessingJob job : oldJobs) {
            try {
                // This will archive the job to AiUploadHistory and delete the chunk/job
                chunkedProcessingService.deleteAndArchiveJob(job.getId());
            } catch (Exception e) {
                log.error("Failed to archive and clean up job {}: {}", job.getId(), e.getMessage());
            }
        }

        log.info("Successfully cleaned up and archived {} old AI processing jobs (older than {} days).", oldJobs.size(), cleanupDays);
    }
}
