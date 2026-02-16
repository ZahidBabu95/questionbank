package com.testshaper.repository;

import com.testshaper.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionOptionRepository extends JpaRepository<QuestionOption, UUID> {
    List<QuestionOption> findByQuestionId(UUID questionId);
}
