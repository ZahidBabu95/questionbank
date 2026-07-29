package com.testshaper.repository;

import com.testshaper.entity.ReviewerSubjectMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewerSubjectMappingRepository extends JpaRepository<ReviewerSubjectMapping, UUID> {

    List<ReviewerSubjectMapping> findByReviewerId(UUID reviewerId);

    void deleteByReviewerId(UUID reviewerId);
}
