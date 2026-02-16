package com.testshaper.controller;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UserDTO;
import com.testshaper.service.AuthService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest loginRequest) {
        String token = authService.login(loginRequest.getEmail(), loginRequest.getPassword());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Login successful",
                "data", token));
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@Valid @RequestBody CreateUserDTO createUserDTO) {
        UserDTO user = authService.register(createUserDTO);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User registered successfully",
                "data", user));
    }

    @PostMapping("/impersonate/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> impersonate(
            @org.springframework.web.bind.annotation.PathVariable java.util.UUID userId) {
        String token = authService.impersonate(userId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Impersonation successful",
                "data", token));
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }
}
