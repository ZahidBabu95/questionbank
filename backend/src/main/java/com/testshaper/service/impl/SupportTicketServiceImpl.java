package com.testshaper.service.impl;

import com.testshaper.dto.CreateTicketRequest;
import com.testshaper.dto.ReplyTicketRequest;
import com.testshaper.dto.SupportTicketDTO;
import com.testshaper.dto.TicketMessageDTO;
import com.testshaper.entity.SupportTicket;
import com.testshaper.entity.TicketMessage;
import com.testshaper.entity.User;
import com.testshaper.repository.SupportTicketRepository;
import com.testshaper.repository.TicketMessageRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.SupportTicketService;
import com.testshaper.service.SupportAiBotService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupportTicketServiceImpl implements SupportTicketService {

    private final SupportTicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SupportAiBotService supportAiBotService;
    private final com.testshaper.repository.AppNotificationRepository notificationRepo;


    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void createNotification(User user, String title, String message, java.util.UUID relatedId) {
        com.testshaper.entity.AppNotification notif = new com.testshaper.entity.AppNotification();
        notif.setUser(user);
        notif.setTitle(title);
        notif.setMessage(message);
        notif.setType(com.testshaper.entity.AppNotification.NotificationType.SYSTEM);
        if (relatedId != null) {
            notif.setRelatedEntityId(relatedId.toString());
        }
        notificationRepo.save(notif);
    }

    private SupportTicketDTO mapToDTO(SupportTicket ticket, boolean includeMessages) {
        SupportTicketDTO dto = new SupportTicketDTO();
        dto.setId(ticket.getId());
        dto.setSubject(ticket.getSubject());
        dto.setCategory(ticket.getCategory());
        dto.setStatus(ticket.getStatus());
        dto.setAiHandled(ticket.isAiHandled());
        dto.setCreatedAt(ticket.getCreatedAt());
        dto.setUpdatedAt(ticket.getUpdatedAt());

        if (ticket.getUser() != null) {
            dto.setUserId(ticket.getUser().getId());
            dto.setUserName(ticket.getUser().getName());
            dto.setUserEmail(ticket.getUser().getEmail());
            dto.setUserProfileImage(ticket.getUser().getProfileImageUrl());
            
            // Extract role (simplified for DTO)
            if (ticket.getUser().getRoles() != null && !ticket.getUser().getRoles().isEmpty()) {
                dto.setUserRole(ticket.getUser().getRoles().iterator().next().getName());
            }
        }

        if (ticket.getAssignedTo() != null) {
            dto.setAssignedToName(ticket.getAssignedTo().getName());
        }

        List<TicketMessage> rawMessages = messageRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId());
        if (!rawMessages.isEmpty()) {
            dto.setLastMessagePreview(rawMessages.get(rawMessages.size() - 1).getMessage());
        }

        if (includeMessages) {
            dto.setMessages(rawMessages.stream().map(this::mapMessageToDTO).collect(Collectors.toList()));
        }

        return dto;
    }

    private TicketMessageDTO mapMessageToDTO(TicketMessage msg) {
        TicketMessageDTO dto = new TicketMessageDTO();
        dto.setId(msg.getId());
        dto.setMessage(msg.getMessage());
        dto.setSenderType(msg.getSenderType());
        dto.setAttachmentUrl(msg.getAttachmentUrl());
        dto.setCreatedAt(msg.getCreatedAt());

        if (msg.getSender() != null) {
            dto.setSenderName(msg.getSender().getName());
            dto.setSenderEmail(msg.getSender().getEmail());
            dto.setSenderProfileImage(msg.getSender().getProfileImageUrl());
        }

        return dto;
    }

    @Override
    @Transactional
    public SupportTicketDTO createTicket(String userEmail, CreateTicketRequest request) {
        User user = getUserByEmail(userEmail);

        SupportTicket ticket = new SupportTicket();
        ticket.setUser(user);
        ticket.setSubject(request.getSubject());
        ticket.setCategory(request.getCategory() != null ? request.getCategory() : SupportTicket.TicketCategory.GENERAL);
        ticket.setStatus(SupportTicket.TicketStatus.OPEN);
        ticket = ticketRepository.save(ticket);

        TicketMessage initialMsg = new TicketMessage();
        initialMsg.setTicket(ticket);
        initialMsg.setSender(user);
        initialMsg.setSenderType(TicketMessage.SenderType.USER);
        initialMsg.setMessage(request.getInitialMessage());
        initialMsg.setAttachmentUrl(request.getAttachmentUrl());
        messageRepository.save(initialMsg);

        // AI Chatbot Integration
        supportAiBotService.processNewTicket(ticket, request.getInitialMessage());

        return mapToDTO(ticket, true);
    }


    @Override
    @Transactional
    public SupportTicketDTO replyToTicket(UUID ticketId, String userEmail, ReplyTicketRequest request, boolean isAdmin) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        User user = getUserByEmail(userEmail);

        // Security check
        if (!isAdmin && !ticket.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to reply to this ticket");
        }

        TicketMessage msg = new TicketMessage();
        msg.setTicket(ticket);
        msg.setSender(user);
        msg.setSenderType(isAdmin ? TicketMessage.SenderType.ADMIN : TicketMessage.SenderType.USER);
        msg.setMessage(request.getMessage());
        msg.setAttachmentUrl(request.getAttachmentUrl());
        messageRepository.save(msg);

        // Update ticket so updated_at triggers
        if (isAdmin && ticket.getStatus() == SupportTicket.TicketStatus.OPEN) {
            ticket.setStatus(SupportTicket.TicketStatus.IN_PROGRESS);
            // Notify User that Admin replied
            createNotification(ticket.getUser(), "Support Reply", "An Admin replied to your ticket: " + ticket.getSubject(), ticket.getId());
        } else if (isAdmin) {
            createNotification(ticket.getUser(), "Support Reply Update", "An Admin replied to your ticket: " + ticket.getSubject(), ticket.getId());
        } else if (!isAdmin && ticket.getStatus() == SupportTicket.TicketStatus.RESOLVED) {
            ticket.setStatus(SupportTicket.TicketStatus.OPEN); // User reopened
        }
        
        ticketRepository.save(ticket);

        return mapToDTO(ticket, true);
    }

    @Override
    public Page<SupportTicketDTO> getUserTickets(String userEmail, Pageable pageable) {
        User user = getUserByEmail(userEmail);
        return ticketRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(t -> mapToDTO(t, false));
    }

    @Override
    public Page<SupportTicketDTO> getAllTickets(SupportTicket.TicketStatus status, Pageable pageable) {
        if (status != null) {
            return ticketRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                    .map(t -> mapToDTO(t, false));
        }
        return ticketRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(t -> mapToDTO(t, false));
    }

    @Override
    public SupportTicketDTO getTicketDetails(UUID ticketId, String userEmail) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        
        User user = getUserByEmail(userEmail);
        
        // Quick access check. For production, inject Role security proper.
        boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName().contains("ADMIN"));
        
        if (!isAdmin && !ticket.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        return mapToDTO(ticket, true);
    }

    @Override
    @Transactional
    public SupportTicketDTO updateTicketStatus(UUID ticketId, SupportTicket.TicketStatus newStatus, String adminEmail) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        
        User admin = getUserByEmail(adminEmail);
        ticket.setStatus(newStatus);
        
        // Optional: Send system message about status change
        TicketMessage statusMsg = new TicketMessage();
        statusMsg.setTicket(ticket);
        statusMsg.setSenderType(TicketMessage.SenderType.SYSTEM);
        statusMsg.setMessage("Ticket status has been changed to " + newStatus + " by " + admin.getName());
        messageRepository.save(statusMsg);
        
        ticketRepository.save(ticket);
        return mapToDTO(ticket, true);
    }
}
