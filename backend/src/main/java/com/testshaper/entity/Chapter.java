package com.testshaper.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "chapters")
@Getter
@Setter
public class Chapter extends BaseTenantEntity {

    @Column(nullable = false)
    private String name; // e.g., "Motion"

    @Column(name = "chapter_number")
    private Integer chapterNumber;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_subject_id", nullable = false)
    private ClassSubject classSubject;

    @OneToMany(mappedBy = "chapter", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Topic> topics = new java.util.ArrayList<>();
}
