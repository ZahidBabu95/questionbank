package com.testshaper.controller;

import com.testshaper.dto.cms.*;
import com.testshaper.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/blog")
@RequiredArgsConstructor
public class BlogPublicController {

    private final BlogService blogService;

    @GetMapping("/posts")
    public ResponseEntity<Page<BlogPostDTO>> getPublicPosts(Pageable pageable) {
        return ResponseEntity.ok(blogService.getPublicPosts(pageable));
    }

    @GetMapping("/posts/{slug}")
    public ResponseEntity<BlogPostDTO> getPublicPost(@PathVariable String slug) {
        return ResponseEntity.ok(blogService.getPublicPost(slug));
    }

    @GetMapping("/category/{slug}")
    public ResponseEntity<Page<BlogPostDTO>> getPostsByCategory(@PathVariable String slug, Pageable pageable) {
        return ResponseEntity.ok(blogService.getPostsByCategory(slug, pageable));
    }

    @GetMapping("/tag/{slug}")
    public ResponseEntity<Page<BlogPostDTO>> getPostsByTag(@PathVariable String slug, Pageable pageable) {
        return ResponseEntity.ok(blogService.getPostsByTag(slug, pageable));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<BlogCategoryDTO>> getAllCategories() {
        return ResponseEntity.ok(blogService.getAllCategories());
    }

    @GetMapping("/tags")
    public ResponseEntity<List<BlogTagDTO>> getAllTags() {
        return ResponseEntity.ok(blogService.getAllTags());
    }
}
