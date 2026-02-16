package com.testshaper.service.impl;

import com.testshaper.entity.SecuritySetting;
import com.testshaper.repository.SecuritySettingRepository;
import com.testshaper.service.SecuritySettingService;
import com.testshaper.util.EncryptionUtil;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class SecuritySettingServiceImpl implements SecuritySettingService {

    private final SecuritySettingRepository repository;
    private final EncryptionUtil encryptionUtil;

    // Simple in-memory cache: TenantId -> (Key -> Value)
    // "GLOBAL" is used as key for global settings
    private final Map<String, Map<String, String>> settingsCache = new ConcurrentHashMap<>();
    private long lastCacheUpdate = 0;
    private static final long CACHE_TTL_MS = 60000; // 1 minute TTL for simplicity, or invalidate on update

    // Defaults
    private static final Map<String, String> DEFAULTS = Map.ofEntries(
            Map.entry("PASSWORD_MIN_LENGTH", "8"),
            Map.entry("PASSWORD_REQUIRE_UPPERCASE", "true"),
            Map.entry("PASSWORD_REQUIRE_LOWERCASE", "true"),
            Map.entry("PASSWORD_REQUIRE_NUMBER", "true"),
            Map.entry("PASSWORD_REQUIRE_SPECIAL", "true"),
            Map.entry("MAX_LOGIN_ATTEMPTS", "5"),
            Map.entry("ACCOUNT_LOCK_DURATION_MINUTES", "15"),
            Map.entry("JWT_ACCESS_TOKEN_EXPIRY_MINUTES", "60"),
            Map.entry("JWT_REFRESH_TOKEN_EXPIRY_DAYS", "30"));

    @PostConstruct
    public void init() {
        refreshCache();
    }

    private void refreshCache() {
        settingsCache.clear();
        loadSettingsIntoCache(null); // Load global
        // In a real generic cache we wouldn't load all tenants, but for now we assume
        // lazy or partial.
        // Let's implement lazy loading in getSettingValue instead of full load here.
        log.info("Security settings cache initialized.");
    }

    private Map<String, String> getCachedSettings(String tenantId) {
        String cacheKey = tenantId == null ? "GLOBAL" : tenantId;
        if (!settingsCache.containsKey(cacheKey)) {
            loadSettingsIntoCache(tenantId);
        }
        return settingsCache.getOrDefault(cacheKey, new HashMap<>());
    }

    private void loadSettingsIntoCache(String tenantId) {
        String cacheKey = tenantId == null ? "GLOBAL" : tenantId;
        List<SecuritySetting> settings = tenantId == null ? repository.findByTenantIdIsNull()
                : repository.findByTenantId(tenantId);

        Map<String, String> map = new HashMap<>();
        for (SecuritySetting s : settings) {
            String val = s.getValue();
            if (s.isEncrypted() && val != null) {
                try {
                    val = encryptionUtil.decrypt(val);
                } catch (Exception e) {
                    log.error("Failed to decrypt setting: " + s.getKey(), e);
                }
            }
            map.put(s.getKey(), val);
        }
        settingsCache.put(cacheKey, map);
    }

    private void invalidateCache(String tenantId) {
        String cacheKey = tenantId == null ? "GLOBAL" : tenantId;
        settingsCache.remove(cacheKey);
    }

    @Override
    public Map<String, String> getGlobalSettings() {
        return getCachedSettings(null);
    }

    @Override
    @Transactional
    public void updateGlobalSettings(Map<String, String> settings) {
        updateSettings(null, settings);
    }

    @Override
    public Map<String, String> getInstituteSettings(String tenantId) {
        // For partial updates or display, we might want to show effective settings.
        // But usually update endpoints want to see overrides.
        // Let's return just the overrides for the UI form.
        return getCachedSettings(tenantId);
    }

    @Override
    @Transactional
    public void updateInstituteSettings(String tenantId, Map<String, String> settings) {
        updateSettings(tenantId, settings);
    }

    // Core method for priority resolution: Tenant > Global > Default
    @Override
    public String getSettingValue(String tenantId, String key, String defaultValue) {
        // 1. Check Tenant
        if (tenantId != null) {
            Map<String, String> tenantSettings = getCachedSettings(tenantId);
            if (tenantSettings.containsKey(key))
                return tenantSettings.get(key);
        }

        // 2. Check Global
        Map<String, String> globalSettings = getCachedSettings(null);
        if (globalSettings.containsKey(key))
            return globalSettings.get(key);

        // 3. Default
        return defaultValue != null ? defaultValue : DEFAULTS.getOrDefault(key, "");
    }

    private void updateSettings(String tenantId, Map<String, String> newSettings) {
        List<SecuritySetting> existingList = tenantId == null ? repository.findByTenantIdIsNull()
                : repository.findByTenantId(tenantId);

        Map<String, SecuritySetting> existingMap = new HashMap<>();
        existingList.forEach(s -> existingMap.put(s.getKey(), s));

        newSettings.forEach((key, value) -> {
            SecuritySetting setting = existingMap.getOrDefault(key, new SecuritySetting());
            if (setting.getId() == null) {
                setting.setTenantId(tenantId);
                setting.setKey(key);
            }

            // Allow encryption logic if needed (e.g. secret keys)
            // For now assuming mostly policies, but if we had secrets:
            if (key.contains("SECRET") || key.contains("KEY")) {
                setting.setEncrypted(true);
                setting.setValue(encryptionUtil.encrypt(value));
            } else {
                setting.setEncrypted(false);
                setting.setValue(value);
            }

            repository.save(setting);
        });

        invalidateCache(tenantId);
    }

    // --- Policy Implementation ---

    @Override
    public void validatePassword(String password, String tenantId) {
        int minLength = Integer.parseInt(getSettingValue(tenantId, "PASSWORD_MIN_LENGTH", "8"));
        boolean reqUpper = Boolean.parseBoolean(getSettingValue(tenantId, "PASSWORD_REQUIRE_UPPERCASE", "true"));
        boolean reqLower = Boolean.parseBoolean(getSettingValue(tenantId, "PASSWORD_REQUIRE_LOWERCASE", "true"));
        boolean reqNumber = Boolean.parseBoolean(getSettingValue(tenantId, "PASSWORD_REQUIRE_NUMBER", "true"));
        boolean reqSpecial = Boolean.parseBoolean(getSettingValue(tenantId, "PASSWORD_REQUIRE_SPECIAL", "true"));

        if (password.length() < minLength) {
            throw new IllegalArgumentException("Password must be at least " + minLength + " characters long.");
        }
        if (reqUpper && !Pattern.compile("[A-Z]").matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter.");
        }
        if (reqLower && !Pattern.compile("[a-z]").matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one lowercase letter.");
        }
        if (reqNumber && !Pattern.compile("[0-9]").matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one number.");
        }
        if (reqSpecial && !Pattern.compile("[!@#$%^&*(),.?\":{}|<>]").matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one special character.");
        }
    }

    @Override
    public int getMaxLoginAttempts(String tenantId) {
        return Integer.parseInt(getSettingValue(tenantId, "MAX_LOGIN_ATTEMPTS", "5"));
    }

    @Override
    public long getAccountLockDurationMinutes(String tenantId) {
        return Long.parseLong(getSettingValue(tenantId, "ACCOUNT_LOCK_DURATION_MINUTES", "15"));
    }

    @Override
    public long getAccessTokenExpiryMinutes(String tenantId) {
        return Long.parseLong(getSettingValue(tenantId, "JWT_ACCESS_TOKEN_EXPIRY_MINUTES", "60"));
    }

    @Override
    public long getRefreshTokenExpiryDays(String tenantId) {
        return Long.parseLong(getSettingValue(tenantId, "JWT_REFRESH_TOKEN_EXPIRY_DAYS", "30"));
    }
}
