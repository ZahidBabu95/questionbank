package com.testshaper.repository;

import com.testshaper.entity.CurriculumDocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CurriculumDocumentChunkRepository extends JpaRepository<CurriculumDocumentChunk, UUID> {
    
    List<CurriculumDocumentChunk> findByDocumentIdOrderByChunkIndexAsc(UUID documentId);
    
    // Fetch latest context for Chatbot (limit 200 chunks ~ 500k chars ~ 125k tokens)
    List<CurriculumDocumentChunk> findTop200ByDocumentIsActiveTrueOrderByIdDesc();
    
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    void deleteByDocumentId(UUID documentId);
}
