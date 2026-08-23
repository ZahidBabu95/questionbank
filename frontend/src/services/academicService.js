import axios from '../utils/axios';

const API_URL = '/v1/academic';

// Cache states
let cachedHierarchy = null;
let cachedHierarchyBypass = null;
let activeHierarchyReq = null;
let activeHierarchyBypassReq = null;

const clearHierarchyCache = () => {
    cachedHierarchy = null;
    cachedHierarchyBypass = null;
    activeHierarchyReq = null;
    activeHierarchyBypassReq = null;
    try { sessionStorage.removeItem(getHierarchyKey()); } catch (e) {}
    try {
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('qs_chapters_') || k.startsWith('qs_topics_') || k.startsWith('qs_schema_cache_')) {
                sessionStorage.removeItem(k);
            }
        });
    } catch (e) {}
};

// --- Levels ---
const createLevel = async (data) => axios.post(`${API_URL}/levels`, data).then(res => { clearHierarchyCache(); return res.data; });
const updateLevel = async (id, data) => axios.put(`${API_URL}/levels/${id}`, data).then(res => { clearHierarchyCache(); return res.data; });
const getAllLevels = async () => axios.get(`${API_URL}/levels`).then(res => res.data);
const deleteLevel = async (id) => axios.delete(`${API_URL}/levels/${id}`).then(res => { clearHierarchyCache(); return res.data; });

// --- Streams ---
const createStream = async (levelId, data) => axios.post(`${API_URL}/levels/${levelId}/streams`, data).then(res => { clearHierarchyCache(); return res.data; });
const updateStream = async (id, data) => axios.put(`${API_URL}/streams/${id}`, data).then(res => { clearHierarchyCache(); return res.data; });
const getStreamsByLevel = async (levelId) => axios.get(`${API_URL}/levels/${levelId}/streams`).then(res => res.data);
const deleteStream = async (id) => axios.delete(`${API_URL}/streams/${id}`).then(res => { clearHierarchyCache(); return res.data; });

// --- Classes ---
const createClass = async (streamId, data) => axios.post(`${API_URL}/streams/${streamId}/classes`, data).then(res => { clearHierarchyCache(); return res.data; });
const updateClass = async (id, data) => axios.put(`${API_URL}/classes/${id}`, data).then(res => { clearHierarchyCache(); return res.data; });
const getClassesByStream = async (streamId) => axios.get(`${API_URL}/streams/${streamId}/classes`).then(res => res.data);
const getAllClasses = async () => axios.get(`${API_URL}/classes`).then(res => res.data);
const deleteClass = async (id) => axios.delete(`${API_URL}/classes/${id}`).then(res => { clearHierarchyCache(); return res.data; });

// --- Groups (Global) ---
const createGroup = async (data) => axios.post(`${API_URL}/groups`, data).then(res => { clearHierarchyCache(); return res.data; });
const getAllGroups = async () => axios.get(`${API_URL}/groups`).then(res => res.data);
const deleteGroup = async (id) => axios.delete(`${API_URL}/groups/${id}`).then(res => { clearHierarchyCache(); return res.data; });

// --- Subjects (Global) ---
const createGlobalSubject = async (data) => axios.post(`${API_URL}/subjects`, data).then(res => { clearHierarchyCache(); return res.data; });
const updateGlobalSubject = async (id, data) => axios.put(`${API_URL}/subjects/${id}`, data).then(res => { clearHierarchyCache(); return res.data; });
const getAllSubjects = async () => axios.get(`${API_URL}/subjects`).then(res => res.data);
const deleteSubject = async (id) => axios.delete(`${API_URL}/subjects/${id}`).then(res => { clearHierarchyCache(); return res.data; });

// --- Class Subjects (Syllabus) ---
const createClassSubject = async (classId, groupId, data) => {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    const res = await axios.post(`${API_URL}/classes/${classId}/subjects?${params.toString()}`, data);
    clearHierarchyCache();
    return res.data;
};

const assignSubjectToClass = async (classId, subjectId, groupId, sessionId) => {
    const params = new URLSearchParams();
    params.append('subjectId', subjectId);
    if (groupId) params.append('groupId', groupId);
    if (sessionId) params.append('sessionId', sessionId);
    const res = await axios.post(`${API_URL}/classes/${classId}/subjects/assign?${params.toString()}`);
    clearHierarchyCache();
    return res.data;
};

const getSubjectsByClass = async (classId, groupId = null, sessionId = null) => {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    if (sessionId) params.append('sessionId', sessionId);
    const res = await axios.get(`${API_URL}/classes/${classId}/subjects?${params.toString()}`);
    return res.data;
};

const updateClassSubject = async (id, data) => axios.put(`${API_URL}/class-subjects/${id}`, data).then(res => { clearHierarchyCache(); return res.data; });

const deleteClassSubject = async (id) => axios.delete(`${API_URL}/class-subjects/${id}`).then(res => { clearHierarchyCache(); return res.data; });

// --- Chapters ---
const createChapter = async (classSubjectId, data) => axios.post(`${API_URL}/class-subjects/${classSubjectId}/chapters`, data).then(res => { clearHierarchyCache(); return res.data; });
const updateChapter = async (id, data) => axios.put(`${API_URL}/chapters/${id}`, data).then(res => { clearHierarchyCache(); return res.data; });
const getChaptersByClassSubject = async (classSubjectId, activeOnly = true) => {
    const key = `qs_chapters_${classSubjectId}_${activeOnly}`;
    try {
        const cached = sessionStorage.getItem(key);
        if (cached) return JSON.parse(cached);
    } catch (e) {}
    const data = await axios.get(`${API_URL}/class-subjects/${classSubjectId}/chapters`, { params: { activeOnly } }).then(res => res.data);
    try { if (data) sessionStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
    return data;
};
const deleteChapter = async (id) => axios.delete(`${API_URL}/chapters/${id}`).then(res => { clearHierarchyCache(); return res.data; });

// --- Topics ---
const createTopic = async (chapterId, data) => axios.post(`${API_URL}/chapters/${chapterId}/topics`, data).then(res => { clearHierarchyCache(); return res.data; });
const updateTopic = async (id, data) => axios.put(`${API_URL}/topics/${id}`, data).then(res => { clearHierarchyCache(); return res.data; });
const getTopicsByChapter = async (chapterId) => {
    const key = `qs_topics_${chapterId}`;
    try {
        const cached = sessionStorage.getItem(key);
        if (cached) return JSON.parse(cached);
    } catch (e) {}
    const data = await axios.get(`${API_URL}/chapters/${chapterId}/topics`).then(res => res.data);
    try { if (data) sessionStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
    return data;
};
const deleteTopic = async (id) => axios.delete(`${API_URL}/topics/${id}`).then(res => { clearHierarchyCache(); return res.data; });

const getHierarchyKey = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const u = JSON.parse(userStr);
            return `qs_academic_hierarchy_${u.instituteId || u.tenantId || u.email || 'def'}`;
        }
    } catch (e) {}
    return 'qs_academic_hierarchy_def';
};

const revalidateHierarchy = async (key, bypass = false, onRevalidate = null) => {
    if (activeHierarchyReq) return activeHierarchyReq;

    const prevStr = JSON.stringify(cachedHierarchy || {});

    activeHierarchyReq = axios.get(`${API_URL}/hierarchy`, { params: { bypass } })
        .then(res => {
            const freshData = res.data;
            const freshStr = JSON.stringify(freshData);
            cachedHierarchy = freshData;
            try {
                sessionStorage.setItem(key, freshStr);
            } catch (e) {}
            activeHierarchyReq = null;

            if (typeof onRevalidate === 'function' && prevStr !== freshStr) {
                onRevalidate(freshData);
            }

            return freshData;
        })
        .catch(err => {
            activeHierarchyReq = null;
            throw err;
        });

    return activeHierarchyReq;
};

// --- Batch Hierarchy with SWR Support ---
const getHierarchy = async (bypass = false, onRevalidate = null) => {
    preloadKnowledgeRules().catch(() => {});
    const key = getHierarchyKey();
    if (bypass) {
        if (cachedHierarchyBypass) return cachedHierarchyBypass;
        if (activeHierarchyBypassReq) return activeHierarchyBypassReq;
        activeHierarchyBypassReq = axios.get(`${API_URL}/hierarchy`, { params: { bypass } })
            .then(res => {
                cachedHierarchyBypass = res.data;
                activeHierarchyBypassReq = null;
                return res.data;
            })
            .catch(err => {
                activeHierarchyBypassReq = null;
                throw err;
            });
        return activeHierarchyBypassReq;
    } else {
        if (!cachedHierarchy) {
            try {
                const s = sessionStorage.getItem(key);
                if (s) cachedHierarchy = JSON.parse(s);
            } catch (e) {}
        }
        if (cachedHierarchy) {
            revalidateHierarchy(key, bypass, onRevalidate);
            return cachedHierarchy;
        }
        return revalidateHierarchy(key, bypass, onRevalidate);
    }
};

// --- Session ---
const preloadKnowledgeRules = async () => {
    try {
        const stored = sessionStorage.getItem('qs_kb_rules');
        if (stored) return JSON.parse(stored);
        const res = await axios.get('/v1/support/knowledge');
        if (res.data) {
            try { sessionStorage.setItem('qs_kb_rules', JSON.stringify(res.data)); } catch (e) {}
        }
        return res.data;
    } catch (e) {
        return [];
    }
};

const getActiveSession = async () => axios.get(`/v1/sessions/active`).then(res => res.data);

export default {
    createLevel, updateLevel, getAllLevels, deleteLevel,
    createStream, updateStream, getStreamsByLevel, deleteStream,
    createClass, updateClass, getClassesByStream, getAllClasses, deleteClass,
    createGroup, getAllGroups, deleteGroup,
    createGlobalSubject, updateGlobalSubject, getAllSubjects, deleteSubject,
    createClassSubject, assignSubjectToClass, getSubjectsByClass, updateClassSubject, deleteClassSubject,
    createChapter, updateChapter, getChaptersByClassSubject, deleteChapter,
    createTopic, updateTopic, getTopicsByChapter, deleteTopic,
    getHierarchy, getCurriculumHierarchy: getHierarchy, getActiveSession, clearHierarchyCache, preloadKnowledgeRules
};
