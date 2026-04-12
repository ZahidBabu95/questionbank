package com.testshaper.dto;

import com.testshaper.entity.SupportTicket;
import lombok.Data;

@Data
public class CreateTicketRequest {
    private String subject;
    private SupportTicket.TicketCategory category;
    private String initialMessage;
    private String attachmentUrl; // Optional
}
