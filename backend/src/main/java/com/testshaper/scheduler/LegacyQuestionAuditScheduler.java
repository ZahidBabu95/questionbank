package com.testshaper.scheduler;

import com.testshaper.service.AiQuestionAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.ai.auto-audit.enabled", havingValue = "true", matchIfMissing = false)
public class LegacyQuestionAuditScheduler {

    private final AiQuestionAuditService aiQuestionAuditService;

    // Disabled auto-background scanning by default so AI audit agent only runs when manually triggered by user
    @Scheduled(fixedDelay = 30000)
    public void processLegacyApprovedQuestionAuditQueue() {
        try {
            int audited = aiQuestionAuditService.auditBatchApprovedQuestions(5);
            if (audited > 0) {
                log.info("Legacy Approved Question Background AI Audit processed {} items.", audited);
            }
        } catch (Exception e) {
            log.warn("Legacy Approved Question Audit skipped or paused due to lock/active agent: {}", e.getMessage());
        }
    }
}
