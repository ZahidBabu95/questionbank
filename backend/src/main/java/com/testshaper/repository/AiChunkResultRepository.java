package com.testshaper.repository;

import com.testshaper.entity.AiChunkResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiChunkResultRepository extends JpaRepository<AiChunkResult, UUID> {

    List<AiChunkResult> findByJobIdOrderByChunkNumber(UUID jobId);

    void deleteByJobId(UUID jobId);

    int countByJobId(UUID jobId);
    
    boolean existsByJobIdAndChunkNumber(UUID jobId, int chunkNumber);
}
