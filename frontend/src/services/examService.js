import axios from '../utils/axios';

const examService = {
    generateExam: async (payload) => {
        const res = await axios.post('/v1/exams/generate/auto', payload);
        return res.data;
    },
    getExam: async (examId) => {
        const res = await axios.get(`/v1/exams/generate/${examId}`);
        return res.data;
    },
    previewExam: async (examId) => {
        const res = await axios.get(`/v1/exams/generate/${examId}/preview`);
        return res.data;
    },
    regenerateExam: async (examId) => {
        const res = await axios.post(`/v1/exams/generate/${examId}/regenerate`);
        return res.data;
    },
    deleteExam: async (examId) => {
        const res = await axios.delete(`/v1/exams/generate/${examId}`);
        return res.data;
    },
    listExams: async (params) => {
        const res = await axios.get('/v1/exams/generate', { params });
        return res.data;
    },
    updateExam: async (examId, payload) => {
        const res = await axios.put(`/v1/exams/generate/${examId}`, payload);
        return res.data;
    },
    downloadPdf: async (examId, params) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await axios.get(`/v1/exams/download/pdf/${examId}?${queryString}`, { responseType: 'blob' });
        const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `exam-${examId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    },
    downloadWord: async (examId, params) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await axios.get(`/v1/exams/download/word/${examId}?${queryString}`, { responseType: 'blob' });
        const url = URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `exam-${examId}.docx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    },
    // --- Manual Generator Endpoints ---
    createManualExam: async (payload) => {
        const res = await axios.post('/v1/exams/manual/create', payload);
        return res.data;
    },
    updateManualExam: async (examId, payload) => {
        const res = await axios.put(`/v1/exams/manual/${examId}`, payload);
        return res.data;
    },
    getManualExam: async (examId) => {
        const res = await axios.get(`/v1/exams/manual/${examId}`);
        return res.data;
    },
    addQuestionToManualExam: async (examId, payload) => {
        const res = await axios.post(`/v1/exams/manual/${examId}/add-question`, payload);
        return res.data;
    },
    removeQuestionFromManualExam: async (examId, questionId) => {
        const res = await axios.delete(`/v1/exams/manual/${examId}/remove-question/${questionId}`);
        return res.data;
    },
    searchQuestionsForManualExam: async (params) => {
        const res = await axios.get('/v1/exams/manual/questions/search', { params });
        return res.data;
    },
    publishManualExam: async (examId) => {
        const res = await axios.patch(`/v1/exams/manual/${examId}/publish`);
        return res.data;
    }
};

export default examService;
