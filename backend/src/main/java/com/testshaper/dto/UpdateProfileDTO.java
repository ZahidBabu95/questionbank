package com.testshaper.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProfileDTO {

    @NotBlank(message = "Name is required")
    private String name;

    private String phone;

    private String instituteNameEn;

    private String instituteNameBn;
}
