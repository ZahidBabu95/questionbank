package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "lecture_attachments")
@Getter
@Setter
public class LectureAttachment extends BaseTenantEntity {

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "lecture_id", nullable = false)
    private UUID lectureId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "external_url", columnDefinition = "TEXT")
    private String externalUrl;

    @Column(name = "attachment_order")
    private Integer attachmentOrder = 0;

    @Column(name = "uploaded_by")
    private String uploadedBy;
}
