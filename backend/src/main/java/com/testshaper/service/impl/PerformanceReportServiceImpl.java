package com.testshaper.service.impl;

import com.testshaper.dto.performance.*;
import com.testshaper.repository.ExamResultRepository;
import com.testshaper.security.TenantContext;
import com.testshaper.service.PerformanceReportService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PerformanceReportServiceImpl implements PerformanceReportService {

    @PersistenceContext
    private final EntityManager entityManager;

    @Override
    public StudentPerformanceDTO getStudentPerformance(LocalDateTime start, LocalDateTime end, UUID classId, UUID subjectId) {
        String tenantId = TenantContext.getTenantId();
        
        String sql = "SELECT AVG(score), MAX(score), MIN(score), " +
                     "COUNT(CASE WHEN score >= (total_marks * 0.4) THEN 1 END) * 100.0 / COUNT(*) " +
                     "FROM exam_results er " +
                     "JOIN exams e ON er.exam_id = e.id " +
                     "WHERE er.tenant_id = :tenantId AND er.submitted_at BETWEEN :start AND :end";
        
        if (subjectId != null) sql += " AND e.subject_id = :subjectId";
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("tenantId", tenantId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (subjectId != null) query.setParameter("subjectId", subjectId.toString());

        Object[] result = (Object[]) query.getSingleResult();
        
        if (result[0] == null) return new StudentPerformanceDTO();

        // Score Distribution Aggregation
        String distSql = "SELECT " +
                         "CASE WHEN (score/total_marks*100) >= 80 THEN '80-100' " +
                         "     WHEN (score/total_marks*100) >= 60 THEN '60-79' " +
                         "     WHEN (score/total_marks*100) >= 40 THEN '40-59' " +
                         "     ELSE '0-39' END as range_label, COUNT(*) " +
                         "FROM exam_results er " +
                         "JOIN exams e ON er.exam_id = e.id " +
                         "WHERE er.tenant_id = :tenantId AND er.submitted_at BETWEEN :start AND :end " +
                         "GROUP BY range_label";
        
        Query distQuery = entityManager.createNativeQuery(distSql);
        distQuery.setParameter("tenantId", tenantId);
        distQuery.setParameter("start", start);
        distQuery.setParameter("end", end);
        
        List<Object[]> distResults = distQuery.getResultList();
        Map<String, Long> distribution = new HashMap<>();
        for (Object[] row : distResults) {
            distribution.put((String) row[0], ((Number) row[1]).longValue());
        }

        return StudentPerformanceDTO.builder()
                .averageScore(((Number) result[0]).doubleValue())
                .highestScore(((Number) result[1]).doubleValue())
                .lowestScore(((Number) result[2]).doubleValue())
                .passRate(result[3] != null ? ((Number) result[3]).doubleValue() : 0.0)
                .scoreDistribution(distribution)
                .build();
    }

    @Override
    public List<QuestionPerformanceDTO> getQuestionPerformance(LocalDateTime start, LocalDateTime end, UUID subjectId) {
        String tenantId = TenantContext.getTenantId();
        
        String sql = "SELECT q.question_text, " +
                     "COUNT(CASE WHEN era.is_correct = true THEN 1 END) * 100.0 / COUNT(*) as correct_rate, " +
                     "COUNT(CASE WHEN era.is_correct = false AND era.is_skipped = false THEN 1 END) * 100.0 / COUNT(*) as wrong_rate, " +
                     "COUNT(CASE WHEN era.is_skipped = true THEN 1 END) * 100.0 / COUNT(*) as skip_rate, " +
                     "q.difficulty_level " +
                     "FROM exam_result_answers era " +
                     "JOIN questions q ON era.question_id = q.id " +
                     "JOIN exam_results er ON era.exam_result_id = er.id " +
                     "WHERE er.tenant_id = :tenantId AND er.submitted_at BETWEEN :start AND :end ";
        
        if (subjectId != null) sql += " AND q.subject_id = :subjectId ";
        
        sql += "GROUP BY q.id, q.question_text, q.difficulty_level ORDER BY correct_rate ASC LIMIT 20";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("tenantId", tenantId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (subjectId != null) query.setParameter("subjectId", subjectId.toString());

        List<Object[]> results = query.getResultList();
        List<QuestionPerformanceDTO> list = new ArrayList<>();
        for (Object[] row : results) {
            list.add(QuestionPerformanceDTO.builder()
                    .questionText((String) row[0])
                    .correctRate(((Number) row[1]).doubleValue())
                    .wrongRate(((Number) row[2]).doubleValue())
                    .skipRate(((Number) row[3]).doubleValue())
                    .difficulty(row[4].toString())
                    .build());
        }
        return list;
    }

    @Override
    public ExamPerformanceDTO getExamPerformance(UUID examId) {
        String tenantId = TenantContext.getTenantId();
        
        String sql = "SELECT AVG(score), MAX(score), MIN(score), COUNT(*) " +
                     "FROM exam_results WHERE exam_id = :examId AND tenant_id = :tenantId";
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("examId", examId.toString());
        query.setParameter("tenantId", tenantId);
        
        Object[] res = (Object[]) query.getSingleResult();
        if (res[0] == null) return new ExamPerformanceDTO();

        return ExamPerformanceDTO.builder()
                .averageScore(((Number) res[0]).doubleValue())
                .completionRate(100.0) // Simplified
                .build();
    }
}
