package com.testshaper.repository;

import com.testshaper.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, UUID> {
    java.util.List<Chapter> findByClassSubjectId(UUID classSubjectId);
    java.util.List<Chapter> findByClassSubjectIdOrderByChapterNumberAsc(UUID classSubjectId);
    java.util.List<Chapter> findByTenantIdAndClassSubjectIdOrderByChapterNumberAsc(String tenantId, UUID classSubjectId);
    Optional<Chapter> findByTenantIdAndNameIgnoreCase(String tenantId, String name);
    Optional<Chapter> findByClassSubjectIdAndNameIgnoreCase(UUID classSubjectId, String name);
    java.util.List<Chapter> findByIsActiveFalse();
}
