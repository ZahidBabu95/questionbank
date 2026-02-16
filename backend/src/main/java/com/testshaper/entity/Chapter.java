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
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;
}
