package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;

@Entity
@Table(name = "billing_packages", indexes = {
    @Index(name = "idx_package_code", columnList = "package_code", unique = true),
    @Index(name = "idx_package_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
public class BillingPackage extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "package_code", nullable = false, unique = true)
    private String packageCode;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false, length = 10)
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false)
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PackageStatus status = PackageStatus.ACTIVE;

    // Limits
    @Column(name = "max_teachers")
    private Integer maxTeachers;

    @Column(name = "max_students")
    private Integer maxStudents;

    @Column(name = "max_questions")
    private Integer maxQuestions;

    @Column(name = "max_exams_per_month")
    private Integer maxExamsPerMonth;

    @Column(name = "max_lectures")
    private Integer maxLectures;

    @Column(name = "ai_limit_per_month")
    private Integer aiLimitPerMonth;

    @Column(name = "storage_limit_mb")
    private Integer storageLimitMb;

    // Features
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "feature_flags", columnDefinition = "json")
    private Map<String, Boolean> featureFlags;

    // Marketing fields
    @Column(name = "display_name")
    private String displayName;

    @Column(name = "highlight_badge")
    private String highlightBadge;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(name = "associated_role", nullable = false)
    private String associatedRole;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pricing_rules", columnDefinition = "json")
    private Map<String, Object> pricingRules;

    public enum BillingCycle {
        MONTHLY, YEARLY
    }

    public enum PackageStatus {
        ACTIVE, INACTIVE
    }
}
