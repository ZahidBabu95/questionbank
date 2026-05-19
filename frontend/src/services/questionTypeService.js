import axios from '../utils/axios';

const API_URL = '/v1/question-types';

const getAllQuestionTypes = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

const getQuestionTypeById = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

const getQuestionTypeByCode = async (code) => {
    const response = await axios.get(`${API_URL}/code/${code}`);
    return response.data;
};

const createQuestionType = async (data) => {
    const response = await axios.post(API_URL, data);
    return response.data;
};

const updateQuestionType = async (id, data) => {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
};

const deleteQuestionType = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
};

export default {
    getAllQuestionTypes,
    getQuestionTypeById,
    getQuestionTypeByCode,
    createQuestionType,
    updateQuestionType,
    deleteQuestionType,
};
