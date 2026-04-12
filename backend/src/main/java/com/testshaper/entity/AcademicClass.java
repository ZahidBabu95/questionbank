package com.testshaper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "academic_classes")
@Getter
@Setter
public class AcademicClass extends BaseTenantEntity {

    @Column(nullable = false)
    private String name; // e.g., "Class 10"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stream_id", nullable = false)
    private AcademicStream stream;

    @Column(name = "class_order")
    private Integer order; 
}
