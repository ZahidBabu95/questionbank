package com.testshaper.repository;

import com.testshaper.entity.BackupHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BackupHistoryRepository extends JpaRepository<BackupHistory, UUID> {

    List<BackupHistory> findByTenantId(String tenantId);

    List<BackupHistory> findByTenantIdIsNull(); // For global/full backups

    List<BackupHistory> findAllByOrderByStartedAtDesc();
}
