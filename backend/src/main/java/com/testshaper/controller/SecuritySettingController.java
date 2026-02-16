package com.testshaper.controller;

import com.testshaper.entity.User;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.SecuritySettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings/security")
@RequiredArgsConstructor
public class SecuritySettingController {

    private final SecuritySettingService securityService;
    private final UserRepository userRepository;

    @GetMapping("/global")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> getGlobalSettings() {
        return ResponseEntity.ok(securityService.getGlobalSettings());
    }

    @PutMapping("/global")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateGlobalSettings(@RequestBody Map<String, String> settings) {
        securityService.updateGlobalSettings(settings);
        return ResponseEntity.ok(Map.of("success", true, "message", "Global security settings updated successfully"));
    }

    @GetMapping("/institute")
    @PreAuthorize("hasAnyRole('INSTITUTE_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> getInstituteSettings(Authentication authentication) {
        User user = getUser(authentication);
        String tenantId = getTenantId(user);

        if (tenantId == null) {
            return ResponseEntity.ok(securityService.getGlobalSettings());
        }
        return ResponseEntity.ok(securityService.getInstituteSettings(tenantId));
    }

    @PutMapping("/institute")
    @PreAuthorize("hasRole('INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateInstituteSettings(
            @RequestBody Map<String, String> settings,
            Authentication authentication) {

        User user = getUser(authentication);
        String tenantId = getTenantId(user);

        if (tenantId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "User does not belong to an institute"));
        }

        securityService.updateInstituteSettings(tenantId, settings);
        return ResponseEntity
                .ok(Map.of("success", true, "message", "Institute security settings updated successfully"));
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
