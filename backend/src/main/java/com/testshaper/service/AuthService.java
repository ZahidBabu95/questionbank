package com.testshaper.service;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UserDTO;

public interface AuthService {
    String login(String email, String password, String ipAddress, String userAgent);

    UserDTO register(CreateUserDTO createUserDTO);

    void logout(String token);

    String refreshToken(String oldToken);

    String impersonate(java.util.UUID userId);
}
