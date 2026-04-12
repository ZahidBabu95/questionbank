package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cms_sections")
@Getter
@Setter
@NoArgsConstructor
public class CmsSection extends BaseEntity {

    @Column(name = "section_name", nullable = false)
    private String sectionName;

    @Column(name = "section_key", nullable = false, unique = true)
    private String sectionKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SectionStatus status = SectionStatus.ACTIVE;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<CmsSectionContent> contents = new ArrayList<>();

    public enum SectionStatus {
        ACTIVE, INACTIVE
    }

    public void addContent(CmsSectionContent content) {
        contents.add(content);
        content.setSection(this);
    }
}
