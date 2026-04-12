package com.testshaper.dto.performance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamPerformanceDTO {
    private String examTitle;
    private Double averageScore;
    private Double difficultyIndex;
    private Double completionRate;
    private Map<String, Long> scoreDistribution;
}
