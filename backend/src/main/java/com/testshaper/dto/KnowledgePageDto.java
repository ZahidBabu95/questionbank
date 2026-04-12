package com.testshaper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgePageDto {
    private UUID id;
    private UUID sourceBookId;
    private UUID sourceBookIndexId;  // Which chapter index this page is assigned to (nullable)
    private Integer sourcePageNo;
    private Integer actualPageNo;
    private String imageUrl;
    private String extractionStatus;
    private String extractedMarkdown;
    private String goldenMarkdown;   // Phase 3B: curated/approved content
    private boolean isGolden;        // Phase 3B: true when status == PROOFREAD or GOLDEN_VECTORIZED
    private Boolean isPubInfo;
    private Boolean isTocPage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
