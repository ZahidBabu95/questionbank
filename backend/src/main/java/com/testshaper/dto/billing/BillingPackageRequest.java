package com.testshaper.dto.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;

@Data
public class BillingPackageRequest {
    @NotBlank(message = "Package name is required")
    private String name;

    @NotBlank(message = "Package code is required")
    private String packageCode;

    private String description;

    @NotNull(message = "Price is required")
    private BigDecimal price;

    private String currency = "USD";

    @NotBlank(message = "Billing cycle is required")
    private String billingCycle;

    private String status = "ACTIVE";

    private Integer maxTeachers;
    private Integer maxStudents;
    private Integer maxQuestions;
    private Integer maxExamsPerMonth;
    private Integer maxLectures;
    private Integer aiLimitPerMonth;
    private Integer storageLimitMb;

    private Map<String, Boolean> featureFlags;

    private String displayName;
    private String highlightBadge;
    private Integer sortOrder = 0;
}
