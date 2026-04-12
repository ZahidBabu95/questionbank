package com.testshaper.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ReorderRequest {
    // Ordered list of ExamQuestion IDs (not Question IDs)
    private List<UUID> orderedQuestionIds;
}
