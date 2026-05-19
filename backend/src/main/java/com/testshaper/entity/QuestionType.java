package com.testshaper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "question_types")
@Getter
@Setter
public class QuestionType extends BaseTenantEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(name = "is_system_default", nullable = false)
    private boolean isSystemDefault = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schema_template", columnDefinition = "json")
    private String schemaTemplate;

    @Column(name = "ai_prompt_template", columnDefinition = "TEXT")
    private String aiPromptTemplate;
}
