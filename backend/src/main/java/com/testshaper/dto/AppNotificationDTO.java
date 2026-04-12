package com.testshaper.dto;

import com.testshaper.entity.AppNotification;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AppNotificationDTO {
    private UUID id;
    private String title;
    private String message;
    private boolean read;
    private AppNotification.NotificationType type;
    private String relatedEntityId;
    private LocalDateTime createdAt;
}
