package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.GenericGenerator;

import java.util.UUID;

@Entity
@Table(name = "cms_section_contents")
@Getter
@Setter
@NoArgsConstructor
public class CmsSectionContent {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private CmsSection section;

    @Column(name = "content_key", nullable = false)
    private String contentKey;

    @Column(name = "content_value", columnDefinition = "TEXT")
    private String contentValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type")
    private ContentType contentType = ContentType.TEXT;

    public enum ContentType {
        TEXT, IMAGE, LINK, JSON
    }
}
