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

        @Query("SELECT e FROM Exam e WHERE e.tenantId = :tenantId AND e.deleted = false " +
                        "AND (:title IS NULL OR LOWER(e.title) LIKE LOWER(CONCAT('%', :title, '%')))")
        Page<Exam> findByTenant(@Param("tenantId") String tenantId,
                        @Param("title") String title,
                        Pageable pageable);

        long countByTenantId(String tenantId);

        long countByCreatedBy(String createdBy);
}
