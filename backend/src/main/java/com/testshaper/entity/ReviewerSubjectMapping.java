package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Entity
@Table(name = "reviewer_subject_mappings", indexes = {
    @Index(name = "idx_rsm_user", columnList = "user_id"),
    @Index(name = "idx_rsm_class_subject", columnList = "class_subject_id")
})
@Getter
@Setter
public class ReviewerSubjectMapping extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_subject_id", nullable = false)
    private ClassSubject classSubject;
}
