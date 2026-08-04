package com.testshaper.repository;

import com.testshaper.entity.Exam;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ExamRepository extends JpaRepository<Exam, UUID> {

        @Query("SELECT e FROM Exam e " +
                        "LEFT JOIN FETCH e.classSubject cs " +
                        "LEFT JOIN FETCH cs.subject s " +
                        "LEFT JOIN FETCH cs.academicClass ac " +
                        "WHERE (:tenantId = 'DEFAULT' OR e.tenantId = :tenantId) AND e.deleted = false " +
                        "AND (:title IS NULL OR LOWER(e.title) LIKE LOWER(CONCAT('%', :title, '%'))) " +
                        "AND (:createdBy IS NULL OR e.createdBy = :createdBy) " +
                        "AND (:examType IS NULL OR e.examType = :examType) " +
                        "AND (:status IS NULL OR e.status = :status) " +
                        "AND (:classSubjectId IS NULL OR cs.id = :classSubjectId)")
        Page<Exam> findByTenantAndOptionalCreator(@Param("tenantId") String tenantId,
                        @Param("title") String title,
                        @Param("createdBy") String createdBy,
                        @Param("examType") Exam.ExamType examType,
                        @Param("status") Exam.ExamStatus status,
                        @Param("classSubjectId") java.util.UUID classSubjectId,
                        Pageable pageable);

        java.util.Optional<Exam> findByShareCode(String shareCode);
        boolean existsByShareCode(String shareCode);

        long countByTenantId(String tenantId);

        long countByCreatedBy(String createdBy);

        long countByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);
        long countByTenantIdAndCreatedAtBetween(String tenantId, java.time.LocalDateTime start, java.time.LocalDateTime end);
        long countByCreatedByAndCreatedAtBetween(String createdBy, java.time.LocalDateTime start, java.time.LocalDateTime end);

        @Query(value = "SELECT * FROM exams WHERE deleted = true " +
                        "AND (:title IS NULL OR LOWER(title) LIKE LOWER(CONCAT('%', :title, '%')))",
               countQuery = "SELECT count(*) FROM exams WHERE deleted = true " +
                        "AND (:title IS NULL OR LOWER(title) LIKE LOWER(CONCAT('%', :title, '%')))",
               nativeQuery = true)
        Page<Exam> findDeletedExams(@Param("title") String title, Pageable pageable);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.transaction.annotation.Transactional
        @Query(value = "UPDATE exams SET deleted = false WHERE id = :id", nativeQuery = true)
        void restoreExam(@Param("id") String id);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.transaction.annotation.Transactional
        @Query(value = "DELETE FROM exam_generation_rules WHERE exam_id IN (SELECT id FROM exams WHERE deleted = true)", nativeQuery = true)
        void deleteDeletedExamRules();

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.transaction.annotation.Transactional
        @Query(value = "DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE deleted = true)", nativeQuery = true)
        void deleteDeletedExamQuestions();

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.transaction.annotation.Transactional
        @Query(value = "DELETE FROM exams WHERE deleted = true", nativeQuery = true)
        void emptyRecycleBin();

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.transaction.annotation.Transactional
        @Query(value = "DELETE FROM exam_generation_rules WHERE exam_id = :id", nativeQuery = true)
        void deleteExamRules(@Param("id") String id);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.transaction.annotation.Transactional
        @Query(value = "DELETE FROM exam_questions WHERE exam_id = :id", nativeQuery = true)
        void deleteExamQuestions(@Param("id") String id);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.transaction.annotation.Transactional
        @Query(value = "DELETE FROM exams WHERE id = :id AND deleted = true", nativeQuery = true)
        void hardDeleteExam(@Param("id") String id);

        @Query("SELECT e FROM Exam e WHERE e.classSubject.academicClass.id = :classId AND e.status = com.testshaper.entity.Exam$ExamStatus.ONLINE_EXAM AND e.deleted = false")
        java.util.List<Exam> findActiveExamsByClassId(@Param("classId") UUID classId);

        @Query("SELECT DISTINCT e FROM Exam e " +
               "LEFT JOIN FETCH e.classSubject cs " +
               "LEFT JOIN FETCH cs.subject s " +
               "LEFT JOIN FETCH cs.academicClass ac " +
               "LEFT JOIN FETCH e.examQuestions eq " +
               "LEFT JOIN FETCH eq.question q " +
               "WHERE e.id = :id")
        java.util.Optional<Exam> findByIdWithQuestions(@Param("id") UUID id);
}
