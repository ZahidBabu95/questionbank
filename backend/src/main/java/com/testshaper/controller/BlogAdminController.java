package com.testshaper.controller;

import com.testshaper.dto.cms.*;
import com.testshaper.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cms/blog")
@RequiredArgsConstructor
public class BlogAdminController {

    private final BlogService blogService;

    @GetMapping("/posts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<Page<BlogPostDTO>> getAllPosts(Pageable pageable) {
        return ResponseEntity.ok(blogService.getAllPosts(pageable));
    }

    @PostMapping("/posts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<BlogPostDTO> createPost(@RequestBody BlogPostRequest request, Authentication auth) {
        // Assume author name is retrieved from custom user details if available, otherwise use name from auth
        String authorName = auth.getName(); 
        String authorId = auth.getName(); // In a real app, extract IDs from JWT claims
        return ResponseEntity.ok(blogService.createPost(request, authorId, authorName));
    }

    @GetMapping("/posts/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<BlogPostDTO> getPost(@PathVariable UUID id) {
        return ResponseEntity.ok(blogService.getPostById(id));
    }

    @PutMapping("/posts/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<BlogPostDTO> updatePost(@PathVariable UUID id, @RequestBody BlogPostRequest request) {
        return ResponseEntity.ok(blogService.updatePost(id, request));
    }

    @DeleteMapping("/posts/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<Void> deletePost(@PathVariable UUID id) {
        blogService.deletePost(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/posts/{id}/publish")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<BlogPostDTO> publishPost(@PathVariable UUID id) {
        return ResponseEntity.ok(blogService.publishPost(id));
    }

    @PatchMapping("/posts/{id}/archive")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<BlogPostDTO> archivePost(@PathVariable UUID id) {
        return ResponseEntity.ok(blogService.archivePost(id));
    }

    // Category Endpoints
    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<List<BlogCategoryDTO>> getCategories() {
        return ResponseEntity.ok(blogService.getAllCategories());
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<BlogCategoryDTO> createCategory(@RequestBody BlogCategoryDTO request) {
        return ResponseEntity.ok(blogService.createCategory(request.getName(), request.getDescription()));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<BlogCategoryDTO> updateCategory(@PathVariable UUID id, @RequestBody BlogCategoryDTO request) {
        return ResponseEntity.ok(blogService.updateCategory(id, request.getName(), request.getDescription()));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        blogService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    // Tag Endpoints
    @GetMapping("/tags")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<List<BlogTagDTO>> getTags() {
        return ResponseEntity.ok(blogService.getAllTags());
    }

    @PostMapping("/tags")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<BlogTagDTO> createTag(@RequestBody BlogTagDTO request) {
        return ResponseEntity.ok(blogService.createTag(request.getName()));
    }

    @DeleteMapping("/tags/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<Void> deleteTag(@PathVariable UUID id) {
        blogService.deleteTag(id);
        return ResponseEntity.noContent().build();
    }
}
