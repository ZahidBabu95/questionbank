package com.testshaper.service;

import com.testshaper.dto.cms.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;

public interface BlogService {

    // Post Admin
    Page<BlogPostDTO> getAllPosts(Pageable pageable);
    BlogPostDTO getPostById(UUID id);
    BlogPostDTO getPostBySlug(String slug);
    BlogPostDTO createPost(BlogPostRequest request, String authorId, String authorName);
    BlogPostDTO updatePost(UUID id, BlogPostRequest request);
    void deletePost(UUID id);
    BlogPostDTO publishPost(UUID id);
    BlogPostDTO archivePost(UUID id);

    // Public
    Page<BlogPostDTO> getPublicPosts(Pageable pageable);
    BlogPostDTO getPublicPost(String slug);
    Page<BlogPostDTO> getPostsByCategory(String categorySlug, Pageable pageable);
    Page<BlogPostDTO> getPostsByTag(String tagSlug, Pageable pageable);

    // Category
    List<BlogCategoryDTO> getAllCategories();
    BlogCategoryDTO createCategory(String name, String description);
    BlogCategoryDTO updateCategory(UUID id, String name, String description);
    void deleteCategory(UUID id);

    // Tag
    List<BlogTagDTO> getAllTags();
    BlogTagDTO createTag(String name);
    void deleteTag(UUID id);
}
