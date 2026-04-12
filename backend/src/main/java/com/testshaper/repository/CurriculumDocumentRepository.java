package com.testshaper.repository;

import com.testshaper.entity.CurriculumDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CurriculumDocumentRepository extends JpaRepository<CurriculumDocument, UUID> {

    List<CurriculumDocument> findByAcademicYearOrderByCreatedAtDesc(Integer year);
    List<CurriculumDocument> findByProcessingStatus(CurriculumDocument.ProcessingStatus status);

    List<CurriculumDocument> findByIsActiveTrueOrderByAcademicYearDescCreatedAtDesc();

    @Query("SELECT DISTINCT c.academicYear FROM CurriculumDocument c WHERE c.deleted = false ORDER BY c.academicYear DESC")
    List<Integer> findDistinctYears();

    @Query("SELECT c FROM CurriculumDocument c WHERE c.deleted = false " +
           "AND (:year IS NULL OR c.academicYear = :year) " +
           "AND (:docType IS NULL OR c.docType = :docType) " +
           "AND (:educationLevel IS NULL OR c.educationLevel = :educationLevel) " +
           "AND (:className IS NULL OR LOWER(c.className) LIKE LOWER(CONCAT('%', :className, '%'))) " +
           "AND (:subjectName IS NULL OR LOWER(c.subjectName) LIKE LOWER(CONCAT('%', :subjectName, '%'))) " +
           "ORDER BY c.academicYear DESC, c.createdAt DESC")
    List<CurriculumDocument> search(
            @Param("year") Integer year,
            @Param("docType") CurriculumDocument.DocType docType,
            @Param("educationLevel") String educationLevel,
            @Param("className") String className,
            @Param("subjectName") String subjectName);

    List<CurriculumDocument> findByIsActiveTrueAndSubjectNameIgnoreCaseAndAcademicYear(
            String subjectName, Integer academicYear);
}
