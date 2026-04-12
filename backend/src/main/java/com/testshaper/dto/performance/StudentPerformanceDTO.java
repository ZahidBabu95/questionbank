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
public class StudentPerformanceDTO {
    private Double averageScore;
    private Double highestScore;
    private Double lowestScore;
    private Double passRate;
    private Map<String, Long> scoreDistribution; // e.g. "80-100": 5, "60-79": 10
}
