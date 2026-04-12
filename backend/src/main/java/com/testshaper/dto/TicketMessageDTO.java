package com.testshaper.dto;

import com.testshaper.entity.TicketMessage;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class TicketMessageDTO {
    private UUID id;
    private String message;
    private TicketMessage.SenderType senderType;
    private String attachmentUrl;
    private LocalDateTime createdAt;
    
    // Sender context (NULL for AI/System)
    private String senderName;
    private String senderEmail;
    private String senderProfileImage;
}
