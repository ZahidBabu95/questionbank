package com.testshaper.service.impl;

import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.security.TenantContext;
import com.testshaper.service.AcademicAutoLinkService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AcademicAutoLinkServiceImpl implements AcademicAutoLinkService {

    private final AcademicClassRepository classRepo;
    private final SubjectRepository subjectRepo;
    private final ClassSubjectRepository classSubjectRepo;
    private final ChapterRepository chapterRepo;
    private final TopicRepository topicRepo;
    private final AcademicSessionRepository sessionRepo;

    // ──── Partial link: AI chapter/topic names under pre-resolved classSubject ────
    @Override
    @Transactional
    public void autoLinkPartial(Question question, Map<String, String> metadata) {
        if (metadata == null || metadata.isEmpty()) return;
        try {
            String chapterName = clean(metadata.get("chapter"));
            String topicName   = clean(metadata.get("topic"));
            String csIdStr     = metadata.get("_classSubjectId");

            // Resolve classSubject from passed ID or from question
            ClassSubject classSubject = question.getClassSubject();
            if (classSubject == null && csIdStr != null && !csIdStr.isBlank()) {
                classSubject = classSubjectRepo.findById(UUID.fromString(csIdStr)).orElse(null);
            }

            String tenantId = TenantContext.getTenantId();
            if (tenantId == null) tenantId = "DEFAULT";

            // Resolve/create Chapter
            Chapter chapter = question.getChapter(); // may already be set
            if (chapter == null && chapterName != null && classSubject != null) {
                final ClassSubject cs = classSubject;
                final String tid = tenantId;
                chapter = chapterRepo.findByClassSubjectIdAndNameIgnoreCase(cs.getId(), chapterName)
                        .orElseGet(() -> {
                            Chapter ch = new Chapter();
                            ch.setName(chapterName);
                            ch.setClassSubject(cs);
                            ch.setTenantId(tid);
                            ch.setIsActive(true);
                            log.info("autoLinkPartial: auto-creating Chapter '{}'", chapterName);
                            return chapterRepo.save(ch);
                        });
                question.setChapter(chapter);
            }

            // Resolve/create Topic
            if (question.getTopic() == null && topicName != null && chapter != null) {
                final Chapter ch = chapter;
                final String tid = tenantId;
                Topic topic = topicRepo.findByChapterIdAndNameIgnoreCase(ch.getId(), topicName)
                        .orElseGet(() -> {
                            Topic t = new Topic();
                            t.setName(topicName);
                            t.setChapter(ch);
                            t.setTenantId(tid);
                            log.info("autoLinkPartial: auto-creating Topic '{}'", topicName);
                            return topicRepo.save(t);
                        });
                question.setTopic(topic);
            }

            log.info("autoLinkPartial done: chapter={}, topic={}", chapterName, topicName);
        } catch (Exception e) {
            log.warn("autoLinkPartial failed (non-fatal): {}", e.getMessage());
        }
    }

    // ──── ID-based linking (fast path from hierarchy picker) ────
    @Override
    @Transactional
    public void autoLinkByIds(Question question, Map<String, String> academicIds) {
        if (academicIds == null || academicIds.isEmpty()) return;
        try {
            String csId = academicIds.get("classSubjectId");
            String chId = academicIds.get("chapterId");
            String tId  = academicIds.get("topicId");

            if (csId != null && !csId.isBlank()) {
                classSubjectRepo.findById(UUID.fromString(csId)).ifPresent(question::setClassSubject);
            }
            if (chId != null && !chId.isBlank()) {
                chapterRepo.findById(UUID.fromString(chId)).ifPresent(question::setChapter);
            }
            if (tId != null && !tId.isBlank()) {
                topicRepo.findById(UUID.fromString(tId)).ifPresent(question::setTopic);
            }
            log.info("autoLinkByIds: classSubjectId={}, chapterId={}, topicId={}", csId, chId, tId);
        } catch (Exception e) {
            log.warn("autoLinkByIds failed (non-fatal): {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public void autoLink(Question question, Map<String, String> metadata) {
        if (metadata == null || metadata.isEmpty()) return;

        String className = clean(metadata.get("className"));
        String subjectName = clean(metadata.get("subject"));
        String chapterName = clean(metadata.get("chapter"));
        String topicName = clean(metadata.get("topic"));

        if (className == null && subjectName == null) {
            log.debug("No className or subject in metadata, skipping auto-link");
            return;
        }

        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) tenantId = "DEFAULT";

        try {
            // 1. Resolve or create AcademicClass
            AcademicClass academicClass = null;
            if (className != null) {
                final String tid = tenantId;
                academicClass = classRepo.findByTenantIdAndNameIgnoreCase(tenantId, className)
                        .orElseGet(() -> {
                            AcademicClass ac = new AcademicClass();
                            ac.setName(className);
                            ac.setTenantId(tid);
                            log.info("Auto-creating AcademicClass: {}", className);
                            return classRepo.save(ac);
                        });
            }

            // 2. Resolve or create Subject
            Subject subject = null;
            if (subjectName != null) {
                final String tid = tenantId;
                subject = subjectRepo.findByTenantIdAndNameIgnoreCase(tenantId, subjectName)
                        .orElseGet(() -> {
                            Subject s = new Subject();
                            s.setName(subjectName);
                            s.setCode(generateCode(subjectName));
                            s.setTenantId(tid);
                            log.info("Auto-creating Subject: {}", subjectName);
                            return subjectRepo.save(s);
                        });
            }

            // 3. Resolve or create ClassSubject (requires both class and subject)
            ClassSubject classSubject = null;
            if (academicClass != null && subject != null) {
                AcademicSession session = getOrCreateDefaultSession(tenantId);
                final AcademicClass ac = academicClass;
                final Subject sb = subject;
                final AcademicSession ss = session;
                final String tid = tenantId;

                classSubject = classSubjectRepo
                        .findByAcademicClassAndSubjectAndSession(academicClass, subject, session)
                        .orElseGet(() -> {
                            ClassSubject cs = new ClassSubject();
                            cs.setAcademicClass(ac);
                            cs.setSubject(sb);
                            cs.setSession(ss);
                            cs.setActive(true);
                            cs.setTenantId(tid);
                            log.info("Auto-creating ClassSubject: {} + {}", ac.getName(), sb.getName());
                            return classSubjectRepo.save(cs);
                        });

                question.setClassSubject(classSubject);
            }

            // 4. Resolve or create Chapter (under ClassSubject)
            Chapter chapter = null;
            if (chapterName != null && classSubject != null) {
                final ClassSubject cs = classSubject;
                final String tid = tenantId;

                chapter = chapterRepo.findByClassSubjectIdAndNameIgnoreCase(classSubject.getId(), chapterName)
                        .orElseGet(() -> {
                            Chapter ch = new Chapter();
                            ch.setName(chapterName);
                            ch.setClassSubject(cs);
                            ch.setTenantId(tid);
                            ch.setIsActive(true);
                            log.info("Auto-creating Chapter: {}", chapterName);
                            return chapterRepo.save(ch);
                        });

                question.setChapter(chapter);
            }

            // 5. Resolve or create Topic (under Chapter)
            if (topicName != null && chapter != null) {
                final Chapter ch = chapter;
                final String tid = tenantId;

                Topic topic = topicRepo.findByChapterIdAndNameIgnoreCase(chapter.getId(), topicName)
                        .orElseGet(() -> {
                            Topic t = new Topic();
                            t.setName(topicName);
                            t.setChapter(ch);
                            t.setTenantId(tid);
                            log.info("Auto-creating Topic: {}", topicName);
                            return topicRepo.save(t);
                        });

                question.setTopic(topic);
            }

            log.info("Auto-link complete: class={}, subject={}, chapter={}, topic={}",
                    className, subjectName, chapterName, topicName);

        } catch (Exception e) {
            log.warn("Auto-link failed (non-fatal, question will still save): {}", e.getMessage());
            // Non-fatal: question saves with sourceReference text as fallback
        }
    }

    private AcademicSession getOrCreateDefaultSession(String tenantId) {
        return sessionRepo.findByIsActiveTrue()
                .orElseGet(() -> {
                    int year = LocalDate.now().getYear();
                    return sessionRepo.findByName(String.valueOf(year))
                            .orElseGet(() -> {
                                AcademicSession s = new AcademicSession();
                                s.setName(String.valueOf(year));
                                s.setStartDate(LocalDate.of(year, 1, 1));
                                s.setEndDate(LocalDate.of(year, 12, 31));
                                s.setActive(true);
                                s.setTenantId(tenantId);
                                log.info("Auto-creating AcademicSession: {}", year);
                                return sessionRepo.save(s);
                            });
                });
    }

    private String clean(String value) {
        if (value == null) return null;
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private String generateCode(String name) {
        // Generate unique subject code from name
        String base = name.replaceAll("[^a-zA-Z\\u0980-\\u09FF]", "");
        if (base.length() > 4) base = base.substring(0, 4);
        return (base + "-" + System.currentTimeMillis() % 10000).toUpperCase();
    }
}
