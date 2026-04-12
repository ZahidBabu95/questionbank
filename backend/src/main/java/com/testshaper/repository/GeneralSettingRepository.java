package com.testshaper.repository;

import com.testshaper.entity.GeneralSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GeneralSettingRepository extends JpaRepository<GeneralSetting, UUID> {

    List<GeneralSetting> findByTenantIdAndCategory(String tenantId, GeneralSetting.SettingCategory category);

    Optional<GeneralSetting> findByTenantIdAndKey(String tenantId, String key);

    // Find global settings (tenantId is null)
    List<GeneralSetting> findByTenantIdIsNullAndCategory(GeneralSetting.SettingCategory category);

    Optional<GeneralSetting> findByTenantIdIsNullAndKey(String key);
}
