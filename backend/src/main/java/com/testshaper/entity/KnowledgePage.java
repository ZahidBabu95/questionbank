package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "knowledge_pages")
@Getter
@Setter
public class KnowledgePage extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_book_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"pages", "indices", "extractionJobs", "questionGenerationJobs", "topicExtractionJobs", "documentChunks"})
    private SourceBookMaster sourceBook;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_book_index_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"sourceBook"})
    private SourceBookIndex sourceBookIndex; // Can be null until AI categorizes it

    @Column(name = "page_number", nullable = false)
    private Integer pageNumber;

    @Column(name = "r2_file_path", nullable = false)
    private String r2FilePath;  // Cloudflare R2 object key

    @Column(name = "is_pub_info")
    private Boolean isPubInfo = false;

    @Column(name = "is_toc_page")
    private Boolean isTocPage = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "extraction_status", nullable = false)
    private ExtractionStatus extractionStatus = ExtractionStatus.PENDING;

    @Column(name = "extracted_markdown", columnDefinition = "LONGTEXT")
    private String extractedMarkdown;

    @Column(name = "golden_markdown", columnDefinition = "LONGTEXT")
    private String goldenMarkdown;

    @Column(name = "pinecone_vector_id")
    private String pineconeVectorId;

    public enum ExtractionStatus {
        PENDING, EXTRACTED, PROOFREAD, PRE_VECTORIZED, GOLDEN_VECTORIZED, FAILED
    }
}
