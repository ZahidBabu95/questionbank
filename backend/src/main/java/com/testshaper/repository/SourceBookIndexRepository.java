package com.testshaper.repository;

import com.testshaper.entity.SourceBookIndex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SourceBookIndexRepository extends JpaRepository<SourceBookIndex, UUID> {
    List<SourceBookIndex> findBySourceBookIdOrderByStartPageAsc(UUID sourceBookId);
    List<SourceBookIndex> findBySourceBookIdAndMappedChapterIsNotNull(UUID sourceBookId);
    List<SourceBookIndex> findBySourceBookId(UUID sourceBookId);
    List<SourceBookIndex> findBySourceBookIdAndStartPageLessThanEqualAndEndPageGreaterThanEqual(UUID sourceBookId, Integer startPage, Integer endPage);
}
