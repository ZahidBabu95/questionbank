import axios from '../utils/axios';

const performanceService = {
    getStudentPerformance: async (startDate, endDate, classId, subjectId) => {
        const res = await axios.get('/v1/reports/performance/students', {
            params: { startDate, endDate, classId, subjectId }
        });
        return res.data;
    },
    getQuestionPerformance: async (startDate, endDate, subjectId) => {
        const res = await axios.get('/v1/reports/performance/questions', {
            params: { startDate, endDate, subjectId }
        });
        return res.data;
    },
    getExamPerformance: async (id) => {
        const res = await axios.get(`/v1/reports/performance/exams/${id}`);
        return res.data;
    }
};

export default performanceService;
