import axios from '../utils/axios'; // shared instance — baseURL='/api', token auto-attached via interceptor

const API_URL = '/v1/dashboard';

const getAdminStats = async () => {
    const response = await axios.get(`${API_URL}/admin-stats`);
    return response.data;
};

const getInstituteStats = async () => {
    const response = await axios.get(`${API_URL}/institute-stats`);
    return response.data;
};

const getTeacherStats = async () => {
    const response = await axios.get(`${API_URL}/teacher-stats`);
    return response.data;
};

const getStudentStats = async () => {
    const response = await axios.get(`${API_URL}/student-stats`);
    return response.data;
};

export default {
    getAdminStats,
    getInstituteStats,
    getTeacherStats,
    getStudentStats
};
