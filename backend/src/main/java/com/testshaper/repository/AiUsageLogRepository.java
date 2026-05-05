package com.testshaper.repository;

import com.testshaper.entity.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, Long>, JpaSpecificationExecutor<AiUsageLog> {

    List<AiUsageLog> findAllByOrderByCreatedAtDesc();

    List<AiUsageLog> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT COUNT(a) FROM AiUsageLog a WHERE a.success = true")
    long countSuccessful();

    @Query("SELECT COALESCE(SUM(a.questionsCount), 0) FROM AiUsageLog a WHERE a.success = true")
    long totalQuestionsGenerated();

    @Query("SELECT COALESCE(SUM(a.totalTokens), 0) FROM AiUsageLog a WHERE a.success = true")
    long totalTokensUsed();

    @Query("SELECT COALESCE(SUM(a.totalTokens), 0) FROM AiUsageLog a WHERE a.success = true AND a.userId = :userId")
    long totalTokensUsedByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(a.costUsd), 0.0) FROM AiUsageLog a WHERE a.success = true")
    double totalCostUsd();

    @Query(value = "SELECT user_id AS userId, user_email AS userEmail, user_name AS userName, " +
           "COUNT(*) AS totalCalls, " +
           "COALESCE(SUM(questions_count), 0) AS totalQuestions, " +
           "COALESCE(SUM(total_tokens), 0) AS totalTokens, " +
           "COALESCE(SUM(cost_usd), 0.0) AS totalCost " +
           "FROM ai_usage_logs WHERE success = true " +
           "GROUP BY user_id, user_email, user_name ORDER BY totalCost DESC", nativeQuery = true)
    List<Map<String, Object>> getUserWiseSummary();

    @Query(value = "SELECT action AS action, " +
           "COUNT(*) AS totalCalls, " +
           "COALESCE(SUM(questions_count), 0) AS totalQuestions, " +
           "COALESCE(SUM(cost_usd), 0.0) AS totalCost " +
           "FROM ai_usage_logs WHERE success = true " +
           "GROUP BY action", nativeQuery = true)
    List<Map<String, Object>> getActionWiseSummary();

    @Query(value = "SELECT model_used AS name, " +
           "COALESCE(SUM(total_tokens), 0) AS value " +
           "FROM ai_usage_logs WHERE success = true " +
           "GROUP BY model_used", nativeQuery = true)
    List<Map<String, Object>> getModelWiseSummary();
}
