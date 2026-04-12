package com.testshaper.service.impl;

import com.testshaper.dto.AppNotificationDTO;
import com.testshaper.entity.AppNotification;
import com.testshaper.entity.User;
import com.testshaper.repository.AppNotificationRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final AppNotificationRepository notificationRepository;
    private final UserRepository userRepository;

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private AppNotificationDTO mapToDTO(AppNotification entity) {
        AppNotificationDTO dto = new AppNotificationDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setMessage(entity.getMessage());
        dto.setRead(entity.isRead());
        dto.setType(entity.getType());
        dto.setRelatedEntityId(entity.getRelatedEntityId());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    @Override
    public Page<AppNotificationDTO> getUserNotifications(String email, Pageable pageable) {
        User user = getUserByEmail(email);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::mapToDTO);
    }

    @Override
    public long getUnreadCount(String email) {
        User user = getUserByEmail(email);
        return notificationRepository.countByUserIdAndReadFalse(user.getId());
    }

    @Override
    @Transactional
    public void markAsRead(UUID notificationId, String email) {
        User user = getUserByEmail(email);
        AppNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(String email) {
        User user = getUserByEmail(email);
        // Note: For efficiency, we can do a bulk update query in the repository in production,
        // but since we already have pagination and users check notifications often, a simple loop is fine for now.
        // Let's add a custom repository method or use findAll and filter, but we don't have a specific method.
        // Actually, let's just use native Spring Data capabilities if possible. We'll do an iteration limit.
        List<AppNotification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), Pageable.unpaged())
                .stream()
                .filter(n -> !n.isRead())
                .toList();
        
        for(AppNotification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
    }
}
