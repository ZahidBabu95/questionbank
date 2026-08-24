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

    private Boolean active;
    private Boolean isActive;

    public Boolean getActiveStatus() {
        if (active != null) return active;
        if (isActive != null) return isActive;
        return null;
    }

    private UUID instituteId;

    private Set<String> roles;

    private UUID classId;

    private String studentRoll;

    private String instituteBranches;
}
