package com.testshaper.dto.billing;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
public class BillingPackageDTO {
    private UUID id;
    private String name;
    private String packageCode;
    private String description;
    private BigDecimal price;
    private String currency;
    private String billingCycle;
    private String status;
    private Integer maxTeachers;
    private Integer maxStudents;
    private Integer maxQuestions;
    private Integer maxExamsPerMonth;
    private Integer maxLectures;
    private Integer aiLimitPerMonth;
    private Integer storageLimitMb;
    private Map<String, Boolean> featureFlags;
    private Map<String, Object> pricingRules;
    private String displayName;
    private String highlightBadge;
    private Integer sortOrder;
    private String associatedRole;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}