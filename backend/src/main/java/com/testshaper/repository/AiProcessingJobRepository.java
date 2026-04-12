package com.testshaper.repository;

import com.testshaper.entity.AiProcessingJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiProcessingJobRepository extends JpaRepository<AiProcessingJob, UUID> {

    List<AiProcessingJob> findByDeletedFalseOrderByCreatedAtDesc();

    List<AiProcessingJob> findByUpdatedAtBeforeAndDeletedFalse(java.time.LocalDateTime cutoff);

    List<AiProcessingJob> findByStatusInAndDeletedFalseOrderByCreatedAtDesc(
            List<AiProcessingJob.JobStatus> statuses);

    List<AiProcessingJob> findByUserEmailAndDeletedFalseOrderByCreatedAtDesc(String email);
}
