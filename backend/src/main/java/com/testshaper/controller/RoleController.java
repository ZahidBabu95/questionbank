package com.testshaper.controller;

import com.testshaper.dto.RoleDTO;
import com.testshaper.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getAllRoles() {
        List<RoleDTO> roles = roleService.getAllRoles();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", roles));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> createRole(@RequestBody RoleDTO roleDTO) {
        RoleDTO createdRole = roleService.createRole(roleDTO);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Role created successfully",
                "data", createdRole));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateRole(@PathVariable java.util.UUID id,
            @RequestBody RoleDTO roleDTO) {
        RoleDTO updatedRole = roleService.updateRole(id, roleDTO);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Role updated successfully",
                "data", updatedRole));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteRole(@PathVariable java.util.UUID id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Role deleted successfully"));
    }
}
