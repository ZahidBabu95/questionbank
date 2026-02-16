package com.testshaper.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Set;
import java.util.UUID;

@Data
public class UpdateUserDTO {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String phone;

    private boolean isActive;

    private UUID instituteId;

    private Set<String> roles;
}
