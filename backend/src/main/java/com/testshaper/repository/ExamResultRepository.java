package com.testshaper.repository;

import com.testshaper.entity.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ExamResultRepository extends JpaRepository<ExamResult, UUID> {
    java.util.List<ExamResult> findByStudentUsername(String studentUsername);
    java.util.List<ExamResult> findByExamId(UUID examId);
}
