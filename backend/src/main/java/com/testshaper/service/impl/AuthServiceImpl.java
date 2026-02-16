package com.testshaper.service.impl;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UserDTO;
import com.testshaper.security.JwtTokenProvider;
import com.testshaper.service.AuthService;
import com.testshaper.entity.User;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.SecuritySettingService;
import com.testshaper.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserService userService;
    private final UserRepository userRepository;
    private final SecuritySettingService securityService;

    @Override
    public String login(String email, String password) {
        // 1. Check User Status & Unlock if needed
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            String tenantId = user.getInstitute() != null ? user.getInstitute().getId().toString() : null;

            if (user.isAccountLocked()) {
                long lockDuration = securityService.getAccountLockDurationMinutes(tenantId);
                if (user.getLockTime() != null &&
                        user.getLockTime().plusMinutes(lockDuration).isBefore(java.time.LocalDateTime.now())) {
                    // Unlock
                    user.setAccountLocked(false);
                    user.setFailedLoginAttempts(0);
                    user.setLockTime(null);
                    userRepository.save(user);
                } else {
                    throw new org.springframework.security.authentication.LockedException(
                            "Account is locked. Try again later.");
                }
            }
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));

            // Success -> Reset attempts
            if (user != null) {
                user.setFailedLoginAttempts(0);
                user.setAccountLocked(false);
                user.setLockTime(null);
                userRepository.save(user);
            }

            SecurityContextHolder.getContext().setAuthentication(authentication);
            return jwtTokenProvider.generateToken(authentication);

        } catch (org.springframework.security.core.AuthenticationException e) {
            // Failure -> Increment attempts & Lock if needed
            if (user != null) {
                String tenantId = user.getInstitute() != null ? user.getInstitute().getId().toString() : null;
                int maxAttempts = securityService.getMaxLoginAttempts(tenantId);

                int newAttempts = user.getFailedLoginAttempts() + 1;
                user.setFailedLoginAttempts(newAttempts);

                if (newAttempts >= maxAttempts) {
                    user.setAccountLocked(true);
                    user.setLockTime(java.time.LocalDateTime.now());
                }
                userRepository.save(user);
            }
            throw e;
        }
    }

    @Override
    public UserDTO register(CreateUserDTO createUserDTO) {
        return userService.createUser(createUserDTO);
    }

    @Override
    public void logout(String token) {
        // Implement token blacklisting if needed (Redis)
    }

    @Override
    public String refreshToken(String oldToken) {
        // Basic implementation, can be enhanced
        if (jwtTokenProvider.validateToken(oldToken)) {
            // Extract username and generate new token
            // For now, simpler implementation or placeholder
            return oldToken;
        }
        return null;
    }

    @Override
    public String impersonate(java.util.UUID userId) {
        com.testshaper.dto.UserDTO user = userService.getUserById(userId);

        // Create an Authentication object manually without password
        // We need to load UserDetails to get authorities
        // Since we don't have direct access to UserDetails service here (or we do via
        // circular dep risk if we inject it),
        // we can construct authorities from UserDTO roles if mapped correctly, or use a
        // custom method.
        // Best approach: Load User entity via repository (but service layer
        // constraint).
        // Let's rely on userService to get roles and construct a token.

        // Actually, JwtTokenProvider usually takes Authentication.
        // Let's create a partial Authentication object.

        java.util.Set<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities = user.getRoles()
                .stream()
                .map(role -> new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role))
                .collect(java.util.stream.Collectors.toSet());

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                authorities);

        return jwtTokenProvider.generateToken(authentication);
    }
}
