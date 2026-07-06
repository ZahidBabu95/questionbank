import axios from '../utils/axios';

const lectureService = {
    createLecture: async (payload) => {
        const res = await axios.post('/v1/lectures/create', payload);
        return res.data;
    },
    updateLecture: async (id, payload) => {
        const res = await axios.put(`/v1/lectures/${id}`, payload);
        return res.data;
    },
    getLecture: async (id) => {
        const res = await axios.get(`/v1/lectures/${id}`);
        return res.data;
    },
    listLectures: async (params) => {
        const res = await axios.get('/v1/lectures/list', { params });
        return res.data;
    },
    deleteLecture: async (id) => {
        const res = await axios.delete(`/v1/lectures/${id}`);
        return res.data;
    },
    publishLecture: async (id) => {
        const res = await axios.patch(`/v1/lectures/${id}/publish`);
        return res.data;
    },
    addQuestion: async (id, payload) => {
        const res = await axios.post(`/v1/lectures/${id}/add-question`, payload);
        return res.data;
    },
    removeQuestion: async (lectureId, questionId) => {
        const res = await axios.delete(`/v1/lectures/${lectureId}/remove-question/${questionId}`);
        return res.data;
    },
    aiGenerate: async (payload) => {
        const res = await axios.post('/v1/lectures/ai-generate', payload);
        return res.data;
    },
    aiGenerateRag: async (payload) => {
        const res = await axios.post('/v1/lectures/ai-generate-rag', payload);
        return res.data;
    },
    getChapterMetadata: async (chapterId) => {
        const res = await axios.get(`/v1/lectures/chapter-metadata/${chapterId}`);
        return res.data;
    },
    createExamFromLecture: async (lectureId) => {
        const res = await axios.post(`/v1/lectures/${lectureId}/create-exam`);
        return res.data;
    },
    uploadAttachment: async (formData) => {
        const res = await axios.post('/v1/lectures/attachments/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    },
    addExternalLink: async (payload) => {
        const res = await axios.post('/v1/lectures/attachments/link', payload);
        return res.data;
    },
    getAttachments: async (lectureId) => {
        const res = await axios.get(`/v1/lectures/attachments/lecture/${lectureId}`);
        return res.data;
    },
    deleteAttachment: async (id) => {
        const res = await axios.delete(`/v1/lectures/attachments/${id}`);
        return res.data;
    },
    renameAttachment: async (id, title) => {
        const res = await axios.patch(`/v1/lectures/attachments/${id}/rename`, { title });
        return res.data;
    },
    reorderAttachments: async (ids) => {
        const res = await axios.patch('/v1/lectures/attachments/reorder', ids);
        return res.data;
    }
};

export default lectureService;
