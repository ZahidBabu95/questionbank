package com.testshaper.service.impl;

import com.testshaper.dto.PermissionDTO;
import com.testshaper.dto.RoleDTO;
import com.testshaper.entity.Role;
import com.testshaper.repository.RoleRepository;
import com.testshaper.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final com.testshaper.repository.PermissionRepository permissionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RoleDTO> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RoleDTO createRole(RoleDTO roleDTO) {
        if (roleRepository.findByName(roleDTO.getName()).isPresent()) {
            throw new RuntimeException("Role with name " + roleDTO.getName() + " already exists");
        }
        Role role = new Role();
        role.setName(roleDTO.getName());
        role.setDescription(roleDTO.getDescription());
        // Handle permissions
        if (roleDTO.getPermissions() != null) {
            java.util.Set<com.testshaper.entity.Permission> permissions = new java.util.HashSet<>();
            for (PermissionDTO pDto : roleDTO.getPermissions()) {
                if (pDto.getId() != null) {
                    permissionRepository.findById(pDto.getId()).ifPresent(permissions::add);
                } else if (pDto.getName() != null) {
                    // Fallback to name if ID is missing (though ID is preferred)
                    // For now, assuming ID is passed from frontend
                }
            }
            role.setPermissions(permissions);
        }
        return toDTO(roleRepository.save(role));
    }

    @Override
    @Transactional
    public RoleDTO updateRole(UUID id, RoleDTO roleDTO) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        role.setName(roleDTO.getName());
        role.setDescription(roleDTO.getDescription());

        // Update permissions
        if (roleDTO.getPermissions() != null) {
            java.util.Set<com.testshaper.entity.Permission> permissions = new java.util.HashSet<>();
            for (PermissionDTO pDto : roleDTO.getPermissions()) {
                if (pDto.getId() != null) {
                    permissionRepository.findById(pDto.getId()).ifPresent(permissions::add);
                }
            }
            role.setPermissions(permissions);
        }

        return toDTO(roleRepository.save(role));
    }

    @Override
    @Transactional
    public void deleteRole(UUID id) {
        if (!roleRepository.existsById(id)) {
            throw new RuntimeException("Role not found");
        }
        roleRepository.deleteById(id);
    }

    private RoleDTO toDTO(Role role) {
        RoleDTO dto = new RoleDTO();
        dto.setId(role.getId());
        dto.setName(role.getName());
        dto.setDescription(role.getDescription());
        if (role.getPermissions() != null) {
            dto.setPermissions(role.getPermissions().stream()
                    .map(p -> {
                        PermissionDTO pDto = new PermissionDTO();
                        pDto.setId(p.getId());
                        pDto.setName(p.getName());
                        pDto.setDescription(p.getDescription());
                        return pDto;
                    })
                    .collect(Collectors.toSet()));
        }
        return dto;
    }
}
