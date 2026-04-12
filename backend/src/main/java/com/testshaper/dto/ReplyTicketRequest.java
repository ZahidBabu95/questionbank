package com.testshaper.dto;

import lombok.Data;

@Data
public class ReplyTicketRequest {
    private String message;
    private String attachmentUrl; // Optional
}
