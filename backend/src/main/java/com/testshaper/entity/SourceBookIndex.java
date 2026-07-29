package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "source_book_index")
@Getter
@Setter
public class SourceBookIndex extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_book_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"pages", "indices", "extractionJobs", "questionGenerationJobs", "topicExtractionJobs", "documentChunks"})
    private SourceBookMaster sourceBook;

    @Column(name = "index_name", nullable = false)
    private String indexName;

    @Column(name = "start_page")
    private Integer startPage;

    @Column(name = "end_page")
    private Integer endPage;

    @Column(name = "category_name")
    private String categoryName; // e.g., 'গদ্য', 'পদ্য'

    @Column(name = "author_name")
    private String authorName;

    // The Bridge: Mapping back to the Core Academic Hierarchy!
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mapped_chapter_id")
    private Chapter mappedChapter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mapped_topic_id")
    private Topic mappedTopic;
}
