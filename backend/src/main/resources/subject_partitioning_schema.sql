-- ============================================================================
-- 🚀 QuestionShaper Enterprise Master Subject Partitioning & Indexing Schema
-- Optimized for 10,000,000+ (10M+) Questions & Ultra-Fast Multi-Tenant Searches
-- ============================================================================

-- 1. High-Performance Composite Indexes for Instant Lookups
CREATE INDEX IF NOT EXISTS idx_q_subject_partition_cover 
ON questions (class_subject_id, deleted, status, type, difficulty);

CREATE INDEX IF NOT EXISTS idx_q_chapter_topic_cover 
ON questions (class_subject_id, chapter_id, topic_id, deleted, status);

CREATE INDEX IF NOT EXISTS idx_q_sources_lookup 
ON question_sources (question_id, source_type, organization_name, exam_year);

CREATE INDEX IF NOT EXISTS idx_q_options_correct_lookup 
ON question_options (question_id, is_correct, option_label);

-- 2. MySQL / PostgreSQL Horizontal Table Partitioning Template by class_subject_id
-- Note: Execute this ALTER TABLE script on MySQL / PostgreSQL production databases 
-- to partition 10M+ question rows into lightweight per-subject partitions.

/*
ALTER TABLE questions DROP PRIMARY KEY, ADD PRIMARY KEY (id, class_subject_id);

ALTER TABLE questions PARTITION BY HASH(class_subject_id) PARTITIONS 64;
*/

-- 3. Fast Availability Aggregation Index
CREATE INDEX IF NOT EXISTS idx_q_avail_speed 
ON questions (class_subject_id, status, deleted, language, type, difficulty, chapter_id, topic_id);
