import axios from '../utils/axios'; // shared instance — baseURL='/api', token auto-attached via interceptor

const API_URL = '/v1/institutes';

const getAllInstitutes = async (params) => {
    const response = await axios.get(API_URL, { params });
    return response.data;
};

const getInstitute = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

const createInstitute = async (formData) => {
    const response = await axios.post(API_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

const updateInstitute = async (id, formData) => {
    const response = await axios.put(`${API_URL}/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

const activateInstitute = async (id) => {
    await axios.patch(`${API_URL}/${id}/activate`, {});
};

const suspendInstitute = async (id) => {
    await axios.patch(`${API_URL}/${id}/suspend`, {});
};

const upgradePlan = async (id, plan, durationMonths) => {
    await axios.patch(`${API_URL}/${id}/upgrade-plan`, {}, {
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
    upgradePlan,
    getAssignedSubjects: async (id) => {
        const response = await axios.get(`${API_URL}/${id}/assigned-subjects`);
        return response.data;
    },
    assignSubjects: async (id, subjectIds) => {
        const response = await axios.put(`${API_URL}/${id}/assigned-subjects`, subjectIds);
        return response.data;
    }
};
