package com.testshaper.scheduler;

import com.testshaper.entity.Institute;
import com.testshaper.repository.InstituteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiUsageScheduler {

    private final InstituteRepository instituteRepository;

    // Run on the 1st day of every month at midnight
    @Scheduled(cron = "0 0 0 1 * ?")
    @Transactional
    public void resetAiUsage() {
        log.info("Running monthly AI usage reset...");

        List<Institute> allInstitutes = instituteRepository.findAll();

        for (Institute institute : allInstitutes) {
            institute.setAiUsedCurrentMonth(0);
            instituteRepository.save(institute);
        }

        log.info("Reset AI usage for {} institutes.", allInstitutes.size());
    }
}
