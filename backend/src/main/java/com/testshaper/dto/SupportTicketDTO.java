package com.testshaper.dto;

import com.testshaper.entity.SupportTicket;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

@Data
public class SupportTicketDTO {
    private UUID id;
    private String subject;
    private SupportTicket.TicketCategory category;
    private SupportTicket.TicketStatus status;
    private boolean aiHandled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // User Info (Creator)
    private UUID userId;
    private String userName;
    private String userEmail;
    private String userRole;
    private String userProfileImage;
    
    // Optional Admin Assignment
    private String assignedToName;
    
    // Last preview message (for list view)
    private String lastMessagePreview;
    
    // Full messages list (for details view)
    private List<TicketMessageDTO> messages;
}
