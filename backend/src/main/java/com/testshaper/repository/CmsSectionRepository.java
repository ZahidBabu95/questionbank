package com.testshaper.repository;

import com.testshaper.entity.CmsSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CmsSectionRepository extends JpaRepository<CmsSection, UUID> {
    Optional<CmsSection> findBySectionKeyAndDeletedFalse(String sectionKey);
    List<CmsSection> findAllByDeletedFalseOrderBySortOrderAsc();
    List<CmsSection> findAllByStatusAndDeletedFalseOrderBySortOrderAsc(CmsSection.SectionStatus status);
}
