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
    Optional<KnowledgePage> findFirstBySourceBookIdOrderByPageNumberDesc(UUID sourceBookId);
    long countBySourceBookIndexId(UUID sourceBookIndexId);
    List<KnowledgePage> findBySourceBookIndexId(UUID sourceBookIndexId);
    
    long countBySourceBookId(UUID sourceBookId);
    long countBySourceBookIdAndExtractionStatus(UUID sourceBookId, KnowledgePage.ExtractionStatus status);
    
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(p) FROM KnowledgePage p WHERE p.sourceBook.id = :sourceBookId AND p.goldenMarkdown IS NOT NULL AND TRIM(p.goldenMarkdown) != ''")
    long countGoldenPagesBySourceBookId(@org.springframework.data.repository.query.Param("sourceBookId") UUID sourceBookId);

    Optional<KnowledgePage> findFirstBySourceBookIdAndExtractionStatusOrderByPageNumberAsc(UUID sourceBookId, KnowledgePage.ExtractionStatus status);
    
    org.springframework.data.domain.Page<KnowledgePage> findBySourceBookIdAndExtractionStatus(UUID sourceBookId, KnowledgePage.ExtractionStatus status, org.springframework.data.domain.Pageable pageable);
    
    long countBySourceBookIdAndExtractionStatusIn(UUID sourceBookId, java.util.Collection<KnowledgePage.ExtractionStatus> statuses);
    
    org.springframework.data.domain.Page<KnowledgePage> findBySourceBookIdAndExtractionStatusIn(UUID sourceBookId, java.util.Collection<KnowledgePage.ExtractionStatus> statuses, org.springframework.data.domain.Pageable pageable);

    public interface KnowledgePageStatsProjection {
        UUID getSourceBookId();
        long getTotalPages();
        long getExtractedPages();
        long getGoldenPages();
    }

    @org.springframework.data.jpa.repository.Query("SELECT p.sourceBook.id AS sourceBookId, " +
            "COUNT(p.id) AS totalPages, " +
            "SUM(CASE WHEN p.extractionStatus = :extractedStatus THEN 1 ELSE 0 END) AS extractedPages, " +
            "SUM(CASE WHEN p.goldenMarkdown IS NOT NULL AND TRIM(p.goldenMarkdown) != '' THEN 1 ELSE 0 END) AS goldenPages " +
            "FROM KnowledgePage p WHERE p.sourceBook.id IN :bookIds GROUP BY p.sourceBook.id")
    List<KnowledgePageStatsProjection> getStatsForBooks(
            @org.springframework.data.repository.query.Param("bookIds") java.util.List<UUID> bookIds, 
            @org.springframework.data.repository.query.Param("extractedStatus") KnowledgePage.ExtractionStatus extractedStatus);
}
