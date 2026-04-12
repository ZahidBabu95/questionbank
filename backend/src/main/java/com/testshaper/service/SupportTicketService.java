package com.testshaper.service;

import com.testshaper.dto.CreateTicketRequest;
import com.testshaper.dto.ReplyTicketRequest;
import com.testshaper.dto.SupportTicketDTO;
import com.testshaper.entity.SupportTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;

public interface SupportTicketService {
    SupportTicketDTO createTicket(String userEmail, CreateTicketRequest request);
    SupportTicketDTO replyToTicket(UUID ticketId, String userEmail, ReplyTicketRequest request, boolean isAdmin);
    Page<SupportTicketDTO> getUserTickets(String userEmail, Pageable pageable);
    Page<SupportTicketDTO> getAllTickets(SupportTicket.TicketStatus status, Pageable pageable);
    SupportTicketDTO getTicketDetails(UUID ticketId, String userEmail);
    SupportTicketDTO updateTicketStatus(UUID ticketId, SupportTicket.TicketStatus newStatus, String adminEmail);
}
