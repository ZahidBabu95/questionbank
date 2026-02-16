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
const createSubject = async (classId, data) => {
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

// --- Chapters ---
const createChapter = async (subjectId, data) => {
    const response = await axios.post(`${API_URL}/subjects/${subjectId}/chapters`, data, getAuthHeader());
    return response.data;
};

const getChaptersBySubject = async (subjectId) => {
    const response = await axios.get(`${API_URL}/subjects/${subjectId}/chapters`, getAuthHeader());
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

export default {
    createClass, getAllClasses, deleteClass,
    createSubject, getSubjectsByClass, getAllSubjects, deleteSubject,
    createChapter, getChaptersBySubject, getAllChapters, deleteChapter,
    createTopic, getTopicsByChapter, getAllTopics, deleteTopic
};
