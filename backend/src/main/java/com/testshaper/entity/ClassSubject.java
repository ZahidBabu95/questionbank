package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "class_subjects")
@Getter
@Setter
public class ClassSubject extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academic_class_id", nullable = false)
    private AcademicClass academicClass;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AcademicSession session;

    @Column(name = "version_notes")
    private String versionNotes; // e.g., "2024 Syllabus Update"

    @Column(name = "is_active")
    private boolean isActive = true;

    @OneToMany(mappedBy = "classSubject", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Chapter> chapters = new java.util.ArrayList<>();
}
