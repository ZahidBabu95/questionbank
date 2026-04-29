package com.testshaper.repository;

import com.testshaper.entity.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID>, JpaSpecificationExecutor<Question> {

        List<Question> findByClassSubjectId(UUID classSubjectId);

        @Query("SELECT q FROM Question q " +
               "LEFT JOIN FETCH q.classSubject cs " +
               "LEFT JOIN FETCH cs.academicClass " +
               "LEFT JOIN FETCH cs.subject " +
               "LEFT JOIN FETCH q.chapter " +
               "LEFT JOIN FETCH q.topic " +
               "WHERE q.status = :status")
        List<Question> findByStatus(@Param("status") Question.QuestionStatus status);

        boolean existsBySourceReferenceAndStatus(String sourceReference, Question.QuestionStatus status);

        /**
         * Full-featured paginated question search for the manual exam builder.
         * All filters are optional (null = ignore that filter).
         */
        @Query(value = "SELECT q FROM Question q " +
                        "LEFT JOIN FETCH q.classSubject cs " +
                        "LEFT JOIN FETCH cs.academicClass " +
                        "LEFT JOIN FETCH cs.subject " +
                        "LEFT JOIN FETCH q.chapter " +
                        "LEFT JOIN FETCH q.topic " +
                        "WHERE (:tenantId = 'DEFAULT' OR q.tenantId = :tenantId) " +
                        "AND q.status = 'APPROVED' " +
                        "AND q.deleted = false " +
                        "AND (:classSubjectId IS NULL OR cs.id = :classSubjectId) " +
                        "AND (:chapterId IS NULL OR q.chapter.id = :chapterId) " +
                        "AND (:topicId IS NULL OR q.topic.id = :topicId) " +
                        "AND (:type IS NULL OR q.type = :type) " +
                        "AND (:difficulty IS NULL OR q.difficulty = :difficulty) " +
                        "AND (:language IS NULL OR q.language = :language) " +
                        "AND (:keyword IS NULL OR LOWER(q.questionText) LIKE LOWER(CONCAT('%', :keyword, '%')))",
               countQuery = "SELECT COUNT(q) FROM Question q " +
                        "LEFT JOIN q.classSubject cs " +
                        "WHERE (:tenantId = 'DEFAULT' OR q.tenantId = :tenantId) " +
                        "AND q.status = 'APPROVED' " +
                        "AND q.deleted = false " +
                        "AND (:classSubjectId IS NULL OR cs.id = :classSubjectId) " +
                        "AND (:chapterId IS NULL OR q.chapter.id = :chapterId) " +
                        "AND (:topicId IS NULL OR q.topic.id = :topicId) " +
                        "AND (:type IS NULL OR q.type = :type) " +
                        "AND (:difficulty IS NULL OR q.difficulty = :difficulty) " +
                        "AND (:language IS NULL OR q.language = :language) " +
                        "AND (:keyword IS NULL OR LOWER(q.questionText) LIKE LOWER(CONCAT('%', :keyword, '%')))")
        Page<Question> searchApproved(
                        @Param("tenantId") String tenantId,
                        @Param("classSubjectId") UUID classSubjectId,
                        @Param("chapterId") UUID chapterId,
                        @Param("topicId") UUID topicId,
                        @Param("type") Question.QuestionType type,
                        @Param("difficulty") Question.DifficultyLevel difficulty,
                        @Param("language") String language,
                        @Param("keyword") String keyword,
                        Pageable pageable);

        @Query("SELECT q.type, count(q) FROM Question q GROUP BY q.type")
        List<Object[]> countQuestionsByType();

        long countByTenantId(String tenantId);

        long countByCreatedBy(String createdBy);
}
