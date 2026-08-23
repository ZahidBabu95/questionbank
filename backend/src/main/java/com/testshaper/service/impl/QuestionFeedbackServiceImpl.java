package com.testshaper.service.impl;

import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.service.QuestionFeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class QuestionFeedbackServiceImpl implements QuestionFeedbackService {

    private final QuestionLikeRepository likeRepository;
    private final QuestionFavoriteRepository favoriteRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final AppNotificationRepository notificationRepository;

    @Override
    @Transactional
    public Map<String, Object> toggleLike(UUID questionId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        Optional<QuestionLike> existingLike = likeRepository.findByQuestionAndUser(question, user);
        boolean isLiked;

        if (existingLike.isPresent()) {
            likeRepository.delete(existingLike.get());
            question.setLikesCount(Math.max(0, question.getLikesCount() - 1));
            isLiked = false;
        } else {
            QuestionLike like = new QuestionLike();
            like.setQuestion(question);
            like.setUser(user);
            likeRepository.save(like);
            question.setLikesCount(question.getLikesCount() + 1);
            isLiked = true;
        }

        questionRepository.save(question);
        return Map.of("liked", isLiked, "likesCount", question.getLikesCount());
    }

    @Override
    public boolean hasLiked(UUID questionId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));
        return likeRepository.existsByQuestionAndUser(question, user);
    }

    @Override
    @Transactional
    public Map<String, Object> toggleFavorite(UUID questionId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        Optional<QuestionFavorite> existingFavorite = favoriteRepository.findByQuestionAndUser(question, user);
        boolean isFavorited;

        if (existingFavorite.isPresent()) {
            favoriteRepository.delete(existingFavorite.get());
            question.setFavoritesCount(Math.max(0, question.getFavoritesCount() - 1));
            isFavorited = false;
        } else {
            QuestionFavorite favorite = new QuestionFavorite();
            favorite.setQuestion(question);
            favorite.setUser(user);
            favoriteRepository.save(favorite);
            question.setFavoritesCount(question.getFavoritesCount() + 1);
            isFavorited = true;
        }

        questionRepository.save(question);
        return Map.of("favorited", isFavorited, "favoritesCount", question.getFavoritesCount());
    }

    @Override
    public boolean hasFavorited(UUID questionId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));
        return favoriteRepository.existsByQuestionAndUser(question, user);
    }

    @Override
    public Page<Question> getUserFavorites(String userEmail, Pageable pageable) {
        return getUserFavorites(userEmail, java.util.Map.of(), pageable);
    }

    @Override
    public Page<Question> getUserFavorites(String userEmail, java.util.Map<String, String> filters, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        java.util.List<UUID> favoriteQuestionIds = favoriteRepository.findQuestionIdsByUserId(user.getId());
        if (favoriteQuestionIds == null || favoriteQuestionIds.isEmpty()) {
            return Page.empty(pageable);
        }

        org.springframework.data.jpa.domain.Specification<Question> favSpec = 
                (root, query, cb) -> root.get("id").in(favoriteQuestionIds);

        if (filters != null && !filters.isEmpty()) {
            org.springframework.data.jpa.domain.Specification<Question> filterSpec = 
                com.testshaper.specification.QuestionSpecification.filterQuestions(
                    null,
                    filters.get("filterStatus"),
                    filters.get("filterType"),
                    filters.get("search"),
                    filters.get("language"),
                    filters.get("levelId"),
                    filters.get("streamId"),
                    filters.get("classId"),
                    filters.get("subjectId"),
                    filters.get("chapterId"),
                    filters.get("topicId"),
                    filters.get("className"),
                    filters.get("subjectName"),
                    null,
                    null,
                    filters.get("sourceBoards"),
                    filters.get("sourceYears"),
                    filters.get("sourceSchools"),
                    filters.get("filterUnanswered")
                );
            favSpec = favSpec.and(filterSpec);
        }

        return questionRepository.findAll(favSpec, pageable);
    }

    @Override
    public java.util.List<UUID> getUserFavoriteIds(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return favoriteRepository.findQuestionIdsByUserId(user.getId());
    }

    @Override
    @Transactional
    public void sendNotification(UUID userId, String title, String message, String type, String relatedEntityId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AppNotification notification = new AppNotification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(AppNotification.NotificationType.valueOf(type));
        notification.setRelatedEntityId(relatedEntityId);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void awardXP(UUID userId, int points) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setContributionPoints(user.getContributionPoints() + points);
        userRepository.save(user);
        
        // Notify them about the point award
        sendNotification(userId, "Contribution Points Awarded! \uD83C\uDF89", 
            "You have earned +" + points + " XP for your contribution to the Question Bank.", 
            "ACHIEVEMENT", null);
    }
}
