package com.testshaper.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ClassSubjectDTO {
    private UUID classSubjectId;
    private UUID subjectId;
    private String subjectName;
    private String subjectCode;
    private String subjectDescription;
    private UUID sessionId;
    private String sessionName;
    private boolean isActive;
}
