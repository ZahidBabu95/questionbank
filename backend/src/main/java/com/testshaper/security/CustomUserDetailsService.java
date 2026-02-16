package com.testshaper.security;

import com.testshaper.entity.User;
import com.testshaper.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

        private final UserRepository userRepository;

        @Override
        @Transactional(readOnly = true)
        public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
                User user = userRepository.findByEmail(usernameOrEmail)
                                .orElseThrow(() -> new UsernameNotFoundException(
                                                "User not found with email: " + usernameOrEmail));

                String tenantId = user.getInstitute() != null ? String.valueOf(user.getInstitute().getId()) : "DEFAULT";

                return new CustomUserDetails(
                                user.getEmail(),
                                user.getPassword(),
                                user.isActive(),
                                true,
                                true,
                                !user.isAccountLocked(),
                                getAuthorities(user),
                                tenantId,
                                null // userId if needed, strictly speaking UUID id.
                );
        }

        private Collection<? extends GrantedAuthority> getAuthorities(User user) {
                Set<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
                                .collect(Collectors.toSet());

                // Add individual permissions if needed
                user.getRoles().stream()
                                .flatMap(role -> role.getPermissions().stream())
                                .forEach(permission -> authorities
                                                .add(new SimpleGrantedAuthority(permission.getName())));

                return authorities;
        }
}
