import axios from '../utils/axios'; // shared instance — baseURL='/api', token auto-attached via interceptor

const API_URL = '/v1/settings/backup';

const triggerManualBackup = async (type = 'FULL', tenantId = null) => {
    const params = new URLSearchParams();
    params.append('type', type);
    if (tenantId) params.append('tenantId', tenantId);

    const response = await axios.post(`${API_URL}/manual`, null, { params });
    return response.data;
};

const getBackupHistory = async (tenantId = null) => {
    const params = {};
    if (tenantId) params.tenantId = tenantId;
    const response = await axios.get(`${API_URL}/history`, { params });
    return response.data;
};

const deleteBackup = async (id) => {
    await axios.delete(`${API_URL}/history/${id}`);
};

const restoreBackup = async (id) => {
    const response = await axios.post(`${API_URL}/restore/${id}`, {});
    return response.data;
};

const downloadBackup = (id) => {
    return axios.get(`${API_URL}/download/${id}`, { responseType: 'blob' });
};

export default {
    triggerManualBackup,
    getBackupHistory,
    deleteBackup,
    restoreBackup,
    downloadBackup
};
