import axios from '../utils/axios';

const API_URL = '/v1/questions';


const createMCQ = async (question, options, metadata = null) => {
    const body = { question, options };
    if (metadata) body.metadata = metadata;
    const response = await axios.post(`${API_URL}/mcq/create`, body);
    return response.data;
};

const createMCQBulk = async (questions, optionsList, metadata = null, academicIds = {}) => {
    const body = { questions, optionsList };
    if (metadata) body.metadata = metadata;
    if (academicIds && Object.keys(academicIds).length > 0) body.academicIds = academicIds;
    const response = await axios.post(`${API_URL}/mcq/bulk/create`, body);
    return response.data;
};

const createShortQuestion = async (question) => {
    const response = await axios.post(`${API_URL}/short/create`, question);
    return response.data;
};

const createCQ = async (question) => {
    const response = await axios.post(`${API_URL}/cq/create`, question);
    return response.data;
};

const getAllQuestions = async () => {
    const response = await axios.get(`${API_URL}/list`);
    return response.data;
};

const getAllQuestionsPaginated = async (params) => {
    // Expected params: { page, size, filterStatus, filterType, search, levelId, streamId, classId, subjectId, chapterId, topicId }
    // Clean up empty params
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    const response = await axios.get(`${API_URL}/list-paginated`, { params: cleanParams });
    return response.data;
};

const getAllQuestionIds = async (params) => {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    const response = await axios.get(`${API_URL}/list-ids`, { params: cleanParams });
    return response.data;
};

const getOverviewStats = async (params = {}) => {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    const response = await axios.get(`${API_URL}/overview-stats`, { params: cleanParams });
    return response.data;
};

const getSourceTags = async (params = {}) => {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    const response = await axios.get(`${API_URL}/source-tags`, { params: cleanParams });
    return response.data;
};

const deleteQuestion = async (id) => {
    await axios.delete(`${API_URL}/${id}`);
};

const deleteQuestionsBulk = async (ids) => {
    await axios.post(`${API_URL}/bulk/delete`, ids);
};

const approveQuestion = async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/approve`, {});
    return response.data;
};

const rejectQuestion = async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/reject`, {});
    return response.data;
};

const approveQuestionsBulk = async (ids) => {
    await axios.patch(`${API_URL}/bulk/approve`, ids);
};

const rejectQuestionsBulk = async (ids) => {
    await axios.patch(`${API_URL}/bulk/reject`, ids);
};

const updateStatusBulk = async (ids, status) => {
    await axios.patch(`${API_URL}/bulk/status`, { ids, status });
};

const getQuestionById = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

const getOptions = async (id) => {
    const response = await axios.get(`${API_URL}/${id}/options`);
    return response.data;
};

const updateQuestion = async (id, question, options = null) => {
    const response = await axios.put(`${API_URL}/${id}`, { question, options });
    return response.data;
};

const uploadStimulusImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

const getQuestionSources = async (questionId) => {
    const response = await axios.get(`${API_URL}/${questionId}/sources`);
    return response.data;
};

const addQuestionSource = async (questionId, source) => {
    const response = await axios.post(`${API_URL}/${questionId}/sources`, source);
    return response.data;
};

const deleteQuestionSource = async (sourceId) => {
    await axios.delete(`${API_URL}/sources/${sourceId}`);
};

const submitRevision = async (id, revisionRequest) => {
    // revisionRequest should contain { question: {...}, options: [...] }
    const response = await axios.post(`${API_URL}/${id}/revision`, revisionRequest);
    return response.data;
};

// Alias used by RevisePanel — sends allowed-only fields
const reviseQuestion = async (id, payload) => {
    const response = await axios.patch(`${API_URL}/${id}/revise`, payload);
    return response.data;
};

const approveRevision = async (revisionId) => {
    const response = await axios.post(`${API_URL}/${revisionId}/approve-revision`, {});
    return response.data;
};

// --- Community Feedback (Likes & Favorites) ---
const toggleLike = async (id) => {
    const response = await axios.post(`${API_URL}/${id}/like`, {});
    return response.data;
};

const hasLiked = async (id) => {
    const response = await axios.get(`${API_URL}/${id}/like`);
    return response.data;
};

const toggleFavorite = async (id) => {
    const response = await axios.post(`${API_URL}/${id}/favorite`, {});
    return response.data;
};

const hasFavorited = async (id) => {
    const response = await axios.get(`${API_URL}/${id}/favorite`);
    return response.data;
};

const getMyFavorites = async (params) => {
    const response = await axios.get(`${API_URL}/favorites/my`, { params });
    return response.data;
};

export default {
    createMCQ,
    createMCQBulk,
    createShortQuestion,
    createCQ,
    getAllQuestions,
    getAllQuestionsPaginated,
    getAllQuestionIds,
    getOverviewStats,
    getSourceTags,
    getQuestionById,
    getOptions,
    updateQuestion,
    deleteQuestion,
    deleteQuestionsBulk,
    approveQuestion,
    rejectQuestion,
    approveQuestionsBulk,
    rejectQuestionsBulk,
    updateStatusBulk,
    uploadStimulusImage,
    getQuestionSources,
    addQuestionSource,
    deleteQuestionSource,
    submitRevision,
    reviseQuestion,
    approveRevision,
    toggleLike,
    hasLiked,
    toggleFavorite,
    hasFavorited,
    getMyFavorites,
};
