package com.testshaper.dto.performance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionPerformanceDTO {
    private String questionText;
    private Double correctRate;
    private Double wrongRate;
    private Double skipRate;
    private String difficulty;
    private Double discriminationIndex;
}
