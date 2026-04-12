package com.testshaper.service;

import com.testshaper.dto.performance.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface PerformanceReportService {
    StudentPerformanceDTO getStudentPerformance(LocalDateTime start, LocalDateTime end, UUID classId, UUID subjectId);
    List<QuestionPerformanceDTO> getQuestionPerformance(LocalDateTime start, LocalDateTime end, UUID subjectId);
    ExamPerformanceDTO getExamPerformance(UUID examId);
    // Future: Class and Teacher specific performance
}
