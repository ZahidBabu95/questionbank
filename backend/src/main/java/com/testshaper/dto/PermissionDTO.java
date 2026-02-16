package com.testshaper.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class PermissionDTO {
    private UUID id;
    private String name;
    private String description;
}
