package com.testshaper.repository;

import com.testshaper.entity.LectureQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LectureQuestionRepository extends JpaRepository<LectureQuestion, UUID> {
    void deleteByQuestionId(UUID questionId);
}
