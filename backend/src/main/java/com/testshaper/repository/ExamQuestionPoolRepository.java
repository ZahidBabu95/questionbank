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
            "WHERE q.status = 'APPROVED' " +
            "AND (:tenantId IS NULL OR :tenantId IS NOT NULL) " +
            "AND (:globalTenantId IS NULL OR :globalTenantId IS NOT NULL) " +
            "AND q.classSubject.id = :classSubjectId " +
            "AND q.type = :type " +
            "AND q.difficulty = :difficulty " +
            "AND (q.language = :language OR q.language = 'Bilingual' OR :language = 'Bilingual' OR q.language IS NULL OR q.language = '') " +
            "AND (:chapterIds IS NULL OR q.chapter.id IN :chapterIds) " +
            "AND (q.chapter IS NULL OR q.chapter.isActive = true OR q.chapter.isActive IS NULL) " +
            "AND (q.id NOT IN :excludedIds) " +
            "AND q.deleted = false")
    List<UUID> findEligibleQuestionIds(
            @Param("tenantId") String tenantId,
            @Param("globalTenantId") String globalTenantId,
            @Param("classSubjectId") UUID classSubjectId,
            @Param("type") String type,
            @Param("difficulty") Question.DifficultyLevel difficulty,
            @Param("language") String language,
            @Param("chapterIds") Set<UUID> chapterIds,
            @Param("excludedIds") Set<UUID> excludedIds);

    @Query("SELECT q.id FROM Question q " +
            "WHERE q.status = 'APPROVED' " +
            "AND (:tenantId IS NULL OR :tenantId IS NOT NULL) " +
            "AND (:globalTenantId IS NULL OR :globalTenantId IS NOT NULL) " +
            "AND q.classSubject.id = :classSubjectId " +
            "AND q.type = :type " +
            "AND q.difficulty = :difficulty " +
            "AND (q.language = :language OR q.language = 'Bilingual' OR :language = 'Bilingual' OR q.language IS NULL OR q.language = '') " +
            "AND (:topicIds IS NULL OR q.topic.id IN :topicIds) " +
            "AND (q.chapter IS NULL OR q.chapter.isActive = true OR q.chapter.isActive IS NULL) " +
            "AND (q.id NOT IN :excludedIds) " +
            "AND q.deleted = false")
    List<UUID> findEligibleQuestionIdsByTopic(
            @Param("tenantId") String tenantId,
            @Param("globalTenantId") String globalTenantId,
            @Param("classSubjectId") UUID classSubjectId,
            @Param("type") String type,
            @Param("difficulty") Question.DifficultyLevel difficulty,
            @Param("language") String language,
            @Param("topicIds") Set<UUID> topicIds,
            @Param("excludedIds") Set<UUID> excludedIds);

    @Query("SELECT COUNT(q) FROM Question q " +
            "WHERE q.status = 'APPROVED' " +
            "AND (:tenantId IS NULL OR :tenantId IS NOT NULL) " +
            "AND q.classSubject.id = :classSubjectId " +
            "AND (q.chapter IS NULL OR q.chapter.isActive = true OR q.chapter.isActive IS NULL) " +
            "AND q.deleted = false")
    long countAvailableQuestions(@Param("tenantId") String tenantId,
            @Param("classSubjectId") UUID classSubjectId);
}
