package com.testshaper.repository;

import com.testshaper.entity.CurriculumDocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CurriculumDocumentChunkRepository extends JpaRepository<CurriculumDocumentChunk, UUID> {
    
    List<CurriculumDocumentChunk> findByDocumentIdOrderByChunkIndexAsc(UUID documentId);
    List<CurriculumDocumentChunk> findByPageNumberIsNull();
    List<CurriculumDocumentChunk> findByMappedTopicId(UUID mappedTopicId);
    List<CurriculumDocumentChunk> findBySourceBookIndexId(UUID sourceBookIndexId);
    
    // Fetch latest context for Chatbot (limit 200 chunks ~ 500k chars ~ 125k tokens)
    List<CurriculumDocumentChunk> findTop200ByDocumentIsActiveTrueOrderByIdDesc();
    
    int countBySourceBookId(UUID sourceBookId);
    
    org.springframework.data.domain.Page<CurriculumDocumentChunk> findBySourceBookId(UUID sourceBookId, org.springframework.data.domain.Pageable pageable);
    
    int countBySourceBookIdAndMappedTopic_Chapter_IdIn(UUID sourceBookId, List<UUID> chapterIds);
    org.springframework.data.domain.Page<CurriculumDocumentChunk> findBySourceBookIdAndMappedTopic_Chapter_IdIn(UUID sourceBookId, List<UUID> chapterIds, org.springframework.data.domain.Pageable pageable);
    
    int countBySourceBookIndexIdIn(List<UUID> indexIds);
    org.springframework.data.domain.Page<CurriculumDocumentChunk> findBySourceBookIndexIdIn(List<UUID> indexIds, org.springframework.data.domain.Pageable pageable);
    
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("DELETE FROM CurriculumDocumentChunk c WHERE c.document.id = :documentId")
    void deleteByDocumentId(@org.springframework.data.repository.query.Param("documentId") UUID documentId);
    
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("DELETE FROM CurriculumDocumentChunk c WHERE c.sourceBookIndex.id = :sourceBookIndexId")
    void deleteBySourceBookIndexId(@org.springframework.data.repository.query.Param("sourceBookIndexId") UUID sourceBookIndexId);

    public interface ChunkStatsProjection {
        UUID getSourceBookId();
        long getVectorizedChunks();
    }

    @org.springframework.data.jpa.repository.Query("SELECT c.sourceBook.id AS sourceBookId, COUNT(c.id) AS vectorizedChunks " +
            "FROM CurriculumDocumentChunk c WHERE c.sourceBook.id IN :bookIds GROUP BY c.sourceBook.id")
    List<ChunkStatsProjection> getChunkStatsForBooks(@org.springframework.data.repository.query.Param("bookIds") java.util.List<UUID> bookIds);
}
