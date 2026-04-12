package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Tracks chunked PDF processing jobs.
 * Large PDFs are split into page-chunks, each processed separately.
 * Allows resume from last processed chunk.
 */
@Entity
@Table(name = "ai_processing_jobs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiProcessingJob extends BaseTenantEntity {

    @Column(name = "original_file_name", nullable = false)
    private String originalFileName;

    @Column(name = "stored_file_path")
    private String storedFilePath;

    @Column(name = "file_hash", length = 64)
    private String fileHash;

    @Column(name = "total_pages")
    private int totalPages;

    @Column(name = "pages_per_chunk")
    private int pagesPerChunk;

    @Column(name = "total_chunks")
    private int totalChunks;

    @Column(name = "processed_chunks")
    private int processedChunks;

    @Column(name = "current_chunk_start")
    private int currentChunkStart; // next page to process (1-indexed)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;

    @Column(name = "question_type")
    private String questionType;

    @Column(name = "total_questions_found")
    private int totalQuestionsFound;

    @Column(name = "total_processing_time_ms")
    private long totalProcessingTimeMs;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "last_error_chunk")
    private Integer lastErrorChunk;

    // Metadata detected from first chunk
    @Column(name = "detected_class")
    private String detectedClass;

    @Column(name = "detected_subject")
    private String detectedSubject;

    @Column(name = "detected_chapter")
    private String detectedChapter;

    // User-selected hierarchy IDs (from the picker before upload)
    @Column(name = "class_subject_id", length = 36)
    private String classSubjectId;  // UUID as string

    @Column(name = "chapter_id", length = 36)
    private String chapterId;

    @Column(name = "topic_id", length = 36)
    private String topicId;

    @Column(name = "custom_prompt", columnDefinition = "TEXT")
    private String customPrompt;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "user_name")
    private String userName;

    public enum JobStatus {
        PENDING,        // Created, not started
        PROCESSING,     // Currently processing a chunk
        PAUSED,         // Stopped mid-way (rate limit / error), can resume
        COMPLETED,      // All chunks processed
        FAILED          // Unrecoverable error
    }

    public double getProgressPercent() {
        if (totalChunks == 0) return 0;
        return (double) processedChunks / totalChunks * 100;
    }

    public boolean isResumable() {
        return status == JobStatus.PAUSED || status == JobStatus.FAILED;
    }
}
