package com.testshaper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "academic_levels")
@Getter
@Setter
public class AcademicLevel extends BaseTenantEntity {

    @Column(nullable = false)
    private String name; // e.g., "Secondary" / "মাধ্যমিক"

    @Column(name = "level_order")
    private Integer order; // 1 (Primary), 2 (Secondary), etc.
}
