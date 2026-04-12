package com.testshaper.repository;

import com.testshaper.entity.ExamQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExamQuestionRepository extends JpaRepository<ExamQuestion, UUID> {

    List<ExamQuestion> findByExamIdOrderByQuestionOrderAsc(UUID examId);

    Optional<ExamQuestion> findByExamIdAndQuestionId(UUID examId, UUID questionId);

    boolean existsByExamIdAndQuestionId(UUID examId, UUID questionId);

    @Modifying
    @Query("DELETE FROM ExamQuestion eq WHERE eq.exam.id = :examId AND eq.question.id = :questionId")
    void deleteByExamIdAndQuestionId(@Param("examId") UUID examId, @Param("questionId") UUID questionId);

    @Query("SELECT COUNT(eq) FROM ExamQuestion eq WHERE eq.exam.id = :examId")
    int countByExamId(@Param("examId") UUID examId);

    @Query("SELECT COALESCE(SUM(eq.marks), 0) FROM ExamQuestion eq WHERE eq.exam.id = :examId")
    Double sumMarksByExamId(@Param("examId") UUID examId);

    void deleteByQuestionId(UUID questionId);
}
