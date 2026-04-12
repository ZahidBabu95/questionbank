package com.testshaper.service.impl;

import com.testshaper.dto.PermissionDTO;
import com.testshaper.entity.Permission;
import com.testshaper.repository.PermissionRepository;
import com.testshaper.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PermissionDTO> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<PermissionDTO> syncPermissions(List<String> permissionNames) {
        for (String name : permissionNames) {
            if (!permissionRepository.findByName(name).isPresent()) {
                Permission p = new Permission();
                p.setName(name);
                p.setDescription("Auto-generated permission for " + name);
                permissionRepository.save(p);
            }
        }
        return getAllPermissions();
    }

    private PermissionDTO toDTO(Permission permission) {
        PermissionDTO dto = new PermissionDTO();
        dto.setId(permission.getId());
        dto.setName(permission.getName());
        dto.setDescription(permission.getDescription());
        return dto;
    }
}
