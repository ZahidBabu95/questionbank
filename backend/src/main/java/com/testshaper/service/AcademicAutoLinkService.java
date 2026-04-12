package com.testshaper.service;

import com.testshaper.entity.Question;
import java.util.Map;
import java.util.UUID;

/**
 * Auto-creates and links academic structure (Class → Subject → Chapter → Topic)
 * from AI-extracted metadata text, so questions get proper FK relations.
 */
public interface AcademicAutoLinkService {

    /**
     * Resolves metadata (className, subject, chapter, topic) to actual DB entities.
     * Creates missing entities automatically.
     * Sets classSubject, chapter, topic on the given Question.
     */
    void autoLink(Question question, Map<String, String> metadata);

    /**
     * Links a question directly using DB IDs from the hierarchy picker.
     * Faster and more reliable than name-based autoLink.
     * @param academicIds map with keys: classSubjectId, chapterId, topicId (UUIDs as strings)
     */
    void autoLinkByIds(Question question, Map<String, String> academicIds);

    /**
     * Partial link: handles AI-detected chapter/topic names under an already-resolved classSubject.
     * Use when classSubjectId is known (from picker) but chapter/topic need name-based resolution.
     * @param metadata map that may contain: chapter, topic, _classSubjectId (pre-resolved UUID)
     */
    void autoLinkPartial(Question question, Map<String, String> metadata);
}
