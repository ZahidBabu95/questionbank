package com.testshaper.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.UUID;

@Data
public class AddQuestionRequest {

    @NotNull(message = "Question ID is required")
    private UUID questionId;

    @NotNull
    @Positive
    private Double marks;

    // Optional: assign to a section
    private UUID sectionId;

    // Optional: ordering position
    private Integer order;
}
