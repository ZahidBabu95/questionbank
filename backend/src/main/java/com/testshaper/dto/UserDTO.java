package com.testshaper.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
public class UserDTO {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String profileImageUrl;
    private boolean active;
    private int failedLoginAttempts;
    private boolean accountLocked;
    private int contributionPoints;
    private UUID instituteId;
    private String instituteName;
    private String instituteMedium;
    private String instituteStatus;
    private Set<String> roles;
    private Set<String> permissions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
