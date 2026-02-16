package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "institutes")
@Getter
@Setter
public class Institute extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "short_name")
    private String shortName;

    @Column(nullable = false, unique = true)
    private String code; // e.g., INST-001

    @Enumerated(EnumType.STRING)
    private InstituteType type;

    private String eiin;

    private String address;
    private String city;
    private String district;
    private String division;
    private String country;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    private String website;

    @Column(name = "logo_path")
    private String logoPath;

    @Column(name = "established_year")
    private Integer establishedYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InstituteStatus status = InstituteStatus.ACTIVE;

    // Subscription
    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type")
    private SubscriptionPlan planType = SubscriptionPlan.FREE;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle")
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    @Column(name = "plan_start_date")
    private java.time.LocalDate planStartDate;

    @Column(name = "plan_end_date")
    private java.time.LocalDate planEndDate;

    @Column(name = "grace_period_days")
    private int gracePeriodDays = 7;

    @Column(name = "max_teachers")
    private int maxTeachers = 5;

    @Column(name = "max_students")
    private int maxStudents = 50;

    // AI & Storage Limits
    @Column(name = "ai_limit_per_month")
    private int aiLimitPerMonth = 100;

    @Column(name = "ai_used_current_month")
    private int aiUsedCurrentMonth = 0;

    @Column(name = "storage_limit_mb")
    private int storageLimitMb = 500;

    @Column(name = "storage_used_mb")
    private double storageUsedMb = 0.0;

    @Column(name = "expiry_date")
    private java.time.LocalDate expiryDate;

    public enum InstituteType {
        SCHOOL, COLLEGE, UNIVERSITY, COACHING
    }

    public enum InstituteStatus {
        ACTIVE, INACTIVE, SUSPENDED
    }

    public enum SubscriptionPlan {
        FREE, BASIC, PREMIUM, ENTERPRISE
    }

    public enum BillingCycle {
        MONTHLY, YEARLY
    }
}
