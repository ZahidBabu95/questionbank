package com.testshaper.repository;

import com.testshaper.entity.SecuritySetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SecuritySettingRepository extends JpaRepository<SecuritySetting, UUID> {

    List<SecuritySetting> findByTenantId(String tenantId);

    Optional<SecuritySetting> findByTenantIdAndKey(String tenantId, String key);

    List<SecuritySetting> findByTenantIdIsNull();

    Optional<SecuritySetting> findByTenantIdIsNullAndKey(String key);
}
