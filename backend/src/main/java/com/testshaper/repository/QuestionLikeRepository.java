package com.testshaper.repository;

import com.testshaper.entity.QuestionLike;
import com.testshaper.entity.Question;
import com.testshaper.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuestionLikeRepository extends JpaRepository<QuestionLike, UUID> {
    boolean existsByQuestionAndUser(Question question, User user);
    Optional<QuestionLike> findByQuestionAndUser(Question question, User user);
    long countByQuestionId(UUID questionId);
    void deleteByQuestionId(UUID questionId);
}
