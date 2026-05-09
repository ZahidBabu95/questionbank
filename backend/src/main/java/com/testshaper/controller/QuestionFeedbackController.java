package com.testshaper.controller;

import com.testshaper.entity.Question;
import com.testshaper.service.QuestionFeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class QuestionFeedbackController {

    private final QuestionFeedbackService feedbackService;

    // --- Likes ---
    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(feedbackService.toggleLike(id, authentication.getName()));
    }

    @GetMapping("/{id}/like")
    public ResponseEntity<Map<String, Boolean>> hasLiked(@PathVariable UUID id, Authentication authentication) {
        boolean liked = feedbackService.hasLiked(id, authentication.getName());
        return ResponseEntity.ok(Map.of("liked", liked));
    }

    // --- Favorites ---
    @PostMapping("/{id}/favorite")
    public ResponseEntity<Map<String, Object>> toggleFavorite(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(feedbackService.toggleFavorite(id, authentication.getName()));
    }

    @GetMapping("/{id}/favorite")
    public ResponseEntity<Map<String, Boolean>> hasFavorited(@PathVariable UUID id, Authentication authentication) {
        boolean favorited = feedbackService.hasFavorited(id, authentication.getName());
        return ResponseEntity.ok(Map.of("favorited", favorited));
    }

    @GetMapping("/favorites/my")
    public ResponseEntity<Page<Question>> getMyFavorites(
            Authentication authentication,
            @PageableDefault(size = 50) Pageable pageable) {
        Page<Question> favorites = feedbackService.getUserFavorites(authentication.getName(), pageable);
        
        // Null out heavy content for list view scaling
        favorites.getContent().forEach(q -> {
            q.setOptions(null);
            q.setExplanation(null);
            q.setCorrectAnswer(null);
        });
        
        return ResponseEntity.ok(favorites);
    }

    @GetMapping("/favorites/my/ids")
    public ResponseEntity<java.util.List<UUID>> getMyFavoriteIds(Authentication authentication) {
        return ResponseEntity.ok(feedbackService.getUserFavoriteIds(authentication.getName()));
    }
}
