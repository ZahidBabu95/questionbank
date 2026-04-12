package com.testshaper.controller;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UpdateUserDTO;
import com.testshaper.dto.UserDTO;
import com.testshaper.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

        private final UserService userService;

        // ── GET /stats  (MUST be before /{id}) ───────────────────────────────
        @GetMapping("/stats")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> getUserStats() {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "data", userService.getUserStats()));
        }

        // ── GET /export/csv  (MUST be before /{id}) ───────────────────────────
        @GetMapping("/export/csv")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<byte[]> exportUsersCsv(
                        @RequestParam(required = false) String role,
                        @RequestParam(required = false) Boolean active) {
                byte[] bytes = userService.exportUsersCsv(role, active);
                return ResponseEntity.ok()
                        .header("Content-Disposition", "attachment; filename=\"users.csv\"")
                        .header("Content-Type", "text/csv; charset=UTF-8")
                        .body(bytes);
        }

        // ── GET /  ────────────────────────────────────────────────────────────
        @GetMapping
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> getAllUsers(
                        @RequestParam(required = false) String query,
                        @RequestParam(required = false) UUID instituteId,
                        @RequestParam(required = false) String role,
                        @RequestParam(required = false) Boolean active,
                        @RequestParam(required = false) Boolean accountLocked,
                        @RequestParam(defaultValue = "false") boolean includeDeleted,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

                String sortField = sort[0];
                Sort.Direction direction = sort.length > 1 && sort[1].equalsIgnoreCase("asc")
                        ? Sort.Direction.ASC : Sort.Direction.DESC;
                Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
                Page<com.testshaper.dto.UserSummaryDTO> users = userService.getAllUsers(query, instituteId, role, active, accountLocked,
                                includeDeleted, pageable);
                return ResponseEntity.ok(Map.of("success", true, "data", users));
        }

        // ── GET /{id}  ────────────────────────────────────────────────────────
        @GetMapping("/{id}")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or @userSecurity.isSelf(authentication, #id)")
        public ResponseEntity<Map<String, Object>> getUserById(@PathVariable UUID id) {
                UserDTO user = userService.getUserById(id);
                return ResponseEntity.ok(Map.of("success", true, "data", user));
        }

        // ── POST /  ───────────────────────────────────────────────────────────
        @PostMapping
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> createUser(@Valid @RequestBody CreateUserDTO dto) {
                UserDTO user = userService.createUser(dto);
                return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                        "success", true, "message", "User created successfully", "data", user));
        }

        // ── PUT /{id}  ────────────────────────────────────────────────────────
        @PutMapping("/{id}")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> updateUser(
                        @PathVariable UUID id, @Valid @RequestBody UpdateUserDTO dto) {
                UserDTO user = userService.updateUser(id, dto);
                return ResponseEntity.ok(Map.of("success", true, "message", "User updated successfully", "data", user));
        }

        // ── DELETE /{id}  ──────────────────────────────────────────────────────
        @DeleteMapping("/{id}")
        @PreAuthorize("hasRole('SUPER_ADMIN')")
        public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable UUID id) {
                userService.deleteUser(id);
                return ResponseEntity.ok(Map.of("success", true, "message", "User deleted successfully"));
        }

        // ── PATCH /{id}/activate  ─────────────────────────────────────────────
        @PatchMapping("/{id}/activate")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> activateUser(@PathVariable UUID id) {
                userService.activateUser(id);
                return ResponseEntity.ok(Map.of("success", true, "message", "User activated successfully"));
        }

        // ── PATCH /{id}/deactivate  ───────────────────────────────────────────
        @PatchMapping("/{id}/deactivate")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> deactivateUser(@PathVariable UUID id) {
                userService.deactivateUser(id);
                return ResponseEntity.ok(Map.of("success", true, "message", "User deactivated successfully"));
        }

        // ── PATCH /{id}/reset-password  ───────────────────────────────────────
        @PatchMapping("/{id}/reset-password")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> resetPassword(@PathVariable UUID id) {
                userService.resetPassword(id);
                return ResponseEntity.ok(Map.of("success", true, "message", "Password reset successfully"));
        }

        // ── POST /{id}/profile-image  ─────────────────────────────────────────
        @PostMapping("/{id}/profile-image")
        @PreAuthorize("@userSecurity.isSelf(authentication, #id)")
        public ResponseEntity<Map<String, Object>> uploadProfileImage(
                        @PathVariable UUID id, @RequestParam("file") MultipartFile file) {
                userService.uploadProfileImage(id, file);
                return ResponseEntity.ok(Map.of("success", true, "message", "Profile image uploaded successfully"));
        }
        // ── PATCH /profile  ───────────────────────────────────────────────────
        @PatchMapping("/profile")
        @PreAuthorize("isAuthenticated()")
        public ResponseEntity<Map<String, Object>> updateMyProfile(
                        @Valid @RequestBody com.testshaper.dto.UpdateProfileDTO dto,
                        org.springframework.security.core.Authentication authentication) {
                String email = authentication.getName();
                UserDTO user = userService.getUserByEmail(email);
                UserDTO updatedUser = userService.updateProfile(user.getId(), dto);
                return ResponseEntity.ok(Map.of("success", true, "message", "Profile updated successfully", "data", updatedUser));
        }

        // ── PATCH /profile/password  ──────────────────────────────────────────
        @PatchMapping("/profile/password")
        @PreAuthorize("isAuthenticated()")
        public ResponseEntity<Map<String, Object>> changeMyPassword(
                        @RequestBody Map<String, String> request,
                        org.springframework.security.core.Authentication authentication) {
                String oldPassword = request.get("oldPassword");
                String newPassword = request.get("newPassword");
                
                String email = authentication.getName();
                UserDTO user = userService.getUserByEmail(email);
                
                userService.changePassword(user.getId(), oldPassword, newPassword);
                return ResponseEntity.ok(Map.of("success", true, "message", "Password changed successfully"));
        }

        // ── POST /bulk/activate  ──────────────────────────────────────────────
        @PostMapping("/bulk/activate")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> bulkActivate(@RequestBody List<UUID> ids) {
                userService.bulkActivate(ids);
                return ResponseEntity.ok(Map.of("success", true, "message", ids.size() + " users activated"));
        }

        // ── POST /bulk/deactivate  ────────────────────────────────────────────
        @PostMapping("/bulk/deactivate")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> bulkDeactivate(@RequestBody List<UUID> ids) {
                userService.bulkDeactivate(ids);
                return ResponseEntity.ok(Map.of("success", true, "message", ids.size() + " users deactivated"));
        }

        // ── POST /bulk/delete  ────────────────────────────────────────────────
        @PostMapping("/bulk/delete")
        @PreAuthorize("hasRole('SUPER_ADMIN')")
        public ResponseEntity<Map<String, Object>> bulkDelete(@RequestBody List<UUID> ids) {
                userService.bulkDelete(ids);
                return ResponseEntity.ok(Map.of("success", true, "message", ids.size() + " users deleted"));
        }
}
