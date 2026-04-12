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
    private Integer pdfPageOffset = 0; // Number of pages to add to TOC page number to get exact PDF page. e.g. TOC says pg 1 is at PDF pg 6, so offset is 5.

    // Bridge for entire book (e.g. Higher Math 1st paper for Class 11-12)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_subject_id")
    private ClassSubject classSubject;

    @OneToMany(mappedBy = "sourceBook", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<KnowledgePage> pages = new ArrayList<>();

    @OneToMany(mappedBy = "sourceBook", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SourceBookIndex> indices = new ArrayList<>();

    public enum BookType {
        TEXTBOOK, GUIDE, QUESTION_BANK, LECTURE_SHEET, SUPPLEMENTARY
    }
}
