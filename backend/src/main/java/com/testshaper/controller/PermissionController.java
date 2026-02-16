package com.testshaper.controller;

import com.testshaper.dto.PermissionDTO;
import com.testshaper.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getAllPermissions() {
        List<PermissionDTO> permissions = permissionService.getAllPermissions();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", permissions));
    }
}
