package com.testshaper.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AttachmentResponseDTO {
    private UUID id;
    private UUID lectureId;
    private String title;
    private String description;
    private String fileName;
    private String filePath;
    private String fileType;
    private Long fileSize;
    private String externalUrl;
    private Integer attachmentOrder;
    private String uploadedBy;
    private LocalDateTime createdAt;
}
