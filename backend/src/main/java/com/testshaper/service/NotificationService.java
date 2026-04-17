package com.testshaper.service;

import com.testshaper.dto.AppNotificationDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;

public interface NotificationService {
    Page<AppNotificationDTO> getUserNotifications(String email, Pageable pageable);
    long getUnreadCount(String email);
    void markAsRead(UUID notificationId, String email);
    void markAllAsRead(String email);
    void sendSystemAlertToSuperAdmins(String title, String message, String alertType);
}
