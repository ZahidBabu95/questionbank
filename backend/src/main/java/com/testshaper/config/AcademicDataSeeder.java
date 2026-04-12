package com.testshaper.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * AcademicDataSeeder - DISABLED.
 * Initial seed was completed manually. This class is kept as a no-op to avoid breaking
 * any existing Spring context wiring. Re-enable and restore body if a fresh seed is needed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AcademicDataSeeder implements CommandLineRunner {

    @Override
    public void run(String... args) throws Exception {
        // Seeding disabled: data has already been seeded into the database.
        // To re-seed, restore the original implementation from git history.
        log.info("AcademicDataSeeder: seeding is disabled (data already exists).");
    }
}