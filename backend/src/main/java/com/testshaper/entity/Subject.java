package com.testshaper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "subjects")
@Getter
@Setter
public class Subject extends BaseTenantEntity {

    @Column(nullable = false)
    private String name;      // "Physics"

    @Column(name = "code")
    private String code;      // "174"

    @Column(name = "paper")
    private String paper;     // "1st Paper", "2nd Paper", or null

    @Column(name = "is_english_version")
    private boolean isEnglishVersion = false;

    @Column(name = "description", length = 500)
    private String description;
}
