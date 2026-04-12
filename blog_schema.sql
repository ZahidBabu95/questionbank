-- Blog CMS Tables
CREATE TABLE cms_blog_categories (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 0
);

CREATE TABLE cms_blog_tags (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 0
);

CREATE TABLE cms_blog_posts (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    summary TEXT,
    content LONGTEXT,
    featured_image VARCHAR(255),
    category_id CHAR(36),
    author_id VARCHAR(255),
    author_name VARCHAR(255),
    publish_date DATETIME,
    status VARCHAR(20) DEFAULT 'DRAFT',
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords VARCHAR(255),
    og_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES cms_blog_categories(id)
);

CREATE TABLE cms_blog_post_tags (
    post_id CHAR(36) NOT NULL,
    tag_id CHAR(36) NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES cms_blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES cms_blog_tags(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_blog_post_slug ON cms_blog_posts(slug);
CREATE INDEX idx_blog_post_status ON cms_blog_posts(status);
CREATE INDEX idx_blog_post_publish_date ON cms_blog_posts(publish_date);
CREATE INDEX idx_blog_category_slug ON cms_blog_categories(slug);
CREATE INDEX idx_blog_tag_slug ON cms_blog_tags(slug);

-- Initial Categories
INSERT INTO cms_blog_categories (id, name, slug, description) VALUES 
(UUID(), 'Education Tips', 'education-tips', 'General pedagogical strategies and classroom management tips.'),
(UUID(), 'Exam Preparation', 'exam-prep', 'How to help students score better in public and internal exams.'),
(UUID(), 'Technology in Education', 'ed-tech', 'Latest trends in AI, online learning, and digital assessments.');
