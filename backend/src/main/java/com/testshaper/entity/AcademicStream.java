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
@Table(name = "academic_streams")
@Getter
@Setter
public class AcademicStream extends BaseTenantEntity {

    @Column(nullable = false)
    private String name; // e.g., "General", "Madrasah"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "level_id", nullable = false)
    private AcademicLevel level;

    @Column(name = "stream_order")
    private Integer order;
}
