package com.testshaper.service;

import com.testshaper.dto.reports.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface UsageReportService {
    OverviewMetricsDTO getOverviewMetrics(LocalDateTime start, LocalDateTime end);
    QuestionUsageReportDTO getQuestionUsageReport(LocalDateTime start, LocalDateTime end, UUID subjectId);
    ExamUsageReportDTO getExamUsageReport(LocalDateTime start, LocalDateTime end, UUID subjectId);
    List<TeacherActivityDTO> getTeacherActivityReport(LocalDateTime start, LocalDateTime end);
    // Future: Institute and AI usage methods
}
