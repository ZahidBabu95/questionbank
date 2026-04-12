package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cms_blog_tags", indexes = {
    @Index(name = "idx_tag_slug", columnList = "slug", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
public class BlogTag extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @ManyToMany(mappedBy = "tags")
    private List<BlogPost> posts = new ArrayList<>();
}
