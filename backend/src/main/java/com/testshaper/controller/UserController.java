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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

        private final UserService userService;

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
                Sort.Direction direction = sort.length > 1 && sort[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC
                                : Sort.Direction.DESC;
                Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

                Page<UserDTO> users = userService.getAllUsers(query, instituteId, role, active, accountLocked,
                                includeDeleted,
                                pageable);

                return ResponseEntity.ok(Map.of(
                                "success", true,
                                "data", users));
        }

        @GetMapping("/{id}")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN') or @userSecurity.isSelf(authentication, #id)")
        public ResponseEntity<Map<String, Object>> getUserById(@PathVariable UUID id) {
                UserDTO user = userService.getUserById(id);
                return ResponseEntity.ok(Map.of(
                                "success", true,
                                "data", user));
        }

        @PostMapping
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> createUser(@Valid @RequestBody CreateUserDTO createUserDTO) {
                UserDTO user = userService.createUser(createUserDTO);
                return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                                "success", true,
                                "message", "User created successfully",
                                "data", user));
        }

        @PutMapping("/{id}")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> updateUser(@PathVariable UUID id,
                        @Valid @RequestBody UpdateUserDTO updateUserDTO) {
                UserDTO user = userService.updateUser(id, updateUserDTO);
                return ResponseEntity.ok(Map.of(
                                "success", true,
                                "message", "User updated successfully",
                                "data", user));
        }

        @DeleteMapping("/{id}")
        @PreAuthorize("hasRole('SUPER_ADMIN')")
        public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable UUID id) {
                userService.deleteUser(id);
                return ResponseEntity.ok(Map.of(
                                "success", true,
                                "message", "User deleted successfully"));
        }

        @PatchMapping("/{id}/activate")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> activateUser(@PathVariable UUID id) {
                userService.activateUser(id);
                return ResponseEntity.ok(Map.of(
                                "success", true,
                                "message", "User activated successfully"));
        }

        @PatchMapping("/{id}/deactivate")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> deactivateUser(@PathVariable UUID id) {
                userService.deactivateUser(id);
                return ResponseEntity.ok(Map.of(
                                "success", true,
                                "message", "User deactivated successfully"));
        }

        @PatchMapping("/{id}/reset-password")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
        public ResponseEntity<Map<String, Object>> resetPassword(@PathVariable UUID id) {
                userService.resetPassword(id);
                return ResponseEntity.ok(Map.of(
                                "success", true,
                                "message", "Password reset successfully"));
        }

        @PostMapping("/{id}/profile-image")
        @PreAuthorize("@userSecurity.isSelf(authentication, #id)")
        public ResponseEntity<Map<String, Object>> uploadProfileImage(@PathVariable UUID id,
                        @RequestParam("file") MultipartFile file) {
                userService.uploadProfileImage(id, file);
                return ResponseEntity.ok(Map.of(
                                "success", true,
                                "message", "Profile image uploaded successfully"));
        }
}
