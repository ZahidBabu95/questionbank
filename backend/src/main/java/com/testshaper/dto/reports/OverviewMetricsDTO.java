package com.testshaper.dto.reports;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OverviewMetricsDTO {
    private long totalQuestions;
    private long totalExams;
    private long totalLectures;
    private long totalUsers;
    private long totalAIUsage;
}
