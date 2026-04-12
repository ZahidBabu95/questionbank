import axios from '../utils/axios';

const reportService = {
    getOverview: async (startDate, endDate) => {
        const res = await axios.get('/v1/reports/usage/overview', {
            params: { startDate, endDate }
        });
        return res.data;
    },
    getQuestionsReport: async (startDate, endDate, subjectId) => {
        const res = await axios.get('/v1/reports/usage/questions', {
            params: { startDate, endDate, subjectId }
        });
        return res.data;
    },
    getExamsReport: async (startDate, endDate, subjectId) => {
        const res = await axios.get('/v1/reports/usage/exams', {
            params: { startDate, endDate, subjectId }
        });
        return res.data;
    },
    getTeachersReport: async (startDate, endDate) => {
        const res = await axios.get('/v1/reports/usage/teachers', {
            params: { startDate, endDate }
        });
        return res.data;
    }
};

export default reportService;
