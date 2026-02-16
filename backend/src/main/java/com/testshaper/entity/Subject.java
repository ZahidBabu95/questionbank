package com.testshaper.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "subjects")
@Getter
@Setter
public class Subject extends BaseTenantEntity {

    @Column(nullable = false)
    private String name; // e.g., "Physics"

    @Column(nullable = false, unique = true)
    private String code; // e.g., "PHYS-101"

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academic_class_id", nullable = false)
    private AcademicClass academicClass;
}
