package com.testshaper.repository;

import com.testshaper.entity.QuestionSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionSourceRepository extends JpaRepository<QuestionSource, UUID> {
    List<QuestionSource> findByQuestionId(UUID questionId);
    void deleteByQuestionId(UUID questionId);

    interface SourceSummaryProjection {
        QuestionSource.SourceType getSourceType();
        String getOrganizationName();
        Long getCount();
    }

    interface YearSummaryProjection {
        QuestionSource.SourceType getSourceType();
        Integer getExamYear();
        Long getCount();
    }

    @org.springframework.data.jpa.repository.Query("SELECT qs.sourceType as sourceType, qs.organizationName as organizationName, COUNT(qs.id) as count " +
           "FROM QuestionSource qs " +
           "WHERE qs.organizationName IS NOT NULL " +
           "GROUP BY qs.sourceType, qs.organizationName " +
           "ORDER BY count DESC, qs.organizationName ASC")
    List<SourceSummaryProjection> getSourceSummary();

    @org.springframework.data.jpa.repository.Query("SELECT qs.sourceType as sourceType, qs.examYear as examYear, COUNT(qs.id) as count " +
           "FROM QuestionSource qs " +
           "WHERE qs.examYear IS NOT NULL " +
           "GROUP BY qs.sourceType, qs.examYear " +
           "ORDER BY count DESC, qs.examYear ASC")
    List<YearSummaryProjection> getYearSummary();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE QuestionSource qs SET qs.organizationName = :newName WHERE qs.organizationName = :oldName AND qs.sourceType = :sourceType")
    int renameOrganizationName(@org.springframework.data.repository.query.Param("oldName") String oldName, @org.springframework.data.repository.query.Param("newName") String newName, @org.springframework.data.repository.query.Param("sourceType") QuestionSource.SourceType sourceType);
    
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE QuestionSource qs SET qs.organizationName = :targetName WHERE qs.organizationName IN :oldNames AND qs.sourceType = :sourceType")
    int mergeOrganizationNames(@org.springframework.data.repository.query.Param("oldNames") List<String> oldNames, @org.springframework.data.repository.query.Param("targetName") String targetName, @org.springframework.data.repository.query.Param("sourceType") QuestionSource.SourceType sourceType);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE QuestionSource qs SET qs.examYear = :newYear WHERE qs.examYear = :oldYear AND qs.sourceType = :sourceType")
    int renameExamYear(@org.springframework.data.repository.query.Param("oldYear") Integer oldYear, @org.springframework.data.repository.query.Param("newYear") Integer newYear, @org.springframework.data.repository.query.Param("sourceType") QuestionSource.SourceType sourceType);
    
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE QuestionSource qs SET qs.examYear = :targetYear WHERE qs.examYear IN :oldYears AND qs.sourceType = :sourceType")
    int mergeExamYears(@org.springframework.data.repository.query.Param("oldYears") List<Integer> oldYears, @org.springframework.data.repository.query.Param("targetYear") Integer targetYear, @org.springframework.data.repository.query.Param("sourceType") QuestionSource.SourceType sourceType);
}
