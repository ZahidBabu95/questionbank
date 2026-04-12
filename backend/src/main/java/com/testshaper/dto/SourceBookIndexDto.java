package com.testshaper.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class SourceBookIndexDto {
    private UUID id;
    private UUID sourceBookId;
    private String indexName;
    private Integer startPage;
    private Integer endPage;
    private String categoryName;
    private String authorName;
    private UUID mappedChapterId;
    private UUID mappedTopicId;
    private long pageCount; // Number of KnowledgePages assigned to this chapter index
}
