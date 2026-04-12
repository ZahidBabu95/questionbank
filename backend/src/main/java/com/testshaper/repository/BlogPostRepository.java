package com.testshaper.repository;

import com.testshaper.entity.BlogCategory;
import com.testshaper.entity.BlogPost;
import com.testshaper.entity.BlogTag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, UUID> {
    Optional<BlogPost> findBySlugAndDeletedFalse(String slug);
    Page<BlogPost> findAllByDeletedFalse(Pageable pageable);
    Page<BlogPost> findByStatusAndDeletedFalseOrderByPublishDateDesc(BlogPost.PostStatus status, Pageable pageable);
    Page<BlogPost> findByStatusAndCategoryAndDeletedFalseOrderByPublishDateDesc(BlogPost.PostStatus status, BlogCategory category, Pageable pageable);
    Page<BlogPost> findByStatusAndTagsContainingAndDeletedFalseOrderByPublishDateDesc(BlogPost.PostStatus status, BlogTag tag, Pageable pageable);
    boolean existsBySlug(String slug);
}
