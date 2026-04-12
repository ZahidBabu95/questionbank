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
}
