package com.testshaper.service;

import com.testshaper.dto.RoleDTO;
import java.util.List;
import java.util.UUID;

public interface RoleService {
    List<RoleDTO> getAllRoles();

    RoleDTO createRole(RoleDTO roleDTO);

    RoleDTO updateRole(UUID id, RoleDTO roleDTO);

    void deleteRole(UUID id);
}
