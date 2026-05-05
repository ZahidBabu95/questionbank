package com.testshaper.repository;

import com.testshaper.entity.Exam;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ExamRepository extends JpaRepository<Exam, UUID> {

        @Query("SELECT e FROM Exam e WHERE (:tenantId = 'DEFAULT' OR e.tenantId = :tenantId) AND e.deleted = false " +
                        "AND (:title IS NULL OR LOWER(e.title) LIKE LOWER(CONCAT('%', :title, '%'))) " +
                        "AND (:createdBy IS NULL OR e.createdBy = :createdBy) " +
                        "AND (:examType IS NULL OR e.examType = :examType) " +
                        "AND (:status IS NULL OR e.status = :status)")
        Page<Exam> findByTenantAndOptionalCreator(@Param("tenantId") String tenantId,
                        @Param("title") String title,
                        @Param("createdBy") String createdBy,
                        @Param("examType") Exam.ExamType examType,
                        @Param("status") Exam.ExamStatus status,
                        Pageable pageable);

        long countByTenantId(String tenantId);

        long countByCreatedBy(String createdBy);

        long countByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);
        long countByTenantIdAndCreatedAtBetween(String tenantId, java.time.LocalDateTime start, java.time.LocalDateTime end);
        long countByCreatedByAndCreatedAtBetween(String createdBy, java.time.LocalDateTime start, java.time.LocalDateTime end);
}
