import axios from '../utils/axios';

const manualExamService = {
    createExam: (data) => axios.post('/v1/exams/manual/create', data).then(r => r.data),
    updateExam: (id, data) => axios.put(`/v1/exams/manual/${id}`, data).then(r => r.data),
    getExam: (id) => axios.get(`/v1/exams/manual/${id}`).then(r => r.data),
    addQuestion: (examId, data) => axios.post(`/v1/exams/manual/${examId}/add-question`, data).then(r => r.data),
    removeQuestion: (examId, questionId) => axios.delete(`/v1/exams/manual/${examId}/remove-question/${questionId}`).then(r => r.data),
    reorder: (examId, orderedIds) => axios.patch(`/v1/exams/manual/${examId}/reorder`, { orderedQuestionIds: orderedIds }).then(r => r.data),
    publish: (examId) => axios.patch(`/v1/exams/manual/${examId}/publish`).then(r => r.data),
    deleteExam: (id) => axios.delete(`/v1/exams/manual/${id}`).then(r => r.data),
    searchQuestions: (params) => axios.get('/v1/exams/manual/questions/search', { params }).then(r => r.data),
};

export default manualExamService;
