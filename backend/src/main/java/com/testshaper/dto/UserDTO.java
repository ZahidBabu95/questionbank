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
    private String instituteNameEn;
    private String instituteNameBn;
    private String instituteBranches;
    private String userInstituteBranches;
    private String instituteMedium;
    private String instituteStatus;
    private String subscriptionPackage;
    
    // Institute subscription and usage limits
    private Integer maxTeachers;
    private Integer maxStudents;
    private Integer maxBranches;
    private Integer maxQuestions;
    private Integer questionsUsedCurrentMonth;
    private Integer aiLimitPerMonth;
    private Integer aiUsedCurrentMonth;
    private Integer storageLimitMb;
    private Double storageUsedMb;
    private String planType;
    private String billingCycle;
    private java.time.LocalDate planStartDate;
    private java.time.LocalDate planEndDate;
    private java.time.LocalDate expiryDate;

    private String studentRoll;
    private UUID classId;
    private String className;

    private Set<String> roles;
    private Set<String> permissions;
    private Set<UUID> assignedSubjectIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
