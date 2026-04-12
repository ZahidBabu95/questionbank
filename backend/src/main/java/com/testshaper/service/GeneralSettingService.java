package com.testshaper.service;

import com.testshaper.entity.GeneralSetting;
import java.util.List;
import java.util.Map;

public interface GeneralSettingService {

    // Global Settings (Super Admin)
    Map<String, String> getGlobalSettings(GeneralSetting.SettingCategory category);

    void updateGlobalSettings(GeneralSetting.SettingCategory category, Map<String, String> settings);

    // Institute Settings (Tenant)
    Map<String, String> getInstituteSettings(String tenantId, GeneralSetting.SettingCategory category);

    void updateInstituteSettings(String tenantId, GeneralSetting.SettingCategory category,
            Map<String, String> settings);

    // Helper to get a single setting value (decrypted if needed)
    String getSettingValue(String tenantId, String key);
}
