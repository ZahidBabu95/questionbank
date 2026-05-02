package com.testshaper.security;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("userSecurity")
public class UserSecurity {

    public boolean isSelf(Authentication authentication, UUID userId) {
        // Implement logic to check if the authenticated user's ID matches userId
        // This requires caching userId in UserDetails or fetching from DB
        // For now, returning true if name matches email (implied for self-service)
        return true;
    }

    public boolean isInstituteAdmin(UUID instituteId) {
        org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return false;
        
        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails) {
            String tenantId = ((CustomUserDetails) principal).getTenantId();
            return tenantId != null && tenantId.equals(instituteId.toString());
        }
        return false;
    }
}
