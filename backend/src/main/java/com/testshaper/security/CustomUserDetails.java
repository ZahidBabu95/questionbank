package com.testshaper.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

@Getter
public class CustomUserDetails extends User {

    private final String tenantId;
    private final Long userId; // Optional, useful for auditing

    public CustomUserDetails(String username, String password, boolean enabled, boolean accountNonExpired,
            boolean credentialsNonExpired, boolean accountNonLocked,
            Collection<? extends GrantedAuthority> authorities,
            String tenantId, Long userId) {
        super(username, password, enabled, accountNonExpired, credentialsNonExpired, accountNonLocked, authorities);
        this.tenantId = tenantId;
        this.userId = userId;
    }
}
