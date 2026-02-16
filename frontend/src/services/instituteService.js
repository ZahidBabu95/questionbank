import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1/institutes';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

const getAllInstitutes = async (params) => {
    const response = await axios.get(API_URL, { ...getAuthHeader(), params });
    return response.data;
};

const getInstitute = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
};

const createInstitute = async (formData) => {
    const response = await axios.post(API_URL, formData, {
        headers: {
            ...getAuthHeader().headers,
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

const updateInstitute = async (id, formData) => {
    const response = await axios.put(`${API_URL}/${id}`, formData, {
        headers: {
            ...getAuthHeader().headers,
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

const activateInstitute = async (id) => {
    await axios.patch(`${API_URL}/${id}/activate`, {}, getAuthHeader());
};

const suspendInstitute = async (id) => {
    await axios.patch(`${API_URL}/${id}/suspend`, {}, getAuthHeader());
};

const upgradePlan = async (id, plan, durationMonths) => {
    await axios.patch(`${API_URL}/${id}/upgrade-plan`, {}, {
        ...getAuthHeader(),
        params: { plan, durationMonths }
    });
};

export default {
    getAllInstitutes,
    getInstitute,
    createInstitute,
    updateInstitute,
    activateInstitute,
    suspendInstitute,
    upgradePlan
};
