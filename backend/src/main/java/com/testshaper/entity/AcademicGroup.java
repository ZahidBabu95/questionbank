package com.testshaper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "academic_groups")
@Getter
@Setter
public class AcademicGroup extends BaseTenantEntity {

    @Column(nullable = false)
    private String name; // e.g., "Science", "Arts", "General"

    @Column(name = "group_order")
    private Integer order;
}
