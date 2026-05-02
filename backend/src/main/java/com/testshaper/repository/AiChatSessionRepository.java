package com.testshaper.repository;

import com.testshaper.entity.AiChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSession, UUID> {
    List<AiChatSession> findByUserIdAndTenantIdAndDeletedFalseOrderByUpdatedAtDesc(Long userId, String tenantId);
    List<AiChatSession> findByTenantIdAndDeletedFalseOrderByUpdatedAtDesc(String tenantId);
    List<AiChatSession> findAllByDeletedFalseOrderByUpdatedAtDesc();
}
