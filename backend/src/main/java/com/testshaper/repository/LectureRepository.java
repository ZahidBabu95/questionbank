package com.testshaper.repository;

import com.testshaper.entity.Lecture;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LectureRepository extends JpaRepository<Lecture, UUID> {
    Page<Lecture> findByTenantIdAndTitleContainingIgnoreCase(String tenantId, String title, Pageable pageable);

    Page<Lecture> findByTenantId(String tenantId, Pageable pageable);
}
