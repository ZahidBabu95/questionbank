package com.testshaper.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ExamTemplateDTO {
    private UUID id;
    private String templateName;
    private boolean isGlobal;
    private String structureJson;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
