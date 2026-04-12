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

    private final AcademicLevelRepository levelRepository;
    private final AcademicStreamRepository streamRepository;
    private final AcademicClassRepository classRepository;
    private final AcademicGroupRepository groupRepository;
    private final SubjectRepository subjectRepository;
    private final ClassSubjectRepository classSubjectRepository;
    private final ChapterRepository chapterRepository;
    private final TopicRepository topicRepository;
    private final AcademicSessionRepository sessionRepository;

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

    // ═══ Cache Eviction Helper ═══
    // Called by all create/update/delete methods to keep cache consistent
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public void evictHierarchyCache() {
        log.debug("Academic hierarchy cache evicted");
    }

    // --- Level ---
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public AcademicLevel createLevel(AcademicLevel level) {
        return levelRepository.save(level);
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public AcademicLevel updateLevel(UUID id, AcademicLevel level) {
        AcademicLevel existing = levelRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Level not found"));
        if (level.getName() != null) existing.setName(level.getName());
        if (level.getOrder() != null) existing.setOrder(level.getOrder());
        return levelRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'levels_' + T(com.testshaper.security.TenantContext).getTenantId()")
    public List<AcademicLevel> getAllLevels() {
        return fetchFromTenants(tenant -> levelRepository.findByTenantIdOrderByOrderAsc(tenant));
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public void deleteLevel(UUID id) {
        levelRepository.deleteById(id);
    }

    // --- Stream ---
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public AcademicStream createStream(UUID levelId, AcademicStream stream) {
        AcademicLevel level = levelRepository.findById(levelId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Level not found"));
        stream.setLevel(level);
        return streamRepository.save(stream);
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public AcademicStream updateStream(UUID id, AcademicStream stream) {
        AcademicStream existing = streamRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stream not found"));
        if (stream.getName() != null) existing.setName(stream.getName());
        if (stream.getOrder() != null) existing.setOrder(stream.getOrder());
        return streamRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'streams_' + #levelId")
    public List<AcademicStream> getStreamsByLevel(UUID levelId) {
        return fetchFromTenants(tenant -> streamRepository.findByTenantIdAndLevelIdOrderByOrderAsc(tenant, levelId));
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public void deleteStream(UUID id) {
        streamRepository.deleteById(id);
    }

    // --- Class ---
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public AcademicClass createClass(UUID streamId, AcademicClass academicClass) {
        AcademicStream stream = streamRepository.findById(streamId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stream not found"));
        academicClass.setStream(stream);
        return classRepository.save(academicClass);
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public AcademicClass updateClass(UUID id, AcademicClass cls) {
        AcademicClass existing = classRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        if (cls.getName() != null) existing.setName(cls.getName());
        if (cls.getOrder() != null) existing.setOrder(cls.getOrder());
        return classRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'classes_stream_' + #streamId")
    public List<AcademicClass> getClassesByStream(UUID streamId) {
        return fetchFromTenants(tenant -> classRepository.findByTenantIdAndStreamIdOrderByOrderAsc(tenant, streamId));
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'all_classes_' + T(com.testshaper.security.TenantContext).getTenantId()")
    public List<AcademicClass> getAllClasses() {
        return fetchFromTenants(tenant -> classRepository.findByTenantIdOrderByOrderAsc(tenant));
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public void deleteClass(UUID id) {
        classRepository.deleteById(id);
    }

    // --- Group ---
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
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
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public Subject createSubject(Subject subject) {
        return subjectRepository.save(subject);
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
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
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public void deleteSubject(UUID id) {
        subjectRepository.deleteById(id);
    }

    // --- ClassSubject mapping ---
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
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
    @CacheEvict(value = "academicHierarchy", allEntries = true)
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
    @CacheEvict(value = "academicHierarchy", allEntries = true)
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
        return mapToDto(list);
    }

    @Override
    public List<com.testshaper.dto.ClassSubjectDTO> getSubjectsByClassAndGroup(UUID classId, UUID groupId, UUID sessionId) {
        List<ClassSubject> list = fetchFromTenants(tenant -> classSubjectRepository.findByTenantIdAndAcademicClassIdAndAcademicGroupIdAndSessionIdOrderByOrderAsc(tenant, classId, groupId, sessionId));
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
    @CacheEvict(value = "academicHierarchy", allEntries = true)
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
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public Chapter createChapter(Chapter chapter, UUID classSubjectId) {
        ClassSubject cs = classSubjectRepository.findById(classSubjectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ClassSubject not found"));
        chapter.setClassSubject(cs);
        return chapterRepository.save(chapter);
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public Chapter updateChapter(UUID id, Chapter chapter) {
        Chapter existing = chapterRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found"));
        if (chapter.getName() != null) existing.setName(chapter.getName());
        if (chapter.getChapterNumber() != null) existing.setChapterNumber(chapter.getChapterNumber());
        return chapterRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'chapters_' + #classSubjectId")
    public List<Chapter> getChaptersByClassSubject(UUID classSubjectId) {
        return fetchFromTenants(tenant -> chapterRepository.findByTenantIdAndClassSubjectIdOrderByChapterNumberAsc(tenant, classSubjectId));
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public void deleteChapter(UUID id) {
        try {
            topicRepository.deleteByChapterId(id);
            chapterRepository.deleteById(id);
            chapterRepository.flush();
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Cannot delete Chapter. It contains Topics that are referenced by existing Questions."
            );
        }
    }

    // --- Topic ---
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public Topic createTopic(Topic topic, UUID chapterId) {
        Chapter c = chapterRepository.findById(chapterId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found"));
        topic.setChapter(c);
        return topicRepository.save(topic);
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public Topic updateTopic(UUID id, Topic topic) {
        Topic existing = topicRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Topic not found"));
        if (topic.getName() != null) existing.setName(topic.getName());
        return topicRepository.save(existing);
    }
    @Override
    @Cacheable(value = "academicHierarchy", key = "'topics_' + #chapterId")
    public List<Topic> getTopicsByChapter(UUID chapterId) {
        return fetchFromTenants(tenant -> topicRepository.findByTenantIdAndChapterIdOrderByNameAsc(tenant, chapterId));
    }
    @Override
    @Transactional
    @CacheEvict(value = "academicHierarchy", allEntries = true)
    public void deleteTopic(UUID id) {
        try {
            topicRepository.deleteById(id);
            topicRepository.flush();
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Cannot delete Topic. It is currently assigned to one or more Questions."
            );
        }
    }

    // --- Batch Hierarchy (single call for entire academic structure) ---
    @Override
    public java.util.Map<String, Object> getFullHierarchy() {
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

        // Build classSubjects
        List<java.util.Map<String, Object>> allClassSubjects = new java.util.ArrayList<>();
        for (AcademicClass cls : getAllClasses()) {
            List<com.testshaper.dto.ClassSubjectDTO> classSubjectDtos = getSubjectsByClass(cls.getId(), null);
            for (com.testshaper.dto.ClassSubjectDTO csDTO : classSubjectDtos) {
                java.util.Map<String, Object> csMap = new java.util.LinkedHashMap<>();
                csMap.put("id", csDTO.getClassSubjectId());
                csMap.put("_classId", cls.getId());
                csMap.put("_subjectId", csDTO.getSubjectId());
                csMap.put("order", csDTO.getOrder());
                // optional ones
                if(csDTO.getGroupId() != null) csMap.put("_groupId", csDTO.getGroupId());
                if(csDTO.getSessionId() != null) csMap.put("_sessionId", csDTO.getSessionId());
                allClassSubjects.add(csMap);
            }
        }

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("levels", levels);
        result.put("streams", allStreams);
        result.put("classes", allClasses);
        result.put("subjects", subjects);
        result.put("classSubjects", allClassSubjects);
        return result;
    }
}
