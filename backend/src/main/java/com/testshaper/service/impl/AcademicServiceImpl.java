package com.testshaper.service.impl;

import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.service.AcademicService;
import com.testshaper.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AcademicServiceImpl implements AcademicService {

    private static final ThreadLocal<Boolean> fgacBypass = ThreadLocal.withInitial(() -> false);

    private final AcademicLevelRepository levelRepository;
    private final AcademicStreamRepository streamRepository;
    private final AcademicClassRepository classRepository;
    private final AcademicGroupRepository groupRepository;
    private final SubjectRepository subjectRepository;
    private final ClassSubjectRepository classSubjectRepository;
    private final ChapterRepository chapterRepository;
    private final TopicRepository topicRepository;
    private final AcademicSessionRepository sessionRepository;
    private final com.testshaper.repository.InstituteRepository instituteRepository;
    private final jakarta.persistence.EntityManager entityManager;

    private String getTenant() {
        String tenant = TenantContext.getTenantId();
        return (tenant != null) ? tenant : "DEFAULT";
    }

    private <T> List<T> fetchFromTenants(java.util.function.Function<String, List<T>> fetcher) {
        String tenant = TenantContext.getTenantId();
        List<T> result = new java.util.ArrayList<>(fetcher.apply("DEFAULT"));
        if (tenant != null && !"DEFAULT".equals(tenant)) {
            result.addAll(fetcher.apply(tenant));
        }
        return result;
    }

    private boolean isFgacRestricted() {
        if (fgacBypass.get()) {
            return false;
        }
        String tenantId = TenantContext.getTenantId();
        if (tenantId != null && !"DEFAULT".equals(tenantId)) {
            try {
                Institute inst = instituteRepository.findById(UUID.fromString(tenantId)).orElse(null);
                return inst != null && inst.getAssignedSubjects() != null && !inst.getAssignedSubjects().isEmpty();
            } catch (Exception e) {
                return false;
            }
        }
        return false;
    }

    private java.util.Set<UUID> getFgacAllowedClassSubjectIds() {
        java.util.Set<UUID> allowed = new java.util.HashSet<>();
        String tenantId = TenantContext.getTenantId();
        if (tenantId != null && !"DEFAULT".equals(tenantId)) {
            try {
                Institute inst = instituteRepository.findById(UUID.fromString(tenantId)).orElse(null);
                if (inst != null && inst.getAssignedSubjects() != null && !inst.getAssignedSubjects().isEmpty()) {
                    for (ClassSubject cs : inst.getAssignedSubjects()) {
                        allowed.add(cs.getId());
                    }
                }
            } catch (Exception e) {
                log.error("Failed to parse tenant UUID for FGAC", e);
            }
        }
        return allowed;
    }

    private java.util.Set<UUID> getFgacAllowedClassIds() {
        java.util.Set<UUID> allowed = new java.util.HashSet<>();
        String tenantId = TenantContext.getTenantId();
        if (tenantId != null && !"DEFAULT".equals(tenantId)) {
            try {
                Institute inst = instituteRepository.findById(UUID.fromString(tenantId)).orElse(null);
                if (inst != null && inst.getAssignedSubjects() != null && !inst.getAssignedSubjects().isEmpty()) {
                    for (ClassSubject cs : inst.getAssignedSubjects()) {
                        allowed.add(cs.getAcademicClass().getId());
                    }
                }
            } catch (Exception e) { }
        }
        return allowed;
    }

    private java.util.Set<UUID> getFgacAllowedStreamIds() {
        java.util.Set<UUID> allowed = new java.util.HashSet<>();
        String tenantId = TenantContext.getTenantId();
        if (tenantId != null && !"DEFAULT".equals(tenantId)) {
            try {
                Institute inst = instituteRepository.findById(UUID.fromString(tenantId)).orElse(null);
                if (inst != null && inst.getAssignedSubjects() != null && !inst.getAssignedSubjects().isEmpty()) {
                    for (ClassSubject cs : inst.getAssignedSubjects()) {
                        allowed.add(cs.getAcademicClass().getStream().getId());
                    }
                }
            } catch (Exception e) { }
        }
        return allowed;
    }

    private java.util.Set<UUID> getFgacAllowedLevelIds() {
        java.util.Set<UUID> allowed = new java.util.HashSet<>();
        String tenantId = TenantContext.getTenantId();
        if (tenantId != null && !"DEFAULT".equals(tenantId)) {
            try {
                Institute inst = instituteRepository.findById(UUID.fromString(tenantId)).orElse(null);
                if (inst != null && inst.getAssignedSubjects() != null && !inst.getAssignedSubjects().isEmpty()) {
                    for (ClassSubject cs : inst.getAssignedSubjects()) {
                        allowed.add(cs.getAcademicClass().getStream().getLevel().getId());
                    }
                }
            } catch (Exception e) { }
        }
        return allowed;
    }

    // ═══ Cache Eviction Helper ═══
    // Called by all create/update/delete methods to keep cache consistent
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public void evictHierarchyCache() {
        log.debug("Academic hierarchy cache evicted");
    }

    // --- Level ---
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public AcademicLevel createLevel(AcademicLevel level) {
        return levelRepository.save(level);
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public AcademicLevel updateLevel(UUID id, AcademicLevel level) {
        AcademicLevel existing = levelRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Level not found"));
        if (level.getName() != null) existing.setName(level.getName());
        if (level.getOrder() != null) existing.setOrder(level.getOrder());
        return levelRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'levels_' + T(com.testshaper.security.TenantContext).getTenantId()")
    public List<AcademicLevel> getAllLevels() {
        List<AcademicLevel> list = fetchFromTenants(tenant -> levelRepository.findByTenantIdOrderByOrderAsc(tenant));
        if (isFgacRestricted()) {
            java.util.Set<UUID> allowed = getFgacAllowedLevelIds();
            list.removeIf(l -> !allowed.contains(l.getId()));
        }
        return list;
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public void deleteLevel(UUID id) {
        levelRepository.deleteById(id);
    }

    // --- Stream ---
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public AcademicStream createStream(UUID levelId, AcademicStream stream) {
        AcademicLevel level = levelRepository.findById(levelId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Level not found"));
        stream.setLevel(level);
        return streamRepository.save(stream);
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public AcademicStream updateStream(UUID id, AcademicStream stream) {
        AcademicStream existing = streamRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stream not found"));
        if (stream.getName() != null) existing.setName(stream.getName());
        if (stream.getOrder() != null) existing.setOrder(stream.getOrder());
        return streamRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'streams_' + #levelId")
    public List<AcademicStream> getStreamsByLevel(UUID levelId) {
        List<AcademicStream> list = fetchFromTenants(tenant -> streamRepository.findByTenantIdAndLevelIdOrderByOrderAsc(tenant, levelId));
        if (isFgacRestricted()) {
            java.util.Set<UUID> allowed = getFgacAllowedStreamIds();
            list.removeIf(s -> !allowed.contains(s.getId()));
        }
        return list;
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public void deleteStream(UUID id) {
        streamRepository.deleteById(id);
    }

    // --- Class ---
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public AcademicClass createClass(UUID streamId, AcademicClass academicClass) {
        AcademicStream stream = streamRepository.findById(streamId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stream not found"));
        academicClass.setStream(stream);
        return classRepository.save(academicClass);
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public AcademicClass updateClass(UUID id, AcademicClass cls) {
        AcademicClass existing = classRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        if (cls.getName() != null) existing.setName(cls.getName());
        if (cls.getOrder() != null) existing.setOrder(cls.getOrder());
        return classRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'classes_stream_' + #streamId")
    public List<AcademicClass> getClassesByStream(UUID streamId) {
        List<AcademicClass> list = fetchFromTenants(tenant -> classRepository.findByTenantIdAndStreamIdOrderByOrderAsc(tenant, streamId));
        if (isFgacRestricted()) {
            java.util.Set<UUID> allowed = getFgacAllowedClassIds();
            list.removeIf(c -> !allowed.contains(c.getId()));
        }
        return list;
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'all_classes_' + T(com.testshaper.security.TenantContext).getTenantId()")
    public List<AcademicClass> getAllClasses() {
        List<AcademicClass> list = fetchFromTenants(tenant -> classRepository.findByTenantIdOrderByOrderAsc(tenant));
        if (isFgacRestricted()) {
            java.util.Set<UUID> allowed = getFgacAllowedClassIds();
            list.removeIf(c -> !allowed.contains(c.getId()));
        }
        return list;
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public void deleteClass(UUID id) {
        classRepository.deleteById(id);
    }

    // --- Group ---
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public AcademicGroup createGroup(AcademicGroup group) {
        return groupRepository.save(group);
    }
    @Override
    public List<AcademicGroup> getAllGroups() {
        return fetchFromTenants(tenant -> groupRepository.findByTenantIdOrderByOrderAsc(tenant));
    }
    @Override
    @Transactional
    public void deleteGroup(UUID id) {
        groupRepository.deleteById(id);
    }

    // --- Subject ---
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public Subject createSubject(Subject subject) {
        return subjectRepository.save(subject);
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public Subject updateSubject(UUID id, Subject subject) {
        Subject existing = subjectRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
        if (subject.getName() != null) existing.setName(subject.getName());
        return subjectRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'all_subjects_' + T(com.testshaper.security.TenantContext).getTenantId()")
    public List<Subject> getAllSubjects() {
        return fetchFromTenants(tenant -> subjectRepository.findByTenantId(tenant));
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public void deleteSubject(UUID id) {
        subjectRepository.deleteById(id);
    }

    // --- ClassSubject mapping ---
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public ClassSubject assignSubjectToClass(UUID classId, UUID subjectId, UUID groupId, UUID sessionId) {
        AcademicClass cls = classRepository.findById(classId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        Subject sub = subjectRepository.findById(subjectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
        AcademicSession session = (sessionId != null) ? sessionRepository.findById(sessionId).orElseThrow() : sessionRepository.findByIsActiveTrue().orElseThrow();
        AcademicGroup group = (groupId != null) ? groupRepository.findById(groupId).orElse(null) : null;

        ClassSubject cs = new ClassSubject();
        cs.setAcademicClass(cls);
        cs.setSubject(sub);
        cs.setSession(session);
        cs.setAcademicGroup(group);
        return classSubjectRepository.save(cs);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public ClassSubject createAndAssignSubject(UUID classId, UUID groupId, Subject subject) {
        AcademicClass cls = classRepository.findById(classId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        AcademicSession session = sessionRepository.findByIsActiveTrue().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        AcademicGroup group = (groupId != null) ? groupRepository.findById(groupId).orElse(null) : null;
        
        Subject existingSubject = subjectRepository.findByTenantIdAndNameIgnoreCase(getTenant(), subject.getName()).orElse(null);
        if (existingSubject == null) {
            existingSubject = subjectRepository.save(subject);
        }
        
        ClassSubject cs = new ClassSubject();
        cs.setAcademicClass(cls);
        cs.setSubject(existingSubject);
        cs.setSession(session);
        cs.setAcademicGroup(group);
        return classSubjectRepository.save(cs);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public void updateClassSubject(UUID id, com.testshaper.dto.ClassSubjectDTO dto) {
        ClassSubject cs = classSubjectRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ClassSubject mapping not found"));
        if (dto.getSubjectName() != null) {
            Subject sub = cs.getSubject();
            sub.setName(dto.getSubjectName());
            subjectRepository.save(sub);
        }
        
        if (dto.getGroupId() != null) {
            AcademicGroup group = groupRepository.findById(dto.getGroupId()).orElse(null);
            cs.setAcademicGroup(group);
        } else {
            cs.setAcademicGroup(null);
        }

        if (dto.getOrder() != null) {
            cs.setOrder(dto.getOrder());
        }
        classSubjectRepository.save(cs);
    }

    @Override
    public List<com.testshaper.dto.ClassSubjectDTO> getSubjectsByClass(UUID classId, UUID sessionId) {
        List<ClassSubject> list = fetchFromTenants(tenant -> {
            if (sessionId != null) {
                return classSubjectRepository.findByTenantIdAndAcademicClassIdAndSessionIdOrderByOrderAsc(tenant, classId, sessionId);
            } else {
                return classSubjectRepository.findByAcademicClassId(classId).stream()
                        .filter(cs -> cs.getTenantId().equals(tenant))
                        .sorted(java.util.Comparator.comparing(cs -> cs.getOrder() == null ? 999 : cs.getOrder()))
                        .collect(Collectors.toList()); 
            }
        });
        
        if (isFgacRestricted()) {
            java.util.Set<UUID> allowed = getFgacAllowedClassSubjectIds();
            list.removeIf(cs -> !allowed.contains(cs.getId()));
        }
        
        return mapToDto(list);
    }

    @Override
    public List<com.testshaper.dto.ClassSubjectDTO> getSubjectsByClassAndGroup(UUID classId, UUID groupId, UUID sessionId) {
        List<ClassSubject> list = fetchFromTenants(tenant -> classSubjectRepository.findByTenantIdAndAcademicClassIdAndAcademicGroupIdAndSessionIdOrderByOrderAsc(tenant, classId, groupId, sessionId));
        if (isFgacRestricted()) {
            java.util.Set<UUID> allowed = getFgacAllowedClassSubjectIds();
            list.removeIf(cs -> !allowed.contains(cs.getId()));
        }
        return mapToDto(list);
    }
    
    private List<com.testshaper.dto.ClassSubjectDTO> mapToDto(List<ClassSubject> list) {
        return list.stream().map(cs -> {
            com.testshaper.dto.ClassSubjectDTO dto = new com.testshaper.dto.ClassSubjectDTO();
            dto.setClassSubjectId(cs.getId());
            dto.setSubjectId(cs.getSubject().getId());
            dto.setSubjectName(cs.getSubject().getName());
            dto.setSubjectCode(cs.getSubject().getCode());
            dto.setSubjectPaper(cs.getSubject().getPaper());
            dto.setEnglishVersion(cs.getSubject().isEnglishVersion());
            dto.setOrder(cs.getOrder());
            if (cs.getSession() != null) {
                dto.setSessionId(cs.getSession().getId());
                dto.setSessionName(cs.getSession().getName());
            }
            if (cs.getAcademicGroup() != null) {
                dto.setGroupId(cs.getAcademicGroup().getId());
                dto.setGroupName(cs.getAcademicGroup().getName());
            }
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public void deleteClassSubject(UUID id) {
        classSubjectRepository.deleteById(id);
    }

    @Override
    public java.util.Optional<ClassSubject> findClassSubjectById(UUID id) {
        return classSubjectRepository.findById(id);
    }

    // --- Chapter ---
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public Chapter createChapter(Chapter chapter, UUID classSubjectId) {
        ClassSubject cs = classSubjectRepository.findById(classSubjectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ClassSubject not found"));
        chapter.setClassSubject(cs);
        if (chapter.getIsActive() == null) {
            chapter.setIsActive(true);
        }
        if (chapter.getCategoryName() != null) {
            chapter.setCategoryName(chapter.getCategoryName().trim().isEmpty() ? null : chapter.getCategoryName().trim());
        }
        return chapterRepository.save(chapter);
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public Chapter updateChapter(UUID id, Chapter chapter) {
        Chapter existing = chapterRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found"));
        if (chapter.getName() != null) existing.setName(chapter.getName());
        if (chapter.getChapterNumber() != null) existing.setChapterNumber(chapter.getChapterNumber());
        if (chapter.getIsActive() != null) existing.setIsActive(chapter.getIsActive());
        if (chapter.getCategoryName() != null) {
            existing.setCategoryName(chapter.getCategoryName().trim().isEmpty() ? null : chapter.getCategoryName().trim());
        }
        return chapterRepository.save(existing);
    }
    @Override
    public List<Chapter> getChaptersByClassSubject(UUID classSubjectId) {
        return getChaptersByClassSubject(classSubjectId, true);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'chapters_' + #classSubjectId + '_' + #activeOnly")
    public List<Chapter> getChaptersByClassSubject(UUID classSubjectId, boolean activeOnly) {
        System.out.println("DEBUG: Fetching chapters for classSubjectId=" + classSubjectId + ", activeOnly=" + activeOnly);
        String currentTenant = com.testshaper.security.TenantContext.getTenantId();
        System.out.println("DEBUG: Current TenantContext: " + currentTenant);
        
        ClassSubject cs = classSubjectRepository.findById(classSubjectId).orElse(null);
        if (cs == null) {
            System.out.println("DEBUG: ClassSubject not found for id=" + classSubjectId);
            return new java.util.ArrayList<>();
        }
        
        System.out.println("DEBUG: Found ClassSubject! Tenant=" + cs.getTenantId() + ", Class=" + cs.getAcademicClass().getName() + ", Subject=" + cs.getSubject().getName());
        
        java.util.List<Chapter> chapters = new java.util.ArrayList<>();
        
        // 1. If the requested ClassSubject is tenant-specific, fetch chapters for it AND its global counterpart
        if (!"DEFAULT".equals(cs.getTenantId())) {
            java.util.List<ClassSubject> globalCandidates = classSubjectRepository.findByAcademicClassId(cs.getAcademicClass().getId());
            UUID globalCsId = null;
            for (ClassSubject globalCs : globalCandidates) {
                if ("DEFAULT".equals(globalCs.getTenantId()) 
                        && globalCs.getSubject().getName().equalsIgnoreCase(cs.getSubject().getName())
                        && globalCs.getSubject().isEnglishVersion() == cs.getSubject().isEnglishVersion()) {
                    globalCsId = globalCs.getId();
                    break;
                }
            }
            if (globalCsId != null) {
                final UUID gId = globalCsId;
                // Fetch ALL chapters for the global ClassSubject (some might have been saved with a tenant ID by mistake, let's just fetch by classSubjectId)
                List<Chapter> globalChaps = chapterRepository.findByClassSubjectIdOrderByChapterNumberAsc(gId);
                System.out.println("DEBUG: Found " + globalChaps.size() + " chapters for globalCsId=" + gId + " regardless of tenant");
                chapters.addAll(globalChaps);
            }
        }
        
        // 2. Fetch chapters for the specific ClassSubject requested (regardless of the tenant who created the chapter!)
        // Since ClassSubject is what binds them, if we have access to the ClassSubject, we have access to its chapters.
        List<Chapter> specificChaps = chapterRepository.findByClassSubjectIdOrderByChapterNumberAsc(classSubjectId);
        System.out.println("DEBUG: Found " + specificChaps.size() + " chapters for specific classSubjectId=" + classSubjectId);
        chapters.addAll(specificChaps);
        
        System.out.println("DEBUG: Total distinct chapters returned: " + chapters.stream().distinct().count());
        List<Chapter> result = chapters.stream().distinct().collect(Collectors.toList());
        if (activeOnly) {
            result = result.stream()
                           .filter(c -> c.getIsActive() == null || Boolean.TRUE.equals(c.getIsActive()))
                           .collect(Collectors.toList());
        }
        return result;
    }

    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public void deleteChapter(UUID id) {
        try {
            // FORCE DELETE: Nullify all references to topics in this chapter
            List<Topic> topics = topicRepository.findByChapterIdOrderByNameAsc(id);
            for (Topic t : topics) {
                entityManager.createQuery("UPDATE Question q SET q.topic = null WHERE q.topic.id = :id")
                             .setParameter("id", t.getId()).executeUpdate();
                entityManager.createQuery("UPDATE CurriculumDocumentChunk c SET c.mappedTopic = null WHERE c.mappedTopic.id = :id")
                             .setParameter("id", t.getId()).executeUpdate();
                entityManager.createQuery("UPDATE SourceBookIndex s SET s.mappedTopic = null WHERE s.mappedTopic.id = :id")
                             .setParameter("id", t.getId()).executeUpdate();
                entityManager.createQuery("UPDATE Lecture l SET l.topic = null WHERE l.topic.id = :id")
                             .setParameter("id", t.getId()).executeUpdate();
            }
            topicRepository.deleteByChapterId(id);

            // Nullify chapter references
            entityManager.createQuery("UPDATE SourceBookIndex s SET s.mappedChapter = null WHERE s.mappedChapter.id = :id")
                         .setParameter("id", id).executeUpdate();

            chapterRepository.deleteById(id);
            chapterRepository.flush();
        } catch (Exception e) {
            log.error("Failed to force delete chapter", e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to delete Chapter. Please try again."
            );
        }
    }

    // --- Topic ---
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public Topic createTopic(Topic topic, UUID chapterId) {
        Chapter c = chapterRepository.findById(chapterId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found"));
        topic.setChapter(c);
        return topicRepository.save(topic);
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public Topic updateTopic(UUID id, Topic topic) {
        Topic existing = topicRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Topic not found"));
        if (topic.getName() != null) existing.setName(topic.getName());
        return topicRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'topics_' + #chapterId")
    public List<Topic> getTopicsByChapter(UUID chapterId) {
        List<Topic> topics = topicRepository.findByChapterIdOrderByNameAsc(chapterId);
        return topics.stream().distinct().collect(Collectors.toList());
    }
    @Override
    @Transactional
    @CacheEvict(value = {"academicHierarchy", "questionStats", "sourceTags"}, allEntries = true)
    public void deleteTopic(UUID id) {
        try {
            // FORCE DELETE: Nullify foreign keys before deleting
            entityManager.createQuery("UPDATE Question q SET q.topic = null WHERE q.topic.id = :id")
                         .setParameter("id", id).executeUpdate();
            entityManager.createQuery("UPDATE CurriculumDocumentChunk c SET c.mappedTopic = null WHERE c.mappedTopic.id = :id")
                         .setParameter("id", id).executeUpdate();
            entityManager.createQuery("UPDATE SourceBookIndex s SET s.mappedTopic = null WHERE s.mappedTopic.id = :id")
                         .setParameter("id", id).executeUpdate();
            entityManager.createQuery("UPDATE Lecture l SET l.topic = null WHERE l.topic.id = :id")
                         .setParameter("id", id).executeUpdate();

            topicRepository.deleteById(id);
            topicRepository.flush();
        } catch (Exception e) {
            log.error("Failed to force delete topic", e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to delete Topic. Please try again."
            );
        }
    }

    // --- Batch Hierarchy (single call for entire academic structure) ---
    @Override
    public java.util.Map<String, Object> getFullHierarchy(boolean bypassRestrictions) {
        if (bypassRestrictions) {
            fgacBypass.set(true);
        }
        try {
            List<AcademicLevel> levels = getAllLevels();
            List<Subject> subjects = getAllSubjects();

            // Build streams with _levelName and _levelId metadata
            List<java.util.Map<String, Object>> allStreams = new java.util.ArrayList<>();
            for (AcademicLevel level : levels) {
                List<AcademicStream> streams = getStreamsByLevel(level.getId());
                for (AcademicStream stream : streams) {
                    java.util.Map<String, Object> streamMap = new java.util.LinkedHashMap<>();
                    streamMap.put("id", stream.getId());
                    streamMap.put("name", stream.getName());
                    streamMap.put("order", stream.getOrder());
                    streamMap.put("_levelId", level.getId());
                    streamMap.put("_levelName", level.getName());
                    allStreams.add(streamMap);
                }
            }

            // Build classes with streamName and levelName metadata
            List<java.util.Map<String, Object>> allClasses = new java.util.ArrayList<>();
            for (java.util.Map<String, Object> streamMap : allStreams) {
                UUID streamId = (UUID) streamMap.get("id");
                String streamName = (String) streamMap.get("name");
                String levelName = (String) streamMap.get("_levelName");

                List<AcademicClass> classes = getClassesByStream(streamId);
                for (AcademicClass cls : classes) {
                    java.util.Map<String, Object> classMap = new java.util.LinkedHashMap<>();
                    classMap.put("id", cls.getId());
                    classMap.put("name", cls.getName());
                    classMap.put("order", cls.getOrder());
                    classMap.put("_streamId", streamId);
                    classMap.put("_streamName", streamName);
                    classMap.put("_levelName", levelName);
                    allClasses.add(classMap);
                }
            }

            // ---------------------------------------------------------
            // FINE-GRAINED ACADEMIC ACCESS CONTROL
            // ---------------------------------------------------------
            java.util.Set<UUID> allowedClassSubjectIds = new java.util.HashSet<>();
            boolean isRestricted = false;
            if (!bypassRestrictions) {
                String tenantId = TenantContext.getTenantId();
                if (tenantId != null && !"DEFAULT".equals(tenantId)) {
                    try {
                        Institute inst = instituteRepository.findById(UUID.fromString(tenantId)).orElse(null);
                        if (inst != null && inst.getAssignedSubjects() != null && !inst.getAssignedSubjects().isEmpty()) {
                            isRestricted = true;
                            for (ClassSubject cs : inst.getAssignedSubjects()) {
                                allowedClassSubjectIds.add(cs.getId());
                            }
                        }
                    } catch (Exception e) {
                        log.error("Failed to parse tenant UUID for FGAC", e);
                    }
                }
            }

            // Build classSubjects
            List<java.util.Map<String, Object>> allClassSubjects = new java.util.ArrayList<>();
            for (AcademicClass cls : getAllClasses()) {
                List<com.testshaper.dto.ClassSubjectDTO> classSubjectDtos = getSubjectsByClass(cls.getId(), null);
                for (com.testshaper.dto.ClassSubjectDTO csDTO : classSubjectDtos) {
                    // Apply FGAC filter
                    if (isRestricted && !allowedClassSubjectIds.contains(csDTO.getClassSubjectId())) {
                        continue; // Skip restricted subjects
                    }
                    
                    java.util.Map<String, Object> csMap = new java.util.LinkedHashMap<>();
                    csMap.put("id", csDTO.getClassSubjectId());
                    csMap.put("name", csDTO.getSubjectName());
                    csMap.put("_classId", cls.getId());
                    csMap.put("_subjectId", csDTO.getSubjectId());
                    csMap.put("order", csDTO.getOrder());
                    // optional ones
                    if(csDTO.getGroupId() != null) csMap.put("_groupId", csDTO.getGroupId());
                    if(csDTO.getSessionId() != null) csMap.put("_sessionId", csDTO.getSessionId());
                    allClassSubjects.add(csMap);
                }
            }

            // Clean up empty parents if restricted
            if (isRestricted) {
                java.util.Set<UUID> activeClassIds = new java.util.HashSet<>();
                for (java.util.Map<String, Object> csMap : allClassSubjects) {
                    activeClassIds.add((UUID) csMap.get("_classId"));
                }
                allClasses.removeIf(cMap -> !activeClassIds.contains(cMap.get("id")));
                
                java.util.Set<UUID> activeStreamIds = new java.util.HashSet<>();
                for (java.util.Map<String, Object> cMap : allClasses) {
                    activeStreamIds.add((UUID) cMap.get("_streamId"));
                }
                allStreams.removeIf(sMap -> !activeStreamIds.contains(sMap.get("id")));
                
                java.util.Set<UUID> activeLevelIds = new java.util.HashSet<>();
                for (java.util.Map<String, Object> sMap : allStreams) {
                    activeLevelIds.add((UUID) sMap.get("_levelId"));
                }
                levels.removeIf(l -> !activeLevelIds.contains(l.getId()));
            }

            java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
            result.put("levels", levels);
            result.put("streams", allStreams);
            result.put("classes", allClasses);
            result.put("subjects", subjects); // Global subjects list, harmless to keep full
            result.put("classSubjects", allClassSubjects);
            return result;
        } finally {
            if (bypassRestrictions) {
                fgacBypass.remove();
            }
        }
    }
}
