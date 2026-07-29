package com.testshaper.repository;

import com.testshaper.entity.QuestionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionAuditLogRepository extends JpaRepository<QuestionAuditLog, UUID> {

    List<QuestionAuditLog> findByQuestionIdOrderByCreatedAtDesc(UUID questionId);

    List<QuestionAuditLog> findByReviewerIdOrderByCreatedAtDesc(UUID reviewerId);

    @Query("SELECT COUNT(l) FROM QuestionAuditLog l WHERE l.reviewer.id = :reviewerId AND l.action = :action")
    long countByReviewerIdAndAction(@Param("reviewerId") UUID reviewerId, @Param("action") String action);

    @Query("SELECT AVG(l.timeSpentSeconds) FROM QuestionAuditLog l WHERE l.reviewer.id = :reviewerId AND l.timeSpentSeconds IS NOT NULL")
    Double findAverageTimeSpentSecondsByReviewerId(@Param("reviewerId") UUID reviewerId);
}
