package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "ai_question_generation_jobs")
@Getter
@Setter
public class AiQuestionGenerationJob extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_book_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private SourceBookMaster sourceBook;

    @Column(name = "total_pages_to_process")
    private int totalPagesToProcess = 0;

    @Column(name = "processed_pages_count")
    private int processedPagesCount = 0;

    @Column(name = "failed_pages_count")
    private int failedPagesCount = 0;

    @Column(name = "total_questions_generated")
    private int totalQuestionsGenerated = 0;

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
