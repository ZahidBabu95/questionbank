package com.testshaper.service;

import com.testshaper.entity.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;
import java.util.Map;

public interface QuestionFeedbackService {
    
    // Likes
    Map<String, Object> toggleLike(UUID questionId, String userEmail);
    boolean hasLiked(UUID questionId, String userEmail);

    // Favorites
    Map<String, Object> toggleFavorite(UUID questionId, String userEmail);
    boolean hasFavorited(UUID questionId, String userEmail);
    Page<Question> getUserFavorites(String userEmail, Map<String, String> filters, Pageable pageable);
    Page<Question> getUserFavorites(String userEmail, Pageable pageable);
    java.util.List<UUID> getUserFavoriteIds(String userEmail);

    // App Notifications (XP & Alerts)
    void sendNotification(UUID userId, String title, String message, String type, String relatedEntityId);
    void awardXP(UUID userId, int points);
}
