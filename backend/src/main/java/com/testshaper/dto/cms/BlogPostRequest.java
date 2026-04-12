package com.testshaper.dto.cms;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class BlogPostRequest {
    private String title;
    private String slug; // Optional, auto-generated if blank
    private String summary;
    private String content; // Rich Text Content
    private String featuredImage;
    private UUID categoryId;
    private List<UUID> tagIds;
    private String status; // DRAFT, PUBLISHED, ARCHIVED
    private String publishDate; // Optional ISO string

    // SEO Fields
    private String metaTitle;
    private String metaDescription;
    private String metaKeywords;
    private String ogImage;
}
