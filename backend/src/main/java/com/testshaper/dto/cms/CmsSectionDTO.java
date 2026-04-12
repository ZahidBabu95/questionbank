package com.testshaper.dto.cms;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class CmsSectionDTO {
    private UUID id;
    private String sectionName;
    private String sectionKey;
    private String status;
    private Integer sortOrder;
    private List<ContentDTO> contents;

    @Data
    public static class ContentDTO {
        private String contentKey;
        private String contentValue;
        private String contentType;
    }
}
