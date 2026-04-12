package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.UUID;

/**
 * Stores extracted questions per chunk of a processing job.
 * This ensures partial results are preserved even if processing stops midway.
 */
@Entity
@Table(name = "ai_chunk_results", indexes = {
        @Index(name = "idx_chunk_result_job_id", columnList = "job_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_chunk_result_job_chunk", columnNames = {"job_id", "chunk_number"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChunkResult extends BaseEntity {

    @Column(name = "job_id", nullable = false, columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID jobId;

    @Column(name = "chunk_number", nullable = false)
    private int chunkNumber;

    @Column(name = "start_page")
    private int startPage;

    @Column(name = "end_page")
    private int endPage;

    @Column(name = "questions_json", columnDefinition = "LONGTEXT")
    private String questionsJson;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    @Column(name = "questions_count")
    private int questionsCount;

    @Column(name = "processing_time_ms")
    private long processingTimeMs;
}
