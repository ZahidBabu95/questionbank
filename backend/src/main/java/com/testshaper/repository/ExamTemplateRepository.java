package com.testshaper.repository;

import com.testshaper.entity.ExamTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExamTemplateRepository extends JpaRepository<ExamTemplate, UUID> {
    
    @Query("SELECT e FROM ExamTemplate e WHERE (e.tenantId = :tenantId OR e.tenantId = 'DEFAULT' OR e.isGlobal = true) AND e.deleted = false")
    List<ExamTemplate> findAvailableTemplates(String tenantId);
}
