import axios from '../utils/axios';

const API_URL = '/v1/questions';

// Simple In-Memory Request Cache for instant navigation
const cache = new Map();
const CACHE_TTL_MS = 60000; // 1 minute TTL

export const clearQuestionCache = () => {
    cache.clear();
};

const fetchWithCache = async (cacheKey, apiCall) => {
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            // Background re-fetch to keep data fresh (Stale-while-revalidate pattern)
            apiCall().then(data => cache.set(cacheKey, { data, timestamp: Date.now() })).catch(() => {});
            return cached.data;
        }
        cache.delete(cacheKey);
    }
    const data = await apiCall();
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
};

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
    clearQuestionCache();
    return response.data;
};

const createCQ = async (question) => {
    const response = await axios.post(`${API_URL}/cq/create`, question);
    clearQuestionCache();
    return response.data;
};

const getAllQuestions = async () => {
    const response = await axios.get(`${API_URL}/list`);
    return response.data;
};

const getAllQuestionsPaginated = async (params) => {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    const cacheKey = `paginated_${JSON.stringify(cleanParams)}`;
    return fetchWithCache(cacheKey, async () => {
        const response = await axios.get(`${API_URL}/list-paginated`, { params: cleanParams });
        return response.data;
    });
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

const getQuestionAvailability = async (classSubjectId, language = null) => {
    const params = { classSubjectId };
    if (language && language !== 'ALL') params.language = language;
    const response = await axios.get(`${API_URL}/availability`, { params });
    return response.data;
};

const deleteQuestion = async (id) => {
    await axios.delete(`${API_URL}/${id}`);
    clearQuestionCache();
};

const deleteQuestionsBulk = async (ids) => {
    await axios.post(`${API_URL}/bulk/delete`, ids);
    clearQuestionCache();
};

const approveQuestion = async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/approve`, {});
    clearQuestionCache();
    return response.data;
};

const rejectQuestion = async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/reject`, {});
    clearQuestionCache();
    return response.data;
};

const approveQuestionsBulk = async (ids) => {
    await axios.patch(`${API_URL}/bulk/approve`, ids);
    clearQuestionCache();
};

const rejectQuestionsBulk = async (ids) => {
    await axios.patch(`${API_URL}/bulk/reject`, ids);
    clearQuestionCache();
};

const updateStatusBulk = async (ids, status) => {
    await axios.patch(`${API_URL}/bulk/status`, { ids, status });
    clearQuestionCache();
};

const getQuestionById = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

const getMyPendingRevisions = async (originalQuestionIds) => {
    if (!originalQuestionIds || originalQuestionIds.length === 0) return {};
    const response = await axios.post(`${API_URL}/my-revisions`, originalQuestionIds);
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

const getMyFavoriteIds = async () => {
    const response = await axios.get(`${API_URL}/favorites/my/ids`);
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
    getMyPendingRevisions,
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
    getMyFavoriteIds,
    getQuestionAvailability,
};
