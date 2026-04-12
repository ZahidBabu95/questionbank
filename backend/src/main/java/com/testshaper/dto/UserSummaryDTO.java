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
    private Set<String> roles; // Only role names, NO permissions
    private LocalDateTime createdAt;
}
