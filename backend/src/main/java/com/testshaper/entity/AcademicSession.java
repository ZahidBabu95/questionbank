package com.testshaper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "academic_sessions")
@Getter
@Setter
public class AcademicSession extends BaseTenantEntity {

    @Column(nullable = false, unique = true)
    private String name; // e.g., "2024", "2023-2024"

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "is_active")
    private boolean isActive = false;
}
