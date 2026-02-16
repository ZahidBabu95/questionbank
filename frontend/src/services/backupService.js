import axios from 'axios';

const API_URL = '/api/v1/settings/backup';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

const triggerManualBackup = async (type = 'FULL', tenantId = null) => {
    const params = new URLSearchParams();
    params.append('type', type);
    if (tenantId) params.append('tenantId', tenantId);

    const response = await axios.post(`${API_URL}/manual`, null, {
        ...getAuthHeader(),
        params
    });
    return response.data;
};

const getBackupHistory = async (tenantId = null) => {
    const params = {};
    if (tenantId) params.tenantId = tenantId;

    const response = await axios.get(`${API_URL}/history`, {
        ...getAuthHeader(),
        params
    });
    return response.data;
};

const deleteBackup = async (id) => {
    await axios.delete(`${API_URL}/history/${id}`, getAuthHeader());
};

const restoreBackup = async (id) => {
    const response = await axios.post(`${API_URL}/restore/${id}`, {}, getAuthHeader());
    return response.data;
};

const downloadBackup = (id) => {
    // Determine base URL dynamically or use environment variable
    const baseUrl = axios.defaults.baseURL || '';
    const token = localStorage.getItem('token');
    // Direct link download with token is tricky, usually need short-lived token or download via blob
    // For MVP, we'll try fetch with blob

    return axios.get(`${API_URL}/download/${id}`, {
        ...getAuthHeader(),
        responseType: 'blob'
    });
};

export default {
    triggerManualBackup,
    getBackupHistory,
    deleteBackup,
    restoreBackup,
    downloadBackup
};
