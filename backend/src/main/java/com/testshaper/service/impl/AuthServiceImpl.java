package com.testshaper.service.impl;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UserDTO;
import com.testshaper.entity.UserLoginHistory;
import com.testshaper.repository.UserLoginHistoryRepository;
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
    private final UserLoginHistoryRepository loginHistoryRepo;

    @Override
    public String login(String email, String password, String ipAddress, String userAgent) {
        // 1. Check User Status & Unlock if needed
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            String tenantId = user.getInstitute() != null ? user.getInstitute().getId().toString() : null;

            if (user.isAccountLocked()) {
                long lockDuration = securityService.getAccountLockDurationMinutes(tenantId);
                java.time.LocalDateTime lockTime = user.getLockTime();
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                java.time.LocalDateTime unlockTime = lockTime != null 
                        ? lockTime.plusMinutes(lockDuration) 
                        : now.plusMinutes(lockDuration);

                if (unlockTime.isBefore(now)) {
                    // Unlock
                    user.setAccountLocked(false);
                    user.setFailedLoginAttempts(0);
                    user.setLockTime(null);
                    userRepository.save(user);
                } else {
                    java.time.Duration duration = java.time.Duration.between(now, unlockTime);
                    long minutesRemaining = duration.toMinutes();
                    if (minutesRemaining <= 0) {
                        long secondsRemaining = duration.toSeconds();
                        throw new org.springframework.security.authentication.LockedException(
                                "Account is locked. Please try again in " + (secondsRemaining > 0 ? secondsRemaining : 0) + " seconds.");
                    } else {
                        throw new org.springframework.security.authentication.LockedException(
                                "Account is locked. Please try again in " + minutesRemaining + " minutes.");
                    }
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
            // Record successful login
            if (user != null) {
                UserLoginHistory h = new UserLoginHistory();
                h.setUserId(user.getId());
                h.setEmail(email);
                h.setSuccess(true);
                h.setIpAddress(ipAddress);
                h.setUserAgent(userAgent);
                loginHistoryRepo.save(h);
            }
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
                    userRepository.save(user);
                    
                    // Record failed login
                    UserLoginHistory h = new UserLoginHistory();
                    h.setUserId(user.getId());
                    h.setEmail(email);
                    h.setSuccess(false);
                    h.setFailureReason("Account locked");
                    h.setIpAddress(ipAddress);
                    h.setUserAgent(userAgent);
                    loginHistoryRepo.save(h);

                    long lockDuration = securityService.getAccountLockDurationMinutes(tenantId);
                    throw new org.springframework.security.authentication.LockedException(
                            "Too many failed login attempts. Your account has been locked for " + lockDuration + " minutes.");
                } else {
                    userRepository.save(user);
                    
                    // Record failed login
                    UserLoginHistory h = new UserLoginHistory();
                    h.setUserId(user.getId());
                    h.setEmail(email);
                    h.setSuccess(false);
                    h.setFailureReason("Wrong password");
                    h.setIpAddress(ipAddress);
                    h.setUserAgent(userAgent);
                    loginHistoryRepo.save(h);

                    int remaining = maxAttempts - newAttempts;
                    throw new org.springframework.security.authentication.BadCredentialsException(
                            "Invalid credentials. You have " + remaining + " attempts remaining before your account is locked.");
                }
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
        if (jwtTokenProvider.validateToken(oldToken)) {
            String email = jwtTokenProvider.getUsername(oldToken);
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null && user.isActive() && !user.isAccountLocked()) {
                java.util.Set<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities = user.getRoles()
                        .stream()
                        .map(role -> new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role.getName()))
                        .collect(java.util.stream.Collectors.toSet());

                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        user.getEmail(),
                        null,
                        authorities);

                return jwtTokenProvider.generateToken(authentication);
            }
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
