package com.testshaper.service.impl;

import com.testshaper.dto.cms.*;
import com.testshaper.entity.BlogCategory;
import com.testshaper.entity.BlogPost;
import com.testshaper.entity.BlogTag;
import com.testshaper.repository.BlogCategoryRepository;
import com.testshaper.repository.BlogPostRepository;
import com.testshaper.repository.BlogTagRepository;
import com.testshaper.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlogServiceImpl implements BlogService {

    private final BlogPostRepository postRepository;
    private final BlogCategoryRepository categoryRepository;
    private final BlogTagRepository tagRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<BlogPostDTO> getAllPosts(Pageable pageable) {
        return postRepository.findAllByDeletedFalse(pageable).map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public BlogPostDTO getPostById(UUID id) {
        BlogPost post = postRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        return mapToDTO(post);
    }

    @Override
    @Transactional(readOnly = true)
    public BlogPostDTO getPostBySlug(String slug) {
        BlogPost post = postRepository.findBySlugAndDeletedFalse(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        return mapToDTO(post);
    }

    @Override
    @Transactional
    public BlogPostDTO createPost(BlogPostRequest request, String authorId, String authorName) {
        BlogPost post = new BlogPost();
        post.setTitle(request.getTitle());
        String slug = (request.getSlug() == null || request.getSlug().isBlank()) 
                ? generateSlug(request.getTitle()) : request.getSlug();
        
        if (postRepository.existsBySlug(slug)) {
            slug = slug + "-" + UUID.randomUUID().toString().substring(0, 5);
        }
        post.setSlug(slug);
        post.setSummary(request.getSummary());
        post.setContent(request.getContent());
        post.setFeaturedImage(request.getFeaturedImage());
        post.setAuthorId(authorId);
        post.setAuthorName(authorName);
        
        if (request.getCategoryId() != null) {
            post.setCategory(categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Category")));
        }

        if (request.getTagIds() != null) {
            post.setTags(tagRepository.findAllById(request.getTagIds()));
        }

        if (request.getStatus() != null) {
            post.setStatus(BlogPost.PostStatus.valueOf(request.getStatus().toUpperCase()));
            if (post.getStatus() == BlogPost.PostStatus.PUBLISHED) {
                post.setPublishDate(LocalDateTime.now());
            }
        }

        // SEO Fields
        post.setMetaTitle(request.getMetaTitle());
        post.setMetaDescription(request.getMetaDescription());
        post.setMetaKeywords(request.getMetaKeywords());
        post.setOgImage(request.getOgImage());

        return mapToDTO(postRepository.save(post));
    }

    @Override
    @Transactional
    public BlogPostDTO updatePost(UUID id, BlogPostRequest request) {
        BlogPost post = postRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));

        post.setTitle(request.getTitle());
        if (request.getSlug() != null && !request.getSlug().equals(post.getSlug())) {
            if (postRepository.existsBySlug(request.getSlug())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug already exists");
            }
            post.setSlug(request.getSlug());
        }
        post.setSummary(request.getSummary());
        post.setContent(request.getContent());
        post.setFeaturedImage(request.getFeaturedImage());

        if (request.getCategoryId() != null) {
            post.setCategory(categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Category")));
        }

        if (request.getTagIds() != null) {
            post.setTags(tagRepository.findAllById(request.getTagIds()));
        }

        if (request.getStatus() != null) {
            BlogPost.PostStatus newStatus = BlogPost.PostStatus.valueOf(request.getStatus().toUpperCase());
            if (newStatus == BlogPost.PostStatus.PUBLISHED && post.getPublishDate() == null) {
                post.setPublishDate(LocalDateTime.now());
            }
            post.setStatus(newStatus);
        }

        // SEO Fields
        post.setMetaTitle(request.getMetaTitle());
        post.setMetaDescription(request.getMetaDescription());
        post.setMetaKeywords(request.getMetaKeywords());
        post.setOgImage(request.getOgImage());

        return mapToDTO(postRepository.save(post));
    }

    @Override
    @Transactional
    public void deletePost(UUID id) {
        BlogPost post = postRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        post.setDeleted(true);
        postRepository.save(post);
    }

    @Override
    @Transactional
    public BlogPostDTO publishPost(UUID id) {
        BlogPost post = postRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        post.setStatus(BlogPost.PostStatus.PUBLISHED);
        post.setPublishDate(LocalDateTime.now());
        return mapToDTO(postRepository.save(post));
    }

    @Override
    @Transactional
    public BlogPostDTO archivePost(UUID id) {
        BlogPost post = postRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        post.setStatus(BlogPost.PostStatus.ARCHIVED);
        return mapToDTO(postRepository.save(post));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BlogPostDTO> getPublicPosts(Pageable pageable) {
        return postRepository.findByStatusAndDeletedFalseOrderByPublishDateDesc(BlogPost.PostStatus.PUBLISHED, pageable)
                .map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public BlogPostDTO getPublicPost(String slug) {
        BlogPost post = postRepository.findBySlugAndDeletedFalse(slug)
                .filter(p -> p.getStatus() == BlogPost.PostStatus.PUBLISHED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Public post not found"));
        return mapToDTO(post);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BlogPostDTO> getPostsByCategory(String categorySlug, Pageable pageable) {
        BlogCategory category = categoryRepository.findBySlug(categorySlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        return postRepository.findByStatusAndCategoryAndDeletedFalseOrderByPublishDateDesc(BlogPost.PostStatus.PUBLISHED, category, pageable)
                .map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BlogPostDTO> getPostsByTag(String tagSlug, Pageable pageable) {
        BlogTag tag = tagRepository.findBySlug(tagSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tag not found"));
        return postRepository.findByStatusAndTagsContainingAndDeletedFalseOrderByPublishDateDesc(BlogPost.PostStatus.PUBLISHED, tag, pageable)
                .map(this::mapToDTO);
    }

    // Category Methods
    @Override
    @Transactional(readOnly = true)
    public List<BlogCategoryDTO> getAllCategories() {
        return categoryRepository.findAll().stream().map(this::mapCategoryDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BlogCategoryDTO createCategory(String name, String description) {
        BlogCategory category = new BlogCategory();
        category.setName(name);
        category.setSlug(generateSlug(name));
        category.setDescription(description);
        return mapCategoryDTO(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public BlogCategoryDTO updateCategory(UUID id, String name, String description) {
        BlogCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        category.setName(name);
        category.setDescription(description);
        return mapCategoryDTO(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public void deleteCategory(UUID id) {
        categoryRepository.deleteById(id);
    }

    // Tag Methods
    @Override
    @Transactional(readOnly = true)
    public List<BlogTagDTO> getAllTags() {
        return tagRepository.findAll().stream().map(this::mapTagDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BlogTagDTO createTag(String name) {
        BlogTag tag = new BlogTag();
        tag.setName(name);
        tag.setSlug(generateSlug(name));
        return mapTagDTO(tagRepository.save(tag));
    }

    @Override
    @Transactional
    public void deleteTag(UUID id) {
        tagRepository.deleteById(id);
    }

    // Mapping Helpers
    private BlogPostDTO mapToDTO(BlogPost entity) {
        BlogPostDTO dto = new BlogPostDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setSlug(entity.getSlug());
        dto.setSummary(entity.getSummary());
        dto.setContent(entity.getContent());
        dto.setFeaturedImage(entity.getFeaturedImage());
        dto.setStatus(entity.getStatus().name());
        dto.setAuthorId(entity.getAuthorId());
        dto.setAuthorName(entity.getAuthorName());
        dto.setPublishDate(entity.getPublishDate());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        
        if (entity.getCategory() != null) {
            dto.setCategory(mapCategoryDTO(entity.getCategory()));
        }
        
        dto.setTags(entity.getTags().stream().map(this::mapTagDTO).collect(Collectors.toList()));
        
        dto.setMetaTitle(entity.getMetaTitle());
        dto.setMetaDescription(entity.getMetaDescription());
        dto.setMetaKeywords(entity.getMetaKeywords());
        dto.setOgImage(entity.getOgImage());
        
        return dto;
    }

    private BlogCategoryDTO mapCategoryDTO(BlogCategory category) {
        BlogCategoryDTO dto = new BlogCategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setSlug(category.getSlug());
        dto.setDescription(category.getDescription());
        return dto;
    }

    private BlogTagDTO mapTagDTO(BlogTag tag) {
        BlogTagDTO dto = new BlogTagDTO();
        dto.setId(tag.getId());
        dto.setName(tag.getName());
        dto.setSlug(tag.getSlug());
        return dto;
    }

    private String generateSlug(String title) {
        return title.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", "-");
    }
}
