package com.testshaper.repository;

import com.testshaper.entity.SourceBookMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SourceBookMasterRepository extends JpaRepository<SourceBookMaster, UUID> {
    List<SourceBookMaster> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    org.springframework.data.domain.Page<SourceBookMaster> findByTenantIdOrderByCreatedAtDesc(String tenantId, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM SourceBookMaster b WHERE b.tenantId = :tenantId AND " +
       "(:searchTerm IS NULL OR :searchTerm = '' OR LOWER(b.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(b.authorName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(b.publisher) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) AND " +
       "(:bookType IS NULL OR :bookType = 'ALL' OR CAST(b.bookType AS string) = :bookType) AND " +
       "(COALESCE(:classSubjectIds, NULL) IS NULL OR b.classSubject.id IN :classSubjectIds) " +
       "ORDER BY b.createdAt DESC")
    org.springframework.data.domain.Page<SourceBookMaster> searchBooks(
            @org.springframework.data.repository.query.Param("tenantId") String tenantId, 
            @org.springframework.data.repository.query.Param("searchTerm") String searchTerm, 
            @org.springframework.data.repository.query.Param("bookType") String bookType, 
            @org.springframework.data.repository.query.Param("classSubjectIds") java.util.List<UUID> classSubjectIds, 
            org.springframework.data.domain.Pageable pageable);
}
