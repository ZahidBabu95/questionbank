package com.testshaper.repository;

import com.testshaper.entity.AiApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiApiKeyRepository extends JpaRepository<AiApiKey, UUID> {

    List<AiApiKey> findByActiveTrueAndDeletedFalseOrderByPriorityAsc();

    List<AiApiKey> findByDeletedFalseOrderByPriorityAsc();

    @Modifying
    @Transactional
    @Query("UPDATE AiApiKey k SET k.requestsToday = 0, k.lastResetDate = :today WHERE k.lastResetDate != :today OR k.lastResetDate IS NULL")
    void resetDailyCounters(String today);

    @Modifying
    @Transactional
    @Query("UPDATE AiApiKey k SET k.requestsToday = k.requestsToday + 1, k.totalRequests = k.totalRequests + 1, k.lastUsedAt = CURRENT_TIMESTAMP, k.lastError = NULL, k.lastResetDate = :today WHERE k.id = :keyId")
    void incrementUsage(UUID keyId, String today);

    @Modifying
    @Transactional
    @Query("UPDATE AiApiKey k SET k.lastError = :error, k.lastUsedAt = CURRENT_TIMESTAMP WHERE k.id = :keyId")
    void updateError(UUID keyId, String error);

    @Modifying
    @Transactional
    @Query("UPDATE AiApiKey k SET k.requestsToday = 999999, k.lastError = :error, k.lastUsedAt = CURRENT_TIMESTAMP WHERE k.id = :keyId")
    void markExhausted(UUID keyId, String error);
}
