package com.testshaper.scheduler;

import com.testshaper.entity.Institute;
import com.testshaper.repository.InstituteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    private final InstituteRepository instituteRepository;

    // Run every day at midnight
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void checkExpiredSubscriptions() {
        log.info("Running daily subscription expiry check...");

        List<Institute> expiredInstitutes = instituteRepository.findExpiredInstitutes(LocalDate.now());

        for (Institute institute : expiredInstitutes) {
            // Check grace period
            LocalDate expiryWithGrace = institute.getExpiryDate().plusDays(institute.getGracePeriodDays());

            if (LocalDate.now().isAfter(expiryWithGrace)) {
                log.warn("Suspending institute {} due to expired subscription.", institute.getName());
                institute.setStatus(Institute.InstituteStatus.SUSPENDED);
                instituteRepository.save(institute);
            } else {
                log.info("Institute {} is expired but within grace period.", institute.getName());
                // Optionally send email alert here
            }
        }
    }
}
