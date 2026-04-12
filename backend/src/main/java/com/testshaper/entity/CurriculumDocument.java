package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Stores curriculum documents (PDFs, guidelines) organized by year.
 * These serve as the knowledge base for AI question generation.
 * Only SUPER_ADMIN can manage these documents.
 */
@Entity
@Table(name = "curriculum_documents")
@Getter
@Setter
public class CurriculumDocument extends BaseTenantEntity {

    @Column(nullable = false)
    private String title; // e.g., "NCTB পাঠ্যক্রম নির্দেশনা ২০২৬"

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "academic_year", nullable = false)
    private Integer academicYear; // e.g., 2026

    @Column(name = "education_level", columnDefinition = "TEXT")
    private String educationLevel; // SSC, HSC, PRIMARY, JSC

    @Column(name = "subject_name", columnDefinition = "TEXT")
    private String subjectName; // e.g., "বাংলা", "পদার্থবিজ্ঞান"

    @Column(name = "class_name", columnDefinition = "TEXT")
    private String className; // e.g., "ষষ্ঠ শ্রেণি"

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false)
    private DocType docType;

    @Column(name = "file_path", nullable = false)
    private String filePath; // stored file path

    @Column(name = "file_name")
    private String fileName; // original file name

    @Column(name = "file_size")
    private Long fileSize; // in bytes

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "uploaded_by")
    private String uploadedBy;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "vision_enabled")
    private Boolean visionEnabled = false; // Trigger Multimodal Gemini OCR

    @Column(name = "tags", columnDefinition = "TEXT")
    private String tags; // comma-separated tags for searchability

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes; // admin notes about this document

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status")
    private ProcessingStatus processingStatus = ProcessingStatus.PENDING;

    @Column(name = "total_chunks")
    private Integer totalChunks = 0;

    @Column(name = "processed_chunks")
    private Integer processedChunks = 0;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    public enum ProcessingStatus {
        PENDING, PROCESSING, COMPLETED, FAILED
    }

    public enum DocType {
        CURRICULUM,          // কারিকুলাম
        SYLLABUS,           // সিলেবাস
        QUESTION_GUIDELINE, // প্রশ্ন তৈরির নির্দেশনা
        MARK_DISTRIBUTION,  // নম্বর বণ্টন
        SAMPLE_PAPER,       // নমুনা প্রশ্নপত্র
        TEXTBOOK,           // পাঠ্যবই
        GUIDE_BOOK,         // গাইড বই
        OTHER               // অন্যান্য
    }
}
