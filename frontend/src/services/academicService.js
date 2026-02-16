import axios from 'axios';

const API_URL = '/api/v1/academic';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

// --- Classes ---
const createClass = async (data) => {
    const response = await axios.post(`${API_URL}/classes`, data, getAuthHeader());
    return response.data;
};

const getAllClasses = async () => {
    const response = await axios.get(`${API_URL}/classes`, getAuthHeader());
    return response.data;
};

const deleteClass = async (id) => {
    await axios.delete(`${API_URL}/classes/${id}`, getAuthHeader());
};

// --- Subjects ---
const createGlobalSubject = async (data) => {
    const response = await axios.post(`${API_URL}/subjects`, data, getAuthHeader());
    return response.data;
};

const createClassSubject = async (classId, data) => {
    const response = await axios.post(`${API_URL}/classes/${classId}/subjects`, data, getAuthHeader());
    return response.data;
};

const getSubjectsByClass = async (classId) => {
    const response = await axios.get(`${API_URL}/classes/${classId}/subjects`, getAuthHeader());
    return response.data;
};

const getAllSubjects = async () => {
    const response = await axios.get(`${API_URL}/subjects`, getAuthHeader());
    return response.data;
};

const deleteSubject = async (id) => {
    await axios.delete(`${API_URL}/subjects/${id}`, getAuthHeader());
};

const deleteClassSubject = async (id) => {
    await axios.delete(`${API_URL}/class-subjects/${id}`, getAuthHeader());
};

const assignSubjectToClass = async (classId, subjectId, sessionId) => {
    const response = await axios.post(`${API_URL}/classes/${classId}/subjects/${subjectId}/session/${sessionId}`, {}, getAuthHeader());
    return response.data;
};

// --- Chapters ---
// --- Chapters ---
const createChapter = async (classSubjectId, data) => {
    const response = await axios.post(`${API_URL}/class-subjects/${classSubjectId}/chapters`, data, getAuthHeader());
    return response.data;
};

const getChaptersByClassSubject = async (classSubjectId) => {
    const response = await axios.get(`${API_URL}/class-subjects/${classSubjectId}/chapters`, getAuthHeader());
    return response.data;
};

const getAllChapters = async () => {
    const response = await axios.get(`${API_URL}/chapters`, getAuthHeader());
    return response.data;
};

const deleteChapter = async (id) => {
    await axios.delete(`${API_URL}/chapters/${id}`, getAuthHeader());
};

// --- Topics ---
const createTopic = async (chapterId, data) => {
    const response = await axios.post(`${API_URL}/chapters/${chapterId}/topics`, data, getAuthHeader());
    return response.data;
};

const getTopicsByChapter = async (chapterId) => {
    const response = await axios.get(`${API_URL}/chapters/${chapterId}/topics`, getAuthHeader());
    return response.data;
};

const getAllTopics = async () => {
    const response = await axios.get(`${API_URL}/topics`, getAuthHeader());
    return response.data;
};

const deleteTopic = async (id) => {
    await axios.delete(`${API_URL}/topics/${id}`, getAuthHeader());
};

const getActiveSession = async () => {
    const response = await axios.get(`${API_URL}/sessions/active`, getAuthHeader());
    return response.data;
};

export default {
    createClass, getAllClasses, deleteClass,
    createGlobalSubject, createClassSubject, getSubjectsByClass, getAllSubjects, deleteSubject, deleteClassSubject, assignSubjectToClass, getActiveSession,
    createChapter, getChaptersByClassSubject, getAllChapters, deleteChapter,
    createTopic, getTopicsByChapter, getAllTopics, deleteTopic
};
