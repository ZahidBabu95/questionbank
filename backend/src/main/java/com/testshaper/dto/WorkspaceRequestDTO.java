package com.testshaper.dto;

import lombok.Data;

import java.util.Set;
import java.util.UUID;

@Data
public class WorkspaceRequestDTO {
    private String medium;
    private UUID packageId;
    private Set<UUID> subjectIds;
}
