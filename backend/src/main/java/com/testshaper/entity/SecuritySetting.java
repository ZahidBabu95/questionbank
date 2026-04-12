package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "settings_security", indexes = {
        @Index(name = "idx_sec_tenant_key", columnList = "tenant_id, setting_key")
})
@Getter
@Setter
public class SecuritySetting extends BaseEntity {

    @Column(name = "tenant_id")
    private String tenantId; // nullable for Global settings

    @Column(name = "setting_key", nullable = false)
    private String key;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String value;

    @Column(nullable = false)
    private boolean encrypted = false;
}
