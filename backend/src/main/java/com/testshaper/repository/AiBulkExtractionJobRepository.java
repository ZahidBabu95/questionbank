package com.testshaper.repository;

import com.testshaper.entity.AiBulkExtractionJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiBulkExtractionJobRepository extends JpaRepository<AiBulkExtractionJob, UUID> {
    
    Optional<AiBulkExtractionJob> findBySourceBookId(UUID sourceBookId);

    List<AiBulkExtractionJob> findByStatus(AiBulkExtractionJob.JobStatus status);
}
