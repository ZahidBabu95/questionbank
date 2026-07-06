package com.testshaper.repository;

import com.testshaper.entity.Lecture;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LectureRepository extends JpaRepository<Lecture, UUID> {
    Page<Lecture> findByTenantIdAndTitleContainingIgnoreCaseAndDeletedFalse(String tenantId, String title, Pageable pageable);

    Page<Lecture> findByTenantIdAndDeletedFalse(String tenantId, Pageable pageable);

    Page<Lecture> findByTenantIdAndClassSubjectIdAndDeletedFalse(String tenantId, UUID classSubjectId, Pageable pageable);

    Page<Lecture> findByTenantIdAndClassSubjectIdAndTitleContainingIgnoreCaseAndDeletedFalse(String tenantId, UUID classSubjectId, String title, Pageable pageable);
}
