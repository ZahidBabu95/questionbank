import axios from '../utils/axios';

const API_URL = '/v1/support/knowledge';

const getAllKnowledge = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

const createKnowledge = async (data) => {
    const response = await axios.post(API_URL, data);
    return response.data;
};

const updateKnowledge = async (id, data) => {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
};

const toggleStatus = async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/toggle`);
    return response.data;
};

const deleteKnowledge = async (id) => {
    await axios.delete(`${API_URL}/${id}`);
};

export default {
    getAllKnowledge,
    createKnowledge,
    updateKnowledge,
    toggleStatus,
    deleteKnowledge
};
