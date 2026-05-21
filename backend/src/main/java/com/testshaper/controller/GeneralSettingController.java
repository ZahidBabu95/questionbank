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

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings/general")
@RequiredArgsConstructor
public class GeneralSettingController {

    private final GeneralSettingService settingService;
    private final UserRepository userRepository;
    private final com.testshaper.service.DynamicStorageService dynamicStorageService;

    // --- Global Settings ---

    @GetMapping("/global/{category}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
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
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> getInstituteSettings(
            @PathVariable GeneralSetting.SettingCategory category,
            Authentication authentication) {

        // For BRANDING, any authenticated user can read it.
        // For other categories, require appropriate roles.
        boolean isAdminOrTeacher = authentication.getAuthorities().stream()
                .anyMatch(a -> {
                    String role = a.getAuthority();
                    return role.equals("ROLE_SUPER_ADMIN") || 
                           role.equals("ROLE_INSTITUTE_ADMIN") || 
                           role.equals("ROLE_TEACHER");
                });

        if (category != GeneralSetting.SettingCategory.BRANDING && !isAdminOrTeacher) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }

        User user = getUser(authentication);
        String tenantId = getTenantId(user);

        if (tenantId == null) {
            // Super Admin or global user without an institute — fallback to global settings
            return ResponseEntity.ok(settingService.getGlobalSettings(category));
        }

        Map<String, String> globalSettings = settingService.getGlobalSettings(category);
        Map<String, String> instituteSettings = settingService.getInstituteSettings(tenantId, category);
        
        Map<String, String> mergedSettings = new java.util.HashMap<>();
        if (globalSettings != null) {
            mergedSettings.putAll(globalSettings);
        }
        if (instituteSettings != null) {
            mergedSettings.putAll(instituteSettings);
        }
        return ResponseEntity.ok(mergedSettings);
    }

    @PutMapping("/institute/{category}")
    @PreAuthorize("hasAnyRole('INSTITUTE_ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<Map<String, Object>> updateInstituteSettings(
            @PathVariable GeneralSetting.SettingCategory category,
            @RequestBody Map<String, String> settings,
            Authentication authentication) {

        boolean isTeacherOnly = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER")) &&
                authentication.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_INSTITUTE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));

        if (isTeacherOnly && category != GeneralSetting.SettingCategory.EXAM) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Teachers are only allowed to update Exam configurations"));
        }

        User user = getUser(authentication);
        String tenantId = getTenantId(user);

        if (tenantId == null) {
            // Super Admin without institute — save as global
            settingService.updateGlobalSettings(category, settings);
            return ResponseEntity.ok(Map.of("success", true, "message", "Global settings updated successfully"));
        }

        settingService.updateInstituteSettings(tenantId, category, settings);
        return ResponseEntity.ok(Map.of("success", true, "message", "Institute settings updated successfully"));
    }

    // --- File Upload ---

    @PostMapping("/upload-image")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, String>> uploadBrandingImage(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("type") String type, // "logo" or "favicon"
            Authentication authentication) {

        try {
            User user = getUser(authentication);
            String tenantId = getTenantId(user);

            // We use DynamicStorageService to upload
            String subFolder = "branding";
            if (tenantId != null)
                subFolder += "/" + tenantId;

            String fileUrl = dynamicStorageService.uploadFile(file, tenantId, subFolder);

            // Prepend public path for local files
            if (!fileUrl.startsWith("http") && !fileUrl.startsWith("/")) {
                fileUrl = "/api/v1/public/files/" + fileUrl;
            }

            return ResponseEntity.ok(Map.of("url", fileUrl));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Upload failed"));
        }
    }

    // --- Storage Connection Test ---
    @PostMapping("/test-storage")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> testStorageConnection(
            @RequestBody Map<String, String> settings) {
        try {
            Map<String, Object> result = dynamicStorageService.testConnection(settings);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("connected", false, "error", e.getMessage()));
        }
    }

    // --- Helpers ---

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private String getTenantId(User user) {
        // SUPER_ADMIN always works at global level regardless of institute association
        boolean isSuperAdmin = user.getRoles().stream()
                .anyMatch(role -> "SUPER_ADMIN".equals(role.getName()));

        if (isSuperAdmin) {
            return null;
        }

        if (user.getInstitute() != null) {
            String name = user.getInstitute().getName();
            if ("DEFAULT".equalsIgnoreCase(name) || "Default Institute".equalsIgnoreCase(name)) {
                return null;
            }
            return user.getInstitute().getId().toString();
        }
        return null;
    }

}
