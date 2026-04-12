package com.testshaper.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.testshaper.entity.AiUploadHistory;
import com.testshaper.repository.AiUploadHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Two-tier cache for AI scrape results:
 *
 *  Tier 1 — In-memory Caffeine cache (ultra-fast, 1hr TTL, 50 entries max)
 *  Tier 2 — Database (AiUploadHistory.cachedResultJson) — survives server restarts
 *
 * Flow:
 *   1. Compute SHA-256 hash of uploaded file
 *   2. Check Tier 1 (memory) → instant return
 *   3. Check Tier 2 (DB) → warm Tier 1 + return
 *   4. Not found → proceed with AI call → store result in both tiers
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScrapeResultCacheService {

    private final AiUploadHistoryRepository uploadHistoryRepo;
    private final ObjectMapper objectMapper;

    // Tier 1: In-memory cache (fastest) — fileHash → result map
    private final Cache<String, Map<String, Object>> memoryCache =
        Caffeine.newBuilder()
            .expireAfterWrite(1, TimeUnit.HOURS)
            .maximumSize(50)
            .recordStats()
            .build();

    /**
     * Check if we already have a cached result for this file hash.
     * Checks memory first, then DB fallback.
     *
     * @param fileHash SHA-256 hex of the uploaded file bytes
     * @return cached result map if found, empty otherwise
     */
    public Optional<Map<String, Object>> getCachedResult(String fileHash) {
        // --- Tier 1: Memory ---
        Map<String, Object> memoryCached = memoryCache.getIfPresent(fileHash);
        if (memoryCached != null) {
            log.info("✅ Cache HIT (memory) for hash: {}...", fileHash.substring(0, 8));
            return Optional.of(memoryCached);
        }

        // --- Tier 2: Database ---
        try {
            Optional<AiUploadHistory> dbEntry = uploadHistoryRepo.findCachedResultByFileHash(fileHash);
            if (dbEntry.isPresent() && dbEntry.get().getCachedResultJson() != null) {
                Map<String, Object> result = objectMapper.readValue(
                    dbEntry.get().getCachedResultJson(),
                    new TypeReference<Map<String, Object>>() {}
                );
                // Warm up memory cache for next time
                memoryCache.put(fileHash, result);
                log.info("✅ Cache HIT (DB) for hash: {}... (warmed memory cache)", fileHash.substring(0, 8));
                return Optional.of(result);
            }
        } catch (Exception e) {
            log.warn("Cache DB lookup failed (non-fatal): {}", e.getMessage());
        }

        log.debug("Cache MISS for hash: {}...", fileHash.substring(0, 8));
        return Optional.empty();
    }

    /**
     * Store a successful scrape result in both cache tiers.
     * Called after every successful AI scrape.
     *
     * @param fileHash SHA-256 hex of the file
     * @param result   The full result map {questions: [...], metadata: {...}}
     */
    public void cacheResult(String fileHash, Map<String, Object> result) {
        // Store in memory immediately
        memoryCache.put(fileHash, result);

        // Persist to DB asynchronously (non-blocking for the user)
        try {
            String json = objectMapper.writeValueAsString(result);
            uploadHistoryRepo.updateCachedResult(fileHash, json);
            log.debug("Cache stored (both tiers) for hash: {}...", fileHash.substring(0, 8));
        } catch (Exception e) {
            log.warn("Failed to persist cache result to DB (non-fatal): {}", e.getMessage());
            // Memory cache still works even if DB persist fails
        }
    }

    /**
     * Evict a specific file from memory cache (used when upload history is deleted).
     */
    public void evict(String fileHash) {
        memoryCache.invalidate(fileHash);
        log.debug("Cache evicted for hash: {}...", fileHash.substring(0, 8));
    }

    /**
     * Get cache stats for admin dashboard (hit rate, size, etc.)
     */
    public Map<String, Object> getStats() {
        com.github.benmanes.caffeine.cache.stats.CacheStats stats = memoryCache.stats();
        return Map.of(
            "memorySize",    memoryCache.estimatedSize(),
            "hitCount",      stats.hitCount(),
            "missCount",     stats.missCount(),
            "hitRate",       String.format("%.1f%%", stats.hitRate() * 100),
            "evictionCount", stats.evictionCount()
        );
    }
}
