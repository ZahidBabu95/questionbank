package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "source_book_master")
@Getter
@Setter
public class SourceBookMaster extends BaseTenantEntity {

    @Column(nullable = false)
    private String title;

    @Column(name = "author_name", columnDefinition = "TEXT")
    private String authorName; // Can store multiple authors (e.g., Dr. Ali Asgar, Dr. Shahjahan Tapan)

    private String publisher;

    @Column(name = "cover_image_url", columnDefinition = "TEXT")
    private String coverImageUrl;

    @Column(name = "language")
    private String language = "Bangla";

    @Column(name = "first_published")
    private String firstPublished; // e.g., "September 2012"

    @Column(name = "latest_edition")
    private String latestEdition; // e.g., "October 2025"

    @Enumerated(EnumType.STRING)
    @Column(name = "book_type", nullable = false)
    private BookType bookType = BookType.TEXTBOOK;

    @Column(name = "pdf_page_offset", nullable = false)
    private Integer pdfPageOffset = 0;

    @Column(name = "is_processing", nullable = false)
    private Boolean isProcessing = false;

    @Column(name = "total_pages_to_process", nullable = false)
    private Integer totalPagesToProcess = 0;

    @Column(name = "processed_pages_count", nullable = false)
    private Integer processedPagesCount = 0;

    // Bridge for entire book (e.g. Higher Math 1st paper for Class 11-12)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_subject_id")
    private ClassSubject classSubject;

    @OneToMany(mappedBy = "sourceBook", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<KnowledgePage> pages = new ArrayList<>();

    @OneToMany(mappedBy = "sourceBook", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SourceBookIndex> indices = new ArrayList<>();

    @OneToMany(mappedBy = "sourceBook", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AiBulkExtractionJob> extractionJobs = new ArrayList<>();

    @OneToMany(mappedBy = "sourceBook", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AiQuestionGenerationJob> questionGenerationJobs = new ArrayList<>();

    public enum BookType {
        TEXTBOOK, GUIDE, QUESTION_BANK, LECTURE_SHEET, SUPPLEMENTARY
    }
}
