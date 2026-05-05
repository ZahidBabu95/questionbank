package com.testshaper.repository;

import com.testshaper.entity.Topic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TopicRepository extends JpaRepository<Topic, UUID> {
    java.util.List<Topic> findByChapterId(UUID chapterId);
    java.util.List<Topic> findByChapterIdOrderByNameAsc(UUID chapterId);
    java.util.List<Topic> findByTenantIdAndChapterIdOrderByNameAsc(String tenantId, UUID chapterId);
    Optional<Topic> findByTenantIdAndNameIgnoreCase(String tenantId, String name);

    Optional<Topic> findByChapterIdAndNameIgnoreCase(UUID chapterId, String name);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Topic t WHERE t.chapter.id = :chapterId")
    void deleteByChapterId(@org.springframework.data.repository.query.Param("chapterId") UUID chapterId);

    @org.springframework.data.jpa.repository.Query("SELECT t FROM Topic t WHERE t.chapter.id = :chapterId AND t.id NOT IN (SELECT c.mappedTopic.id FROM CurriculumDocumentChunk c WHERE c.mappedTopic IS NOT NULL) AND t.id NOT IN (SELECT q.topic.id FROM Question q WHERE q.topic IS NOT NULL)")
    List<Topic> findUnusedTopicsByChapterId(@org.springframework.data.repository.query.Param("chapterId") UUID chapterId);
}
