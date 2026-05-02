package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "ai_tools")
@Getter
@Setter
@NoArgsConstructor
public class AiTool extends BaseEntity {

    @Column(nullable = false, unique = true, length = 100)
    private String name; // e.g. AUTO_EXAM_GENERATOR

    @Column(nullable = false, length = 100)
    private String displayName; // e.g. Auto Exam Generator

    @Column(columnDefinition = "TEXT")
    private String description; // Description for LLM Function Calling

    @Column(length = 255)
    private String frontendPath; // e.g. /exams/generate/auto

    @Column(length = 50)
    private String icon; // Lucide icon name, e.g. FileText

    @Column(columnDefinition = "TEXT")
    private String systemPrompt; // LLM prompt instruction for this specific tool

    @Column(columnDefinition = "TEXT")
    private String schemaJson; // The expected JSON schema output for this tool

    @Column(length = 100)
    private String permissionKey; // e.g. EXAM_PAPER_GENERATOR_AUTO_GENERATE_PLUS_TOOL

    @Column(nullable = false)
    private boolean isActive = true;
}
