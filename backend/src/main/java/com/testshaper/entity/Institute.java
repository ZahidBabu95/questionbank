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

    @Column(name = "medium")
    private String medium = "Bangla"; // Bangla, English, Bilingual

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
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_id")
    private BillingPackage subscriptionPackage;

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
    private Integer gracePeriodDays = 7;

    @Column(name = "max_teachers")
    private Integer maxTeachers = 5;

    @Column(name = "max_students")
    private Integer maxStudents = 50;

    @Column(name = "max_questions")
    private Integer maxQuestions = 500;

    @Column(name = "questions_used_current_month")
    private Integer questionsUsedCurrentMonth = 0;

    // AI & Storage Limits
    @Column(name = "ai_limit_per_month")
    private Integer aiLimitPerMonth = 100000; // Represents Total AI Prompt/Completion Tokens

    @Column(name = "ai_used_current_month")
    private Integer aiUsedCurrentMonth = 0;

    @Column(name = "storage_limit_mb")
    private Integer storageLimitMb = 500;

    @Column(name = "storage_used_mb")
    private Double storageUsedMb = 0.0;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "institute_class_subjects",
            joinColumns = @JoinColumn(name = "institute_id"),
            inverseJoinColumns = @JoinColumn(name = "class_subject_id"))
    private java.util.Set<ClassSubject> assignedSubjects = new java.util.HashSet<>();

    @Column(name = "expiry_date")
    private java.time.LocalDate expiryDate;

    @PrePersist
    @PreUpdate
    @PostLoad
    public void ensureDefaults() {
        if (maxQuestions == null) maxQuestions = 500;
        if (questionsUsedCurrentMonth == null) questionsUsedCurrentMonth = 0;
        if (aiLimitPerMonth == null) aiLimitPerMonth = 100000;
        if (aiUsedCurrentMonth == null) aiUsedCurrentMonth = 0;
        if (storageLimitMb == null) storageLimitMb = 500;
        if (storageUsedMb == null) storageUsedMb = 0.0;
        if (gracePeriodDays == null) gracePeriodDays = 7;
        if (maxTeachers == null) maxTeachers = 5;
        if (maxStudents == null) maxStudents = 50;
    }

    public enum InstituteType {
        SCHOOL, COLLEGE, UNIVERSITY, COACHING, PERSONAL
    }

    public enum InstituteStatus {
        ACTIVE, INACTIVE, SUSPENDED
    }

    public enum SubscriptionPlan {
        FREE, BASIC, PREMIUM, ENTERPRISE, BETA
    }

    public enum BillingCycle {
        MONTHLY, YEARLY
    }
}
