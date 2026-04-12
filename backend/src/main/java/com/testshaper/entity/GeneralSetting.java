package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "settings_general", indexes = {
        @Index(name = "idx_tenant_category", columnList = "tenant_id, category")
})
@Getter
@Setter
public class GeneralSetting extends BaseEntity {

    @Column(name = "tenant_id")
    private String tenantId; // nullable for SUPER_ADMIN/Global settings

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettingCategory category;

    @Column(name = "setting_key", nullable = false)
    private String key;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String value;

    @Column(nullable = false)
    private boolean encrypted = false;

    public enum SettingCategory {
        GENERAL,
        BRANDING,
        COMMUNICATION,
        AI,
        EXAM,
        STORAGE,
        SECURITY
    }
}
