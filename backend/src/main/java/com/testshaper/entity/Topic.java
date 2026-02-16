package com.testshaper.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "topics")
@Getter
@Setter
public class Topic extends BaseTenantEntity {

    @Column(nullable = false)
    private String name; // e.g., "Velocity"

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id", nullable = false)
    private Chapter chapter;
}
