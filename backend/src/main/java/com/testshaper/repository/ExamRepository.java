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

        @Query("SELECT e FROM Exam e WHERE (:tenantId = 'DEFAULT' OR e.tenantId = :tenantId) AND e.deleted = false " +
                        "AND (:title IS NULL OR LOWER(e.title) LIKE LOWER(CONCAT('%', :title, '%'))) " +
                        "AND (:createdBy IS NULL OR e.createdBy = :createdBy) " +
                        "AND (:examType IS NULL OR e.examType = :examType) " +
                        "AND (:status IS NULL OR e.status = :status)")
        Page<Exam> findByTenantAndOptionalCreator(@Param("tenantId") String tenantId,
                        @Param("title") String title,
                        @Param("createdBy") String createdBy,
                        @Param("examType") Exam.ExamType examType,
                        @Param("status") Exam.ExamStatus status,
                        Pageable pageable);

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
}
