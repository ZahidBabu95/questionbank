package com.testshaper.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ClassSubjectDTO {
    private UUID classSubjectId;
    
    // Subject Info
    private UUID subjectId;
    private String subjectName;
    private String subjectCode;
    private String subjectPaper;
    private boolean isEnglishVersion;
    
    // Session Info
    private UUID sessionId;
    private String sessionName;
    
    // Group Info (Nullable for lower classes)
    private UUID groupId;
    private String groupName;
    private Integer order;
    
    private boolean isActive;
}
