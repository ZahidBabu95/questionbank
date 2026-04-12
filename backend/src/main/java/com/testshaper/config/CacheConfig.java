package com.testshaper.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Local In-Memory Cache Configuration using Caffeine.
 *
 * Cache regions:
 *  - aiSettings        : AI provider settings (60s TTL) — DB hit কমায়
 *  - apiKeyPool        : Active API key list (30s TTL) — per-chunk scan বন্ধ করে
 *  - academicHierarchy : Level/Class/Subject/Chapter lists (5min TTL)
 *  - scrapeResultCache : File hash → AI scrape result (1hr TTL) — same PDF instant response
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        // AI settings: 60 seconds TTL (updated rarely)
        manager.registerCustomCache("aiSettings",
            Caffeine.newBuilder()
                .expireAfterWrite(60, TimeUnit.SECONDS)
                .maximumSize(10)
                .recordStats()
                .build());

        // API Key pool: 30 seconds TTL (refreshed on key changes)
        manager.registerCustomCache("apiKeyPool",
            Caffeine.newBuilder()
                .expireAfterWrite(30, TimeUnit.SECONDS)
                .maximumSize(1)
                .recordStats()
                .build());

        // Academic hierarchy (levels, classes, subjects, chapters): 5 minutes TTL
        // These rarely change — safe to cache longer
        manager.registerCustomCache("academicHierarchy",
            Caffeine.newBuilder()
                .expireAfterWrite(300, TimeUnit.SECONDS)
                .maximumSize(200)
                .recordStats()
                .build());

        // Scrape result cache (file hash → questions JSON): 1 hour TTL
        // Prevents re-processing the same PDF/image
        manager.registerCustomCache("scrapeResultCache",
            Caffeine.newBuilder()
                .expireAfterWrite(3600, TimeUnit.SECONDS)
                .maximumSize(50)
                .recordStats()
                .build());

        return manager;
    }
}
