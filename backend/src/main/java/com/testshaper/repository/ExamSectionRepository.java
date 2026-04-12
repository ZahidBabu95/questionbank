package com.testshaper.repository;

import com.testshaper.entity.ExamSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExamSectionRepository extends JpaRepository<ExamSection, UUID> {
    List<ExamSection> findByExamIdOrderBySectionOrderAsc(UUID examId);

    void deleteByExamId(UUID examId);
}
