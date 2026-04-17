package com.testshaper.service;

import com.testshaper.entity.AiApiKey;
import com.testshaper.repository.AiApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Manages multiple API keys with round-robin rotation.
 * Automatically skips exhausted keys and resets daily counters.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ApiKeyRotationService {

    private final AiApiKeyRepository keyRepo;
    private final NotificationService notificationService;
    private final AtomicInteger roundRobinIndex = new AtomicInteger(0);
    // Track last reset date to avoid per-request DB write
    private final AtomicReference<String> lastResetDate = new AtomicReference<>("");

    /**
     * Gets the next available API key using round-robin rotation.
     * Skips keys that have hit their daily limit.
     */
    public AiApiKey getNextAvailableKey() {
        resetDailyCountersIfNeeded(); // now safe: no-op if already reset today

        List<AiApiKey> keys = getCachedActiveKeys();
        if (keys.isEmpty()) return null;

        List<AiApiKey> paidKeys = keys.stream().filter(AiApiKey::isPaidTier).toList();
        List<AiApiKey> freeKeys = keys.stream().filter(k -> !k.isPaidTier()).toList();

        int startIdx = roundRobinIndex.getAndIncrement();

        // 1. Paid Tier Priority
        if (!paidKeys.isEmpty()) {
            for (int i = 0; i < paidKeys.size(); i++) {
                AiApiKey key = paidKeys.get((startIdx + i) % paidKeys.size());
                if (key.isAvailable()) return key;
            }
        }

        // 2. Free Tier Fallback (Load Balancing)
        if (!freeKeys.isEmpty()) {
            for (int i = 0; i < freeKeys.size(); i++) {
                AiApiKey key = freeKeys.get((startIdx + i) % freeKeys.size());
                if (key.isAvailable()) return key;
            }
        }

        log.warn("All API keys (Paid + Free) exhausted for today!");
        return null;
    }

    /**
     * Returns cached active key list (30s TTL via Caffeine).
     * Eliminates per-chunk full table scan.
     */
    @Cacheable(value = "apiKeyPool", key = "'active_keys'")
    public List<AiApiKey> getCachedActiveKeys() {
        return keyRepo.findByActiveTrueAndDeletedFalseOrderByPriorityAsc();
    }

    /** Evict cache when a key is updated */
    @CacheEvict(value = "apiKeyPool", allEntries = true)
    public void evictKeyCache() {
        log.debug("API key pool cache evicted");
    }

    /**
     * Gets next key's API key string. Falls back to null if none available.
     */
    public String getNextApiKeyString() {
        AiApiKey key = getNextAvailableKey();
        return key != null ? key.getApiKey() : null;
    }

    /**
     * Records a successful usage of a key.
     * REQUIRES_NEW: runs in its OWN transaction, independent of caller.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordUsage(UUID keyId) {
        try {
            keyRepo.incrementUsage(keyId, LocalDate.now().toString());
        } catch (Exception e) {
            log.warn("Failed to record usage for key {}: {}", keyId, e.getMessage());
        }
    }

    /**
     * Records an error on a key.
     * REQUIRES_NEW: runs in its OWN transaction so markExhausted always commits
     * even if the outer request transaction rolls back.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordError(UUID keyId, String errorMsg) {
        try {
            boolean isExhaustedOrInvalid = errorMsg != null && (errorMsg.contains("429") || errorMsg.contains("RESOURCE_EXHAUSTED") || errorMsg.contains("quota") || errorMsg.contains("Too Many") || errorMsg.contains("API_KEY_INVALID"));

            String tempErrorMsg = errorMsg;
            if (tempErrorMsg != null && tempErrorMsg.length() > 250) {
                tempErrorMsg = tempErrorMsg.substring(0, 247) + "...";
            }
            final String safeErrorMsg = tempErrorMsg;

            if (isExhaustedOrInvalid) {
                keyRepo.markExhausted(keyId, safeErrorMsg);
                log.warn("Key {} marked as exhausted (429/quota/invalid)", keyId);
                // Send alert to Admins
                keyRepo.findById(keyId).ifPresent(key -> {
                     String msg = String.format("API Key '%s' (%s tier) has hit its quota limits and was automatically disabled. The Smart Pool has shifted the load. Error: %s",
                             key.getKeyName(), key.isPaidTier() ? "PAID" : "FREE", safeErrorMsg);
                     notificationService.sendSystemAlertToSuperAdmins("API Key Exhausted: " + key.getKeyName(), msg, "API_LIMIT_ALERT");
                });
            } else {
                keyRepo.updateError(keyId, safeErrorMsg);
            }
        } catch (Exception e) {

            log.warn("Failed to record error for key {}: {}", keyId, e.getMessage());
        }
        evictKeyCache(); // Always evict cache after any key state change
    }

    /**
     * Returns all keys (for admin UI).
     */
    public List<AiApiKey> getAllKeys() {
        return keyRepo.findByDeletedFalseOrderByPriorityAsc();
    }

    /**
     * Resets daily counters at midnight.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void resetDailyCounters() {
        String today = LocalDate.now().toString();
        keyRepo.resetDailyCounters(today);
        log.info("Daily API key counters reset");
    }

    /**
     * Resets daily counters ONLY ONCE per day (via AtomicReference comparison).
     * Eliminates previous pattern of DB write on every single API request.
     */
    private void resetDailyCountersIfNeeded() {
        String today = LocalDate.now().toString();
        // compareAndSet: only one thread wins, rest are no-ops
        if (lastResetDate.compareAndSet("", today) || !today.equals(lastResetDate.get())) {
            if (lastResetDate.getAndSet(today).equals(today)) return; // already set by another thread
            keyRepo.resetDailyCounters(today);
            evictKeyCache(); // refresh cache after reset
            log.info("Daily API key counters reset for {}", today);
        }
    }

    /**
     * Get status summary for dashboard.
     */
    public java.util.Map<String, Object> getKeyPoolStatus() {
        List<AiApiKey> keys = getAllKeys();
        int totalKeys = keys.size();
        int activeKeys = (int) keys.stream().filter(AiApiKey::isActive).count();
        int availableKeys = (int) keys.stream().filter(AiApiKey::isAvailable).count();
        int totalRequestsToday = keys.stream().mapToInt(AiApiKey::getRequestsToday).sum();
        int totalDailyCapacity = keys.stream()
                .filter(AiApiKey::isActive)
                .mapToInt(k -> k.getDailyLimit() > 0 ? k.getDailyLimit() : 1500)
                .sum();

        return java.util.Map.of(
                "totalKeys", totalKeys,
                "activeKeys", activeKeys,
                "availableKeys", availableKeys,
                "requestsToday", totalRequestsToday,
                "dailyCapacity", totalDailyCapacity,
                "keys", keys
        );
    }
}
