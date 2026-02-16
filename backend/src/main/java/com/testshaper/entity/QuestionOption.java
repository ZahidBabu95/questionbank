package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "question_options")
@Getter
@Setter
public class QuestionOption extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "option_label", nullable = false)
    private String optionLabel; // A, B, C, D...

    @Column(name = "option_text", columnDefinition = "LONGTEXT", nullable = false)
    private String optionText;

    @Column(name = "is_correct", nullable = false)
    private boolean isCorrect;

    @Column(name = "image_path")
    private String imagePath;
}
