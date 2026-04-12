package com.testshaper.repository;

import com.testshaper.entity.AiUploadHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiUploadHistoryRepository extends JpaRepository<AiUploadHistory, UUID> {

    List<AiUploadHistory> findByDeletedFalseOrderByCreatedAtDesc();

    Optional<AiUploadHistory> findFirstByFileHashAndDeletedFalseOrderByCreatedAtDesc(String fileHash);

    @Query("SELECT h FROM AiUploadHistory h WHERE h.deleted = false " +
           "AND (:email IS NULL OR h.uploadedByEmail = :email) " +
           "AND (:success IS NULL OR h.success = :success) " +
           "ORDER BY h.createdAt DESC")
    List<AiUploadHistory> search(
            @Param("email") String email,
            @Param("success") Boolean success);

    @Query("SELECT COUNT(h) FROM AiUploadHistory h WHERE h.deleted = false AND h.success = true")
    long countSuccessful();

    @Query("SELECT COALESCE(SUM(h.questionsExtracted), 0) FROM AiUploadHistory h WHERE h.deleted = false AND h.success = true")
    long totalQuestionsExtracted();

    @Query("SELECT COALESCE(SUM(h.fileSize), 0) FROM AiUploadHistory h WHERE h.deleted = false")
    long totalFileSize();

    /**
     * Find a previous successful scrape of the same file that has a cached result JSON.
     * Used to return instant results without re-calling the AI API.
     */
    @Query("SELECT h FROM AiUploadHistory h WHERE h.fileHash = :fileHash " +
           "AND h.deleted = false AND h.success = true " +
           "AND h.cachedResultJson IS NOT NULL " +
           "ORDER BY h.createdAt DESC")
    Optional<AiUploadHistory> findCachedResultByFileHash(@Param("fileHash") String fileHash);

    /**
     * Update cached result JSON for an existing upload history record.
     */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE AiUploadHistory h SET h.cachedResultJson = :json WHERE h.fileHash = :fileHash AND h.success = true")
    void updateCachedResult(@Param("fileHash") String fileHash, @Param("json") String json);
}
