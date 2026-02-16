package com.testshaper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "academic_classes")
@Getter
@Setter
public class AcademicClass extends BaseTenantEntity {

    @Column(nullable = false)
    private String name; // e.g., "Class 10"

    @Column(name = "class_order")
    private Integer order; // For sorting (1, 2, 3...)
}
