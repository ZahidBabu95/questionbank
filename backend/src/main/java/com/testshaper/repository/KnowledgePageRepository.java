package com.testshaper.repository;

import com.testshaper.entity.KnowledgePage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

import java.util.Optional;

@Repository
public interface KnowledgePageRepository extends JpaRepository<KnowledgePage, UUID> {
    List<KnowledgePage> findBySourceBookIdOrderByPageNumberAsc(UUID sourceBookId);
    long countBySourceBookIndexId(UUID sourceBookIndexId);
    List<KnowledgePage> findBySourceBookIndexId(UUID sourceBookIndexId);
    
    long countBySourceBookId(UUID sourceBookId);
    long countBySourceBookIdAndExtractionStatus(UUID sourceBookId, KnowledgePage.ExtractionStatus status);
    
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(p) FROM KnowledgePage p WHERE p.sourceBook.id = :sourceBookId AND p.goldenMarkdown IS NOT NULL AND TRIM(p.goldenMarkdown) != ''")
    long countGoldenPagesBySourceBookId(@org.springframework.data.repository.query.Param("sourceBookId") UUID sourceBookId);

    Optional<KnowledgePage> findFirstBySourceBookIdAndExtractionStatusOrderByPageNumberAsc(UUID sourceBookId, KnowledgePage.ExtractionStatus status);
    
    org.springframework.data.domain.Page<KnowledgePage> findBySourceBookIdAndExtractionStatus(UUID sourceBookId, KnowledgePage.ExtractionStatus status, org.springframework.data.domain.Pageable pageable);
}
