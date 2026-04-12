package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Tracks every file uploaded through AI question scraping/generation.
 * Stores file reference, hash for duplicate detection, and processing results.
 */
@Entity
@Table(name = "ai_upload_history")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiUploadHistory extends BaseTenantEntity {

    @Column(name = "original_file_name", nullable = false)
    private String originalFileName;

    @Column(name = "stored_file_path")
    private String storedFilePath; // path in storage (local or cloud)

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "file_hash", length = 64)
    private String fileHash; // SHA-256 for duplicate detection

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private ActionType actionType;

    @Column(name = "question_type")
    private String questionType; // MCQ, CQ, SHORT

    @Column(name = "questions_extracted")
    private Integer questionsExtracted;

    @Column(name = "processing_time_ms")
    private Long processingTimeMs;

    @Column(name = "success")
    private boolean success;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    // Metadata extracted by AI
    @Column(name = "detected_class")
    private String detectedClass;

    @Column(name = "detected_subject")
    private String detectedSubject;

    @Column(name = "detected_chapter")
    private String detectedChapter;

    @Column(name = "uploaded_by_email")
    private String uploadedByEmail;

    @Column(name = "uploaded_by_name")
    private String uploadedByName;

    @Column(name = "is_duplicate")
    private boolean isDuplicate;

    @Column(name = "duplicate_of_id", length = 36)
    private String duplicateOfId; // ID of the original upload if duplicate

    // Auto-linked to curriculum
    @Column(name = "auto_saved_to_curriculum")
    private boolean autoSavedToCurriculum;

    /**
     * Cached AI scrape result JSON (questions + metadata).
     * Stored on successful scrape for instant cache-hit on duplicate uploads.
     * Avoids re-calling AI API for identical files.
     */
    @Column(name = "cached_result_json", columnDefinition = "LONGTEXT")
    private String cachedResultJson;

    public enum ActionType {
        SCRAPE,    // PDF/Image → extract questions
        GENERATE   // Topic-based generation (may have reference file)
    }
}
