package com.testshaper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import lombok.Getter;
import lombok.Setter;

@MappedSuperclass
@Getter
@Setter
public abstract class BaseTenantEntity extends BaseEntity {

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @PrePersist
    public void prePersist() {
        if (this.tenantId == null) {
            String currentTenant = com.testshaper.security.TenantContext.getTenantId();
            if (currentTenant != null) {
                this.tenantId = currentTenant;
            } else {
                // Fallback or throw exception? For now fallback to "DEFAULT" or throw
                // throw new RuntimeException("Tenant ID not set in context");
                this.tenantId = "DEFAULT";
            }
        }
    }
}
