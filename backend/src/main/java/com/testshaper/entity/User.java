package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email"),
    @Index(name = "idx_user_institute", columnList = "institute_id"),
    @Index(name = "idx_user_status", columnList = "deleted, is_active"),
    @Index(name = "idx_user_name", columnList = "name")
})
@Getter
@Setter
public class User extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String phone;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(name = "is_active")
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institute_id")
    private Institute institute;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    // Account locking mechanism
    @Column(name = "failed_login_attempts")
    private int failedLoginAttempts = 0;

    @Column(name = "account_locked")
    private boolean accountLocked = false;

    @Column(name = "lock_time")
    private java.time.LocalDateTime lockTime;

    // Gamification & Contribution System
    @Column(name = "contribution_points")
    private Integer contributionPoints = 0;

    @Column(name = "user_institute_name_en")
    private String userInstituteNameEn;

    @Column(name = "user_institute_name_bn")
    private String userInstituteNameBn;

    @Column(name = "student_roll")
    private String studentRoll;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private AcademicClass academicClass;

    public Integer getContributionPoints() {
        return contributionPoints == null ? 0 : contributionPoints;
    }
}
