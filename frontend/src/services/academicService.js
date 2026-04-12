import axios from '../utils/axios';

const API_URL = '/v1/academic';

// --- Levels ---
const createLevel = async (data) => axios.post(`${API_URL}/levels`, data).then(res => res.data);
const updateLevel = async (id, data) => axios.put(`${API_URL}/levels/${id}`, data).then(res => res.data);
const getAllLevels = async () => axios.get(`${API_URL}/levels`).then(res => res.data);
const deleteLevel = async (id) => axios.delete(`${API_URL}/levels/${id}`);

// --- Streams ---
const createStream = async (levelId, data) => axios.post(`${API_URL}/levels/${levelId}/streams`, data).then(res => res.data);
const updateStream = async (id, data) => axios.put(`${API_URL}/streams/${id}`, data).then(res => res.data);
const getStreamsByLevel = async (levelId) => axios.get(`${API_URL}/levels/${levelId}/streams`).then(res => res.data);
const deleteStream = async (id) => axios.delete(`${API_URL}/streams/${id}`);

// --- Classes ---
const createClass = async (streamId, data) => axios.post(`${API_URL}/streams/${streamId}/classes`, data).then(res => res.data);
const updateClass = async (id, data) => axios.put(`${API_URL}/classes/${id}`, data).then(res => res.data);
const getClassesByStream = async (streamId) => axios.get(`${API_URL}/streams/${streamId}/classes`).then(res => res.data);
const getAllClasses = async () => axios.get(`${API_URL}/classes`).then(res => res.data);
const deleteClass = async (id) => axios.delete(`${API_URL}/classes/${id}`);

// --- Groups (Global) ---
const createGroup = async (data) => axios.post(`${API_URL}/groups`, data).then(res => res.data);
const getAllGroups = async () => axios.get(`${API_URL}/groups`).then(res => res.data);
const deleteGroup = async (id) => axios.delete(`${API_URL}/groups/${id}`);

// --- Subjects (Global) ---
const createGlobalSubject = async (data) => axios.post(`${API_URL}/subjects`, data).then(res => res.data);
const updateGlobalSubject = async (id, data) => axios.put(`${API_URL}/subjects/${id}`, data).then(res => res.data);
const getAllSubjects = async () => axios.get(`${API_URL}/subjects`).then(res => res.data);
const deleteSubject = async (id) => axios.delete(`${API_URL}/subjects/${id}`);

// --- Class Subjects (Syllabus) ---
const createClassSubject = async (classId, groupId, data) => {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    const res = await axios.post(`${API_URL}/classes/${classId}/subjects?${params.toString()}`, data);
    return res.data;
};

const assignSubjectToClass = async (classId, subjectId, groupId, sessionId) => {
    const params = new URLSearchParams();
    params.append('subjectId', subjectId);
    if (groupId) params.append('groupId', groupId);
    if (sessionId) params.append('sessionId', sessionId);
    const res = await axios.post(`${API_URL}/classes/${classId}/subjects/assign?${params.toString()}`);
    return res.data;
};

const getSubjectsByClass = async (classId, groupId = null, sessionId = null) => {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    if (sessionId) params.append('sessionId', sessionId);
    const res = await axios.get(`${API_URL}/classes/${classId}/subjects?${params.toString()}`);
    return res.data;
};

const updateClassSubject = async (id, data) => axios.put(`${API_URL}/class-subjects/${id}`, data).then(res => res.data);

const deleteClassSubject = async (id) => axios.delete(`${API_URL}/class-subjects/${id}`);

// --- Chapters ---
const createChapter = async (classSubjectId, data) => axios.post(`${API_URL}/class-subjects/${classSubjectId}/chapters`, data).then(res => res.data);
const updateChapter = async (id, data) => axios.put(`${API_URL}/chapters/${id}`, data).then(res => res.data);
const getChaptersByClassSubject = async (classSubjectId) => axios.get(`${API_URL}/class-subjects/${classSubjectId}/chapters`).then(res => res.data);
const deleteChapter = async (id) => axios.delete(`${API_URL}/chapters/${id}`);

// --- Topics ---
const createTopic = async (chapterId, data) => axios.post(`${API_URL}/chapters/${chapterId}/topics`, data).then(res => res.data);
const updateTopic = async (id, data) => axios.put(`${API_URL}/topics/${id}`, data).then(res => res.data);
const getTopicsByChapter = async (chapterId) => axios.get(`${API_URL}/chapters/${chapterId}/topics`).then(res => res.data);
const deleteTopic = async (id) => axios.delete(`${API_URL}/topics/${id}`);

// --- Batch Hierarchy (single call for entire structure — replaces 20+ individual calls) ---
const getHierarchy = async () => axios.get(`${API_URL}/hierarchy`).then(res => res.data);

// --- Session ---
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
    getHierarchy, getActiveSession
};
