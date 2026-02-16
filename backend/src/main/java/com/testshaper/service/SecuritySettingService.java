package com.testshaper.service;

import java.util.Map;

public interface SecuritySettingService {

    // Global
    Map<String, String> getGlobalSettings();

    void updateGlobalSettings(Map<String, String> settings);

    // Institute
    Map<String, String> getInstituteSettings(String tenantId);

    void updateInstituteSettings(String tenantId, Map<String, String> settings);

    // Internal Policy Checks (Cached)
    String getSettingValue(String tenantId, String key, String defaultValue);

    // Password Policy
    void validatePassword(String password, String tenantId);

    // Login Policy
    int getMaxLoginAttempts(String tenantId);

    long getAccountLockDurationMinutes(String tenantId);

    // JWT Policy
    long getAccessTokenExpiryMinutes(String tenantId);

    long getRefreshTokenExpiryDays(String tenantId);
}
