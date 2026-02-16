import axios from 'axios';

const API_URL = '/api/v1/questions';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

const createMCQ = async (question, options) => {
    const response = await axios.post(`${API_URL}/mcq/create`, { question, options }, getAuthHeader());
    return response.data;
};

const createShortQuestion = async (question) => {
    const response = await axios.post(`${API_URL}/short/create`, question, getAuthHeader());
    return response.data;
};

const createCQ = async (question) => {
    const response = await axios.post(`${API_URL}/cq/create`, question, getAuthHeader());
    return response.data;
};

const getAllQuestions = async () => {
    const response = await axios.get(`${API_URL}/list`, getAuthHeader());
    return response.data;
};

const deleteQuestion = async (id) => {
    await axios.delete(`${API_URL}/${id}`, getAuthHeader());
};

const approveQuestion = async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/approve`, {}, getAuthHeader());
    return response.data;
};

const rejectQuestion = async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/reject`, {}, getAuthHeader());
    return response.data;
};

export default {
    createMCQ,
    createShortQuestion,
    createCQ,
    getAllQuestions,
    deleteQuestion,
    approveQuestion,
    rejectQuestion
};
