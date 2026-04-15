package com.testshaper.repository;

import com.testshaper.entity.AiQuestionGenerationJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiQuestionGenerationJobRepository extends JpaRepository<AiQuestionGenerationJob, UUID> {
    Optional<AiQuestionGenerationJob> findBySourceBookId(UUID sourceBookId);
    List<AiQuestionGenerationJob> findByStatus(AiQuestionGenerationJob.JobStatus status);
}
