package com.testshaper.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AiKnowledgeBaseDTO {
    private UUID id;
    private String title;
    private String content;
    private String tags;
    private boolean isActive;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
