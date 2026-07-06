package com.testshaper.repository;

import com.testshaper.entity.AiKnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AiKnowledgeBaseRepository extends JpaRepository<AiKnowledgeBase, UUID> {
    List<AiKnowledgeBase> findByIsActiveTrue();
    List<AiKnowledgeBase> findByTagsContaining(String tag);
    List<AiKnowledgeBase> findByIsActiveTrueAndTagsContaining(String tag);

    @org.springframework.data.jpa.repository.Query(
        "SELECT k FROM AiKnowledgeBase k WHERE k.isActive = true " +
        "AND k.tags LIKE '%TARGET_RULE%' " +
        "AND k.tags LIKE %:subjectTag%"
    )
    List<AiKnowledgeBase> findActiveCurriculumRules(@org.springframework.data.repository.query.Param("subjectTag") String subjectTag);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM AiKnowledgeBase k WHERE k.id = :id")
    void deleteByIdDirectly(@org.springframework.data.repository.query.Param("id") java.util.UUID id);
}
