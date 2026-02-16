package com.testshaper.dto;

import lombok.Data;
import java.util.Set;
import java.util.UUID;

@Data
public class RoleDTO {
    private UUID id;
    private String name;
    private String description;
    private Set<PermissionDTO> permissions;
}
