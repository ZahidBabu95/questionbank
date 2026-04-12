package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cms_blog_categories", indexes = {
    @Index(name = "idx_cat_slug", columnList = "slug", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
public class BlogCategory extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @OneToMany(mappedBy = "category")
    private List<BlogPost> posts = new ArrayList<>();
}
