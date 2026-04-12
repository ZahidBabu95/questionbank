package com.testshaper.service;

import com.testshaper.dto.PermissionDTO;
import java.util.List;

public interface PermissionService {
    List<PermissionDTO> getAllPermissions();
    List<PermissionDTO> syncPermissions(List<String> permissionNames);
}
