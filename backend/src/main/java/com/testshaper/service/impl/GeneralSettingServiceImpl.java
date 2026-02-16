package com.testshaper.service.impl;

import com.testshaper.entity.GeneralSetting;
import com.testshaper.repository.GeneralSettingRepository;
import com.testshaper.service.GeneralSettingService;
import com.testshaper.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GeneralSettingServiceImpl implements GeneralSettingService {

    private final GeneralSettingRepository settingRepository;
    private final EncryptionUtil encryptionUtil;

    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "SMTP_PASSWORD",
            "SMS_API_KEY",
            "AI_API_KEY",
            "AWS_SECRET_KEY",
            "STRIPE_SECRET_KEY");

    @Override
    public Map<String, String> getGlobalSettings(GeneralSetting.SettingCategory category) {
        List<GeneralSetting> settings = settingRepository.findByTenantIdIsNullAndCategory(category);
        return mapSettingsToMap(settings);
    }

    @Override
    @Transactional
    public void updateGlobalSettings(GeneralSetting.SettingCategory category, Map<String, String> settings) {
        updateSettings(null, category, settings);
    }

    @Override
    public Map<String, String> getInstituteSettings(String tenantId, GeneralSetting.SettingCategory category) {
        List<GeneralSetting> settings = settingRepository.findByTenantIdAndCategory(tenantId, category);
        return mapSettingsToMap(settings);
    }

    @Override
    @Transactional
    public void updateInstituteSettings(String tenantId, GeneralSetting.SettingCategory category,
            Map<String, String> settings) {
        updateSettings(tenantId, category, settings);
    }

    @Override
    public String getSettingValue(String tenantId, String key) {
        // Try to find institute setting first
        if (tenantId != null) {
            var setting = settingRepository.findByTenantIdAndKey(tenantId, key);
            if (setting.isPresent()) {
                return decryptIfNeeded(setting.get());
            }
        }
        // Fallback to global
        return settingRepository.findByTenantIdIsNullAndKey(key)
                .map(this::decryptIfNeeded)
                .orElse(null);
    }

    private void updateSettings(String tenantId, GeneralSetting.SettingCategory category,
            Map<String, String> newSettings) {
        // Fetch existing to avoid duplicates or to update in place
        List<GeneralSetting> existingSettings;
        if (tenantId == null) {
            existingSettings = settingRepository.findByTenantIdIsNullAndCategory(category);
        } else {
            existingSettings = settingRepository.findByTenantIdAndCategory(tenantId, category);
        }

        Map<String, GeneralSetting> existingMap = existingSettings.stream()
                .collect(Collectors.toMap(GeneralSetting::getKey, s -> s));

        newSettings.forEach((key, value) -> {
            GeneralSetting setting = existingMap.getOrDefault(key, new GeneralSetting());
            if (setting.getId() == null) {
                setting.setTenantId(tenantId);
                setting.setCategory(category);
                setting.setKey(key);
            }

            // Check if sensitive
            boolean isSensitive = SENSITIVE_KEYS.contains(key) || key.endsWith("_PASSWORD") || key.endsWith("_KEY")
                    || key.endsWith("_SECRET");

            if (isSensitive && value != null && !value.isEmpty()) {
                // Only encrypt if it's not already encrypted/masked (handled by implementation
                // detail usually,
                // but here we assume raw value comes in.
                // In a real app, we might send "******" back to UI, and if UI sends back
                // "******", we ignore update.
                // For now, let's assume if it looks like a masked value, we skip update or
                // handle it.
                // Simple check: if value is "******", ignore.
                if (!"******".equals(value)) {
                    setting.setValue(encryptionUtil.encrypt(value));
                    setting.setEncrypted(true);
                }
            } else {
                setting.setValue(value);
                setting.setEncrypted(false);
            }

            settingRepository.save(setting);
        });
    }

    private Map<String, String> mapSettingsToMap(List<GeneralSetting> settings) {
        Map<String, String> map = new HashMap<>();
        for (GeneralSetting s : settings) {
            String val = decryptIfNeeded(s);
            // Mask sensitive data for UI
            if (s.isEncrypted()) {
                val = "******";
            }
            map.put(s.getKey(), val);
        }
        return map;
    }

    private String decryptIfNeeded(GeneralSetting setting) {
        if (setting.isEncrypted() && setting.getValue() != null) {
            try {
                return encryptionUtil.decrypt(setting.getValue());
            } catch (Exception e) {
                // In case of decryption error/key change, return raw or error
                return null;
            }
        }
        return setting.getValue();
    }
}
