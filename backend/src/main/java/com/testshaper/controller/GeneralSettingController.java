package com.testshaper.controller;

import com.testshaper.entity.GeneralSetting;
import com.testshaper.entity.User;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.GeneralSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings/general")
@RequiredArgsConstructor
public class GeneralSettingController {

    private final GeneralSettingService settingService;
    private final UserRepository userRepository;

    // --- Global Settings ---

    @GetMapping("/global/{category}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> getGlobalSettings(
            @PathVariable GeneralSetting.SettingCategory category) {
        return ResponseEntity.ok(settingService.getGlobalSettings(category));
    }

    @PutMapping("/global/{category}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateGlobalSettings(
            @PathVariable GeneralSetting.SettingCategory category,
            @RequestBody Map<String, String> settings) {

        settingService.updateGlobalSettings(category, settings);
        return ResponseEntity.ok(Map.of("success", true, "message", "Global settings updated successfully"));
    }

    // --- Institute Settings ---

    @GetMapping("/institute/{category}")
    @PreAuthorize("hasAnyRole('INSTITUTE_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> getInstituteSettings(
            @PathVariable GeneralSetting.SettingCategory category,
            Authentication authentication) {

        User user = getUser(authentication);
        String tenantId = getTenantId(user);

        if (tenantId == null) {
            // If Super Admin trying to access institute settings without context, maybe
            // return global or error?
            // For now, let's assume Super Admin might have an institute or we return global
            // as fallback/default.
            // But strictly speaking, "Institute Settings" implies a specific institute
            // context.
            // If User has no institute (e.g. Global Super Admin), this might be empty or
            // fallback.
            // Let's return empty or handle based on business logic.
            // Requirement: "Institute Admin can update their own tenant settings."
            // Super admin usually doesn't have an institute.
            return ResponseEntity.ok(settingService.getGlobalSettings(category));
        }

        return ResponseEntity.ok(settingService.getInstituteSettings(tenantId, category));
    }

    @PutMapping("/institute/{category}")
    @PreAuthorize("hasRole('INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateInstituteSettings(
            @PathVariable GeneralSetting.SettingCategory category,
            @RequestBody Map<String, String> settings,
            Authentication authentication) {

        User user = getUser(authentication);
        String tenantId = getTenantId(user);

        if (tenantId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "User does not belong to an institute"));
        }

        settingService.updateInstituteSettings(tenantId, category, settings);
        return ResponseEntity.ok(Map.of("success", true, "message", "Institute settings updated successfully"));
    }

    // --- Helpers ---

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private String getTenantId(User user) {
        if (user.getInstitute() != null) {
            return user.getInstitute().getId().toString();
        }
        return null;
    }
}
