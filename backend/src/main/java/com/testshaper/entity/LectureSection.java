package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lecture_sections")
@Getter
@Setter
public class LectureSection extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lecture_id", nullable = false)
    private Lecture lecture;

    @Column(name = "section_title", nullable = false)
    private String sectionTitle;

    @Column(columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "section_order", nullable = false)
    private Integer sectionOrder = 0;

    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionOrder ASC")
    private List<LectureQuestion> sectionQuestions = new ArrayList<>();
}
