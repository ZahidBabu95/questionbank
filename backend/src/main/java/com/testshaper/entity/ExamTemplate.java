package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "exam_templates", indexes = {
        @Index(name = "idx_exam_template_tenant", columnList = "tenant_id")
})
@Getter
@Setter
public class ExamTemplate extends BaseTenantEntity {

    @Column(name = "template_name", nullable = false)
    private String templateName;

    @Column(name = "is_global")
    private boolean isGlobal = false;

    @Column(name = "structure_json", columnDefinition = "JSON")
    private String structureJson;

    @Column(name = "doc_settings_json", columnDefinition = "JSON")
    private String docSettingsJson;

    @Column(name = "created_by")
    private String createdBy;
}
