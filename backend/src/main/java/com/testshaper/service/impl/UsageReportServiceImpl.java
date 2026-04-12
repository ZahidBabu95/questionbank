package com.testshaper.service.impl;

import com.testshaper.dto.reports.*;
import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.security.TenantContext;
import com.testshaper.service.UsageReportService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsageReportServiceImpl implements UsageReportService {

    @PersistenceContext
    private final EntityManager entityManager;

    private final QuestionRepository questionRepository;
    private final ExamRepository examRepository;
    private final LectureRepository lectureRepository;
    private final UserRepository userRepository;

    @Override
    public OverviewMetricsDTO getOverviewMetrics(LocalDateTime start, LocalDateTime end) {
        String tenantId = TenantContext.getTenantId();
        
        long qCount = (long) entityManager.createQuery(
                "SELECT COUNT(q) FROM Question q WHERE q.tenantId = :tenantId AND q.createdAt BETWEEN :start AND :end")
                .setParameter("tenantId", tenantId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        long eCount = (long) entityManager.createQuery(
                "SELECT COUNT(e) FROM Exam e WHERE e.tenantId = :tenantId AND e.createdAt BETWEEN :start AND :end")
                .setParameter("tenantId", tenantId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        long lCount = (long) entityManager.createQuery(
                "SELECT COUNT(l) FROM Lecture l WHERE l.tenantId = :tenantId AND l.createdAt BETWEEN :start AND :end")
                .setParameter("tenantId", tenantId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        long uCount = (long) entityManager.createQuery(
                "SELECT COUNT(u) FROM User u WHERE u.tenantId = :tenantId")
                .setParameter("tenantId", tenantId)
                .getSingleResult();

        return OverviewMetricsDTO.builder()
                .totalQuestions(qCount)
                .totalExams(eCount)
                .totalLectures(lCount)
                .totalUsers(uCount)
                .totalAIUsage(0) // Integration pending
                .build();
    }

    @Override
    public QuestionUsageReportDTO getQuestionUsageReport(LocalDateTime start, LocalDateTime end, UUID subjectId) {
        String tenantId = TenantContext.getTenantId();
        
        StringBuilder jpql = new StringBuilder("SELECT q.type, q.difficultyLevel, COUNT(q) FROM Question q WHERE q.tenantId = :tenantId AND q.createdAt BETWEEN :start AND :end");
        if (subjectId != null) {
            jpql.append(" AND q.subject.id = :subjectId");
        }
        jpql.append(" GROUP BY q.type, q.difficultyLevel");

        Query query = entityManager.createQuery(jpql.toString());
        query.setParameter("tenantId", tenantId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (subjectId != null) {
            query.setParameter("subjectId", subjectId);
        }

        List<Object[]> results = query.getResultList();
        
        Map<String, Long> byType = new HashMap<>();
        Map<String, Long> byDiff = new HashMap<>();
        long total = 0;

        for (Object[] row : results) {
            String type = (String) row[0];
            String diff = (String) row[1];
            long count = (long) row[2];
            
            byType.put(type, byType.getOrDefault(type, 0L) + count);
            byDiff.put(diff, byDiff.getOrDefault(diff, 0L) + count);
            total += count;
        }

        long usedInExams = (long) entityManager.createQuery(
                "SELECT COUNT(DISTINCT eq.question.id) FROM ExamQuestion eq JOIN eq.exam e WHERE e.tenantId = :tenantId AND e.createdAt BETWEEN :start AND :end")
                .setParameter("tenantId", tenantId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        return QuestionUsageReportDTO.builder()
                .totalQuestions(total)
                .byType(byType)
                .byDifficulty(byDiff)
                .usedInExams(usedInExams)
                .build();
    }

    @Override
    public ExamUsageReportDTO getExamUsageReport(LocalDateTime start, LocalDateTime end, UUID subjectId) {
        String tenantId = TenantContext.getTenantId();

        StringBuilder jpql = new StringBuilder("SELECT e.type, e.subject.id, COUNT(e) FROM Exam e WHERE e.tenantId = :tenantId AND e.createdAt BETWEEN :start AND :end");
        if (subjectId != null) {
            jpql.append(" AND e.subject.id = :subjectId");
        }
        jpql.append(" GROUP BY e.type, e.subject.id");

        Query query = entityManager.createQuery(jpql.toString());
        query.setParameter("tenantId", tenantId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (subjectId != null) {
            query.setParameter("subjectId", subjectId);
        }

        List<Object[]> results = query.getResultList();
        Map<String, Long> byType = new HashMap<>();
        long total = 0;

        for (Object[] row : results) {
            String type = String.valueOf(row[0]);
            long count = (long) row[2];
            byType.put(type, byType.getOrDefault(type, 0L) + count);
            total += count;
        }

        // Get average questions per exam
        Double avg = (Double) entityManager.createQuery(
                "SELECT AVG(SIZE(e.examQuestions)) FROM Exam e WHERE e.tenantId = :tenantId AND e.createdAt BETWEEN :start AND :end")
                .setParameter("tenantId", tenantId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        return ExamUsageReportDTO.builder()
                .totalExams(total)
                .byType(byType)
                .averageQuestions(avg != null ? avg : 0.0)
                .build();
    }

    @Override
    public List<TeacherActivityDTO> getTeacherActivityReport(LocalDateTime start, LocalDateTime end) {
        String tenantId = TenantContext.getTenantId();
        
        // This is a simplified version. In a production system, you'd aggregate across multiple tables.
        String sql = "SELECT u.full_name, " +
                     "(SELECT COUNT(*) FROM questions q WHERE q.created_by = u.username AND q.tenant_id = u.tenant_id AND q.created_at BETWEEN :start AND :end) as q_count, " +
                     "(SELECT COUNT(*) FROM exams e WHERE e.created_by = u.username AND e.tenant_id = u.tenant_id AND e.created_at BETWEEN :start AND :end) as e_count " +
                     "FROM users u WHERE u.tenant_id = :tenantId AND u.role = 'TEACHER'";
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("start", start);
        query.setParameter("end", end);
        query.setParameter("tenantId", tenantId);

        List<Object[]> results = query.getResultList();
        
        return results.stream().map(row -> TeacherActivityDTO.builder()
                .teacherName((String) row[0])
                .questionsCreated(((Number) row[1]).longValue())
                .examsGenerated(((Number) row[2]).longValue())
                .activityScore(((Number) row[1]).doubleValue() * 2 + ((Number) row[2]).doubleValue() * 5)
                .build())
                .collect(Collectors.toList());
    }
}
