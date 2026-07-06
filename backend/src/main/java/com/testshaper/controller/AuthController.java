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
    private final com.testshaper.service.UserService userService;
    private final com.testshaper.service.RoleService roleService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @Valid @RequestBody LoginRequest loginRequest,
            jakarta.servlet.http.HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        String userAgent = request.getHeader("User-Agent");

        String token = authService.login(loginRequest.getEmail(), loginRequest.getPassword(), ipAddress, userAgent);
        com.testshaper.dto.UserDTO user = userService.getUserByEmail(loginRequest.getEmail());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Login successful",
                "data", token,
                "user", user));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<Map<String, Object>> refreshToken(@RequestBody Map<String, String> payload) {
        String oldToken = payload.get("token");
        String newToken = authService.refreshToken(oldToken);
        if (newToken != null) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Token refreshed successfully",
                    "data", newToken));
        }
        return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid or expired token"));
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@Valid @RequestBody CreateUserDTO createUserDTO) {
        UserDTO user = authService.register(createUserDTO);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User registered successfully",
                "data", user));
    }

    @org.springframework.web.bind.annotation.GetMapping("/roles")
    public ResponseEntity<Map<String, Object>> getRegistrationRoles() {
        java.util.List<com.testshaper.dto.RoleDTO> roles = roleService.getSelfRegistrationRoles();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", roles));
    }

    @PostMapping("/impersonate/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> impersonate(
            @org.springframework.web.bind.annotation.PathVariable java.util.UUID userId) {
        String token = authService.impersonate(userId);
        com.testshaper.dto.UserDTO user = userService.getUserById(userId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Impersonation successful",
                "data", token,
                "user", user));
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }
}
