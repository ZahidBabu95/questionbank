package com.testshaper.repository;

import com.testshaper.entity.QuestionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface QuestionTypeRepository extends JpaRepository<QuestionType, UUID> {
    Optional<QuestionType> findByCode(String code);
    List<QuestionType> findByCodeIn(java.util.Collection<String> codes);
    List<QuestionType> findByTenantIdOrTenantId(String tenantId, String defaultTenantId);
}
