package com.testshaper.repository;

import com.testshaper.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public interface ExamQuestionPoolRepository extends JpaRepository<Question, UUID> {

    /**
     * Fetch approved questions matching exam criteria, excluding already-used
     * questions.
     * Optimized for large question banks with indexed lookups.
     */
    @Query("SELECT q.id FROM Question q " +
            "WHERE (:tenantId = 'DEFAULT' OR q.tenantId = :tenantId) " +
            "AND q.status = 'APPROVED' " +
            "AND q.classSubject.id = :classSubjectId " +
            "AND q.type = :type " +
            "AND q.difficulty = :difficulty " +
            "AND q.language = :language " +
            "AND (:chapterIds IS NULL OR q.chapter.id IN :chapterIds) " +
            "AND (q.id NOT IN :excludedIds) " +
            "AND q.deleted = false")
    List<UUID> findEligibleQuestionIds(
            @Param("tenantId") String tenantId,
            @Param("classSubjectId") UUID classSubjectId,
            @Param("type") Question.QuestionType type,
            @Param("difficulty") Question.DifficultyLevel difficulty,
            @Param("language") String language,
            @Param("chapterIds") Set<UUID> chapterIds,
            @Param("excludedIds") Set<UUID> excludedIds);

    @Query("SELECT COUNT(q) FROM Question q " +
            "WHERE (:tenantId = 'DEFAULT' OR q.tenantId = :tenantId) " +
            "AND q.status = 'APPROVED' " +
            "AND q.classSubject.id = :classSubjectId " +
            "AND q.deleted = false")
    long countAvailableQuestions(@Param("tenantId") String tenantId,
            @Param("classSubjectId") UUID classSubjectId);
}
