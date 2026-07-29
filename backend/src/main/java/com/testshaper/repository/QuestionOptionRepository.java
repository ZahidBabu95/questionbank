package com.testshaper.repository;

import com.testshaper.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionOptionRepository extends JpaRepository<QuestionOption, UUID> {
    List<QuestionOption> findByQuestionIdOrderByOptionLabelAsc(UUID questionId);

    List<QuestionOption> findByQuestionIdIn(java.util.Collection<UUID> questionIds);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from QuestionOption o where o.question.id = :questionId")
    void deleteByQuestionId(UUID questionId);
}
