package com.testshaper.repository;

import com.testshaper.entity.UserActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, UUID> {
    Page<UserActivityLog> findByTargetUserIdOrderByCreatedAtDesc(UUID targetUserId, Pageable pageable);
    Page<UserActivityLog> findByActorIdOrderByCreatedAtDesc(UUID actorId, Pageable pageable);
    Page<UserActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
