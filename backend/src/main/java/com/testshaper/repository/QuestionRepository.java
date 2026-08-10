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

        List<Question> findByChapterId(UUID chapterId);


        @Query("SELECT q FROM Question q " +
               "LEFT JOIN FETCH q.classSubject cs " +
               "LEFT JOIN FETCH cs.academicClass " +
               "LEFT JOIN FETCH cs.subject " +
               "LEFT JOIN FETCH q.chapter " +
               "LEFT JOIN FETCH q.topic " +
               "WHERE q.status = :status")
        List<Question> findByStatus(@Param("status") Question.QuestionStatus status);

        long countByStatus(Question.QuestionStatus status);

        @Query("SELECT COUNT(DISTINCT q.classSubject.id) FROM Question q")
        long countDistinctClassSubjectIds();

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
                        "WHERE q.status = 'APPROVED' " +
                        "AND q.deleted = false " +
                        "AND (:tenantId IS NULL OR :tenantId IS NOT NULL) " +
                        "AND (q.chapter IS NULL OR q.chapter.isActive = true OR q.chapter.isActive IS NULL) " +
                        "AND (:classSubjectId IS NULL OR cs.id = :classSubjectId) " +
                        "AND (:chapterId IS NULL OR q.chapter.id = :chapterId) " +
                        "AND (:topicId IS NULL OR q.topic.id = :topicId) " +
                        "AND (:type IS NULL OR q.type = :type) " +
                        "AND (:difficulty IS NULL OR q.difficulty = :difficulty) " +
                        "AND (:language IS NULL OR q.language = :language OR q.language = 'Bilingual' OR :language = 'Bilingual' OR q.language IS NULL OR q.language = '') " +
                        "AND (:keyword IS NULL OR LOWER(q.questionText) LIKE LOWER(CONCAT('%', :keyword, '%')))",
               countQuery = "SELECT COUNT(q) FROM Question q " +
                        "LEFT JOIN q.classSubject cs " +
                        "WHERE q.status = 'APPROVED' " +
                        "AND q.deleted = false " +
                        "AND (:tenantId IS NULL OR :tenantId IS NOT NULL) " +
                        "AND (q.chapter IS NULL OR q.chapter.isActive = true OR q.chapter.isActive IS NULL) " +
                        "AND (:classSubjectId IS NULL OR cs.id = :classSubjectId) " +
                        "AND (:chapterId IS NULL OR q.chapter.id = :chapterId) " +
                        "AND (:topicId IS NULL OR q.topic.id = :topicId) " +
                        "AND (:type IS NULL OR q.type = :type) " +
                        "AND (:difficulty IS NULL OR q.difficulty = :difficulty) " +
                        "AND (:language IS NULL OR q.language = :language OR q.language = 'Bilingual' OR :language = 'Bilingual' OR q.language IS NULL OR q.language = '') " +
                        "AND (:keyword IS NULL OR LOWER(q.questionText) LIKE LOWER(CONCAT('%', :keyword, '%')))")
        Page<Question> searchApproved(
                        @Param("tenantId") String tenantId,
                        @Param("classSubjectId") UUID classSubjectId,
                        @Param("chapterId") UUID chapterId,
                        @Param("topicId") UUID topicId,
                        @Param("type") String type,
                        @Param("difficulty") Question.DifficultyLevel difficulty,
                        @Param("language") String language,
                        @Param("keyword") String keyword,
                        Pageable pageable);

        @Query("SELECT q.type, count(q) FROM Question q GROUP BY q.type")
        List<Object[]> countQuestionsByType();

        @Query("SELECT q.type, count(q) FROM Question q WHERE q.tenantId = :tenantId GROUP BY q.type")
        List<Object[]> countQuestionsByTypeForTenant(@Param("tenantId") String tenantId);

        @Query("SELECT q.type, count(q) FROM Question q WHERE q.createdBy = :createdBy GROUP BY q.type")
        List<Object[]> countQuestionsByTypeForCreator(@Param("createdBy") String createdBy);

        long countByTenantId(String tenantId);

        long countByCreatedBy(String createdBy);

        long countByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);
        long countByTenantIdAndCreatedAtBetween(String tenantId, java.time.LocalDateTime start, java.time.LocalDateTime end);
        long countByCreatedByAndCreatedAtBetween(String createdBy, java.time.LocalDateTime start, java.time.LocalDateTime end);

        @Query("SELECT q FROM Question q " +
               "LEFT JOIN FETCH q.options " +
               "WHERE q.parentQuestionId IN :parentIds AND q.createdBy = :createdBy AND q.status = 'REVISED'")
        List<Question> findPendingRevisionsByParentIdsAndCreator(@Param("parentIds") List<UUID> parentIds, @Param("createdBy") String createdBy);

        @Query("SELECT COUNT(q) FROM Question q WHERE q.status = 'APPROVED' AND q.deleted = false AND q.classSubject.id IN :subjectIds")
        long countApprovedQuestionsForSubjects(@Param("subjectIds") java.util.Collection<UUID> subjectIds);

        @Query("SELECT COUNT(q) FROM Question q WHERE q.status = 'APPROVED' AND q.deleted = false")
        long countApprovedQuestions();

        @Query("SELECT COUNT(q) FROM Question q WHERE q.status = 'APPROVED' AND q.deleted = false AND (:tenantId IS NULL OR :tenantId IS NOT NULL)")
        long countApprovedQuestionsForTenant(@Param("tenantId") String tenantId);

        @Query("SELECT cs.subject.name, ac.name, lvl.name, cs.subject.isEnglishVersion, COUNT(q) " +
               "FROM Question q " +
               "JOIN q.classSubject cs " +
               "LEFT JOIN cs.academicClass ac " +
               "LEFT JOIN ac.stream str " +
               "LEFT JOIN str.level lvl " +
               "WHERE q.status = 'APPROVED' AND q.deleted = false " +
               "GROUP BY cs.subject.name, ac.name, lvl.name, cs.subject.isEnglishVersion")
        List<Object[]> countApprovedQuestionsGroupedBySubject();

        @Query("SELECT cs.subject.name, ac.name, lvl.name, cs.subject.isEnglishVersion, COUNT(q) " +
               "FROM Question q " +
               "JOIN q.classSubject cs " +
               "LEFT JOIN cs.academicClass ac " +
               "LEFT JOIN ac.stream str " +
               "LEFT JOIN str.level lvl " +
               "WHERE q.status = 'APPROVED' AND q.deleted = false AND cs.id IN :subjectIds " +
               "GROUP BY cs.subject.name, ac.name, lvl.name, cs.subject.isEnglishVersion")
        List<Object[]> countApprovedQuestionsGroupedBySubjectForSubjectIds(@Param("subjectIds") java.util.Collection<UUID> subjectIds);

        @Query("SELECT cs.subject.name, ac.name, lvl.name, cs.subject.isEnglishVersion, COUNT(q) " +
               "FROM Question q " +
               "JOIN q.classSubject cs " +
               "LEFT JOIN cs.academicClass ac " +
               "LEFT JOIN ac.stream str " +
               "LEFT JOIN str.level lvl " +
               "WHERE q.status = 'APPROVED' AND q.deleted = false AND (:tenantId IS NULL OR :tenantId IS NOT NULL) " +
               "GROUP BY cs.subject.name, ac.name, lvl.name, cs.subject.isEnglishVersion")
        List<Object[]> countApprovedQuestionsGroupedBySubjectForTenant(@Param("tenantId") String tenantId);

        Page<Question> findByTenantIdAndDeletedFalse(String tenantId, Pageable pageable);

        Page<Question> findByCreatedByAndDeletedFalse(String createdBy, Pageable pageable);

        List<Question> findByTopicIdAndStatusAndDeletedFalse(UUID topicId, Question.QuestionStatus status);
        List<Question> findByChapterIdAndStatusAndDeletedFalse(UUID chapterId, Question.QuestionStatus status);

        @Query("SELECT q.classSubject.id, COUNT(q) FROM Question q WHERE q.status = 'APPROVED' AND q.deleted = false GROUP BY q.classSubject.id")
        List<Object[]> countApprovedQuestionsGroupedByClassSubjectId();

        @Query("SELECT q.classSubject.id, q.type, COUNT(q) FROM Question q WHERE q.status = 'APPROVED' AND q.deleted = false AND q.classSubject.id IS NOT NULL GROUP BY q.classSubject.id, q.type")
        List<Object[]> countApprovedQuestionsGroupedByClassSubjectIdAndType();

        @Query("SELECT q.chapter.id, COUNT(q) FROM Question q WHERE q.status = 'APPROVED' AND q.deleted = false AND q.chapter.id IS NOT NULL GROUP BY q.chapter.id")
        List<Object[]> countApprovedQuestionsGroupedByChapterId();
}
