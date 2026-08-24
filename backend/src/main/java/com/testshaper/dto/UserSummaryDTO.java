package com.testshaper.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * A lightweight DTO for listing users (no heavy permissions array fetched).
 * Used for Paginated tabular and list views.
 */
@Data
public class UserSummaryDTO {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String profileImageUrl;
    private boolean active;
    private boolean accountLocked;
    private int failedLoginAttempts;
    private UUID instituteId;
    private String instituteName;
    private String instituteNameEn;
    private String instituteNameBn;
    private String instituteBranches;
    private String userInstituteBranches;
    private Set<String> roles; // Only role names, NO permissions
    private String studentRoll;
    private UUID classId;
    private String className;
    private Set<UUID> assignedSubjectIds;
    private LocalDateTime createdAt;
}
