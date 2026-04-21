package com.testshaper.repository;

import com.testshaper.entity.AiTopicExtractionJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface AiTopicExtractionJobRepository extends JpaRepository<AiTopicExtractionJob, UUID> {
    Optional<AiTopicExtractionJob> findTopBySourceBookIdOrderByCreatedAtDesc(UUID sourceBookId);
    List<AiTopicExtractionJob> findByStatusIn(List<AiTopicExtractionJob.JobStatus> statuses);
    Optional<AiTopicExtractionJob> findTopByStatusOrderByCreatedAtAsc(AiTopicExtractionJob.JobStatus status);
}
