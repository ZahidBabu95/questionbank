package com.testshaper.repository;

import com.testshaper.entity.QuestionFavorite;
import com.testshaper.entity.Question;
import com.testshaper.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuestionFavoriteRepository extends JpaRepository<QuestionFavorite, UUID> {
    boolean existsByQuestionAndUser(Question question, User user);
    Optional<QuestionFavorite> findByQuestionAndUser(Question question, User user);
    long countByQuestionId(UUID questionId);
    Page<QuestionFavorite> findByUserId(UUID userId, Pageable pageable);
    void deleteByQuestionId(UUID questionId);
}
