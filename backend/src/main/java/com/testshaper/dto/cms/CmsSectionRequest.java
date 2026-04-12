package com.testshaper.dto.cms;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class CmsSectionRequest {
    private String sectionName;
    private Integer sortOrder;
    private String status;
    private List<ContentRequest> contents;

    @Data
    public static class ContentRequest {
        private String contentKey;
        private String contentValue;
        private String contentType;
    }
}
