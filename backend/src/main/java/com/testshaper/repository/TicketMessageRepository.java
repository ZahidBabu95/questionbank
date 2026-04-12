package com.testshaper.repository;

import com.testshaper.entity.TicketMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TicketMessageRepository extends JpaRepository<TicketMessage, UUID> {
    // Order messages chronologically (oldest to newest) to display like a chat
    List<TicketMessage> findByTicketIdOrderByCreatedAtAsc(UUID ticketId);
}
