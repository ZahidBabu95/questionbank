-- CMS Sections Table
CREATE TABLE cms_sections (
    id CHAR(36) PRIMARY KEY,
    section_name VARCHAR(100) NOT NULL,
    section_key VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 0
);

-- CMS Contents Table (Key-Value pairs for sections)
CREATE TABLE cms_section_contents (
    id CHAR(36) PRIMARY KEY,
    section_id CHAR(36) NOT NULL,
    content_key VARCHAR(100) NOT NULL,
    content_value TEXT,
    content_type VARCHAR(20) DEFAULT 'TEXT',
    FOREIGN KEY (section_id) REFERENCES cms_sections(id) ON DELETE CASCADE
);

-- Initial Data for Hero Section
INSERT INTO cms_sections (id, section_name, section_key, status, sort_order) 
VALUES (UUID(), 'Hero Section', 'HERO_SECTION', 'ACTIVE', 1);

-- Note: In a real migration, we'd capture the UUID and add contents. 
-- For now, the CMS UI can be used to populate these.
