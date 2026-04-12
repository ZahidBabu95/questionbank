package com.testshaper.dto.reports;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamUsageReportDTO {
    private long totalExams;
    private Map<String, Long> byType;
    private Map<String, Long> bySubject;
    private double averageQuestions;
}
