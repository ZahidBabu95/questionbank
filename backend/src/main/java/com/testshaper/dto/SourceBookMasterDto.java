package com.testshaper.dto;

import com.testshaper.entity.SourceBookMaster;
import lombok.Data;

import java.util.UUID;

@Data
public class SourceBookMasterDto {
    private UUID id;
    private String title;
    private String authorName;
    private String publisher;
    private String coverImageUrl;
    private String language;
    private String firstPublished;
    private String latestEdition;
    private SourceBookMaster.BookType bookType;
    private Integer pdfPageOffset;
    private UUID classSubjectId;
    private String mappedSubjectName;
    private String mappedClassName;
    
    // Page Progress Tracking
    private Integer totalPages;
    private Integer extractedPages;
    private Integer goldenPages;

    // Background Processing Tracking
    private Boolean isProcessing;
    private Integer totalPagesToProcess;
    private Integer processedPagesCount;
}
