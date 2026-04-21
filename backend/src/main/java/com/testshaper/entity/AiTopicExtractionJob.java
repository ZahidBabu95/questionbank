package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "ai_topic_extraction_jobs")
@Getter
@Setter
public class AiTopicExtractionJob extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_book_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private SourceBookMaster sourceBook;

    @Column(name = "total_chapters_to_process")
    private int totalChaptersToProcess = 0;

    @Column(name = "processed_chapters_count")
    private int processedChaptersCount = 0;

    @Column(name = "failed_chapters_count")
    private int failedChaptersCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status = JobStatus.QUEUED;

    public enum JobStatus {
        QUEUED, 
        IN_PROGRESS, 
        PAUSED, 
        COMPLETED, 
        CANCELLED
    }
}
