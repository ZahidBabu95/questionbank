package com.testshaper.dto.cms;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class BlogPostDTO {
    private UUID id;
    private String title;
    private String slug;
    private String summary;
    private String content; // Rich Text Content
    private String featuredImage;
    private BlogCategoryDTO category;
    private List<BlogTagDTO> tags;
    private LocalDateTime publishDate;
    private String status;
    private String authorId;
    private String authorName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // SEO Data
    private String metaTitle;
    private String metaDescription;
    private String metaKeywords;
    private String ogImage;
}
