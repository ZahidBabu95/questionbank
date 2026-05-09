package com.testshaper.repository;

import com.testshaper.entity.AiBulkExtractionJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiBulkExtractionJobRepository extends JpaRepository<AiBulkExtractionJob, UUID> {
    
    Optional<AiBulkExtractionJob> findFirstBySourceBookIdOrderByCreatedAtDesc(UUID sourceBookId);

    List<AiBulkExtractionJob> findByStatus(AiBulkExtractionJob.JobStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT j FROM AiBulkExtractionJob j WHERE j.createdAt = (SELECT MAX(j2.createdAt) FROM AiBulkExtractionJob j2 WHERE j2.sourceBook.id = j.sourceBook.id) AND j.sourceBook.id IN :bookIds")
    List<AiBulkExtractionJob> findLatestJobsForBooks(@org.springframework.data.repository.query.Param("bookIds") List<UUID> bookIds);
}
