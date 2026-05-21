package com.testshaper.security;

import com.testshaper.entity.User;
import com.testshaper.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("userSecurity")
@RequiredArgsConstructor
public class UserSecurity {

    private final UserRepository userRepository;

    public boolean isSelf(Authentication authentication, UUID userId) {
        if (authentication == null || userId == null) return false;
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .map(id -> id.equals(userId))
                .orElse(false);
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
