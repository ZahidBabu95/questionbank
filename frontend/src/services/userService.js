import axios from '../utils/axios';

const API_URL = '/v1/users';

const userService = {
    getAllUsers: async (params) => {
        const response = await axios.get(API_URL, { params });
        return response.data;
    },

    getUserById: async (id) => {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data;
    },

    createUser: async (userData) => {
        const response = await axios.post(API_URL, userData);
        return response.data;
    },

    updateUser: async (id, userData) => {
        const response = await axios.put(`${API_URL}/${id}`, userData);
        return response.data;
    },

    deleteUser: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    },

    activateUser: async (id) => {
        const response = await axios.patch(`${API_URL}/${id}/activate`);
        return response.data;
    },

    deactivateUser: async (id) => {
        const response = await axios.patch(`${API_URL}/${id}/deactivate`);
        return response.data;
    },

    unlockUser: async (id) => {
        const response = await axios.patch(`${API_URL}/${id}/unlock`);
        return response.data;
    },

    resetPassword: async (id) => {
        const response = await axios.patch(`${API_URL}/${id}/reset-password`);
        return response.data;
    },

    impersonateUser: async (userId) => {
        const response = await axios.post(`/v1/auth/impersonate/${userId}`);
        return response.data;
    },

    getUserStats: async () => {
        const response = await axios.get(`${API_URL}/stats`);
        return response.data;
    },

    getAssignedSubjects: async (userId) => {
        const response = await axios.get(`${API_URL}/${userId}/assigned-subjects`);
        return response.data;
    },

    assignSubjects: async (userId, subjectIds) => {
        const response = await axios.put(`${API_URL}/${userId}/assigned-subjects`, subjectIds);
        return response.data;
    },

    bulkActivate: async (ids) => {
        const response = await axios.post(`${API_URL}/bulk/activate`, ids);
        return response.data;
    },

    bulkDeactivate: async (ids) => {
        const response = await axios.post(`${API_URL}/bulk/deactivate`, ids);
        return response.data;
    },

    bulkDelete: async (ids) => {
        const response = await axios.post(`${API_URL}/bulk/delete`, ids);
        return response.data;
    },

    exportCsv: async (role, active) => {
        const params = {};
        if (role) params.role = role;
        if (active !== undefined && active !== null) params.active = active;
        const response = await axios.get(`${API_URL}/export/csv`, { params, responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'users.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    getActivityLog: async (userId, page = 0, size = 20) => {
        const response = await axios.get(`${API_URL}/${userId}/activity-log`, { params: { page, size } });
        return response.data;
    },

    getAllActivityLogs: async (page = 0, size = 30) => {
        const response = await axios.get(`${API_URL}/activity-log`, { params: { page, size } });
        return response.data;
    },

    getLoginHistory: async (userId, page = 0, size = 20) => {
        const response = await axios.get(`${API_URL}/${userId}/login-history`, { params: { page, size } });
        return response.data;
    },

    getMonthlyAnalytics: async () => {
        const response = await axios.get(`${API_URL}/analytics/monthly-registrations`);
        return response.data;
    },

    getRoleBreakdown: async () => {
        const response = await axios.get(`${API_URL}/analytics/role-breakdown`);
        return response.data;
    },

    importUsers: async (file, defaultRole = 'STUDENT', defaultInstituteId = null) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('defaultRole', defaultRole);
        if (defaultInstituteId) formData.append('defaultInstituteId', defaultInstituteId);
        const response = await axios.post(`${API_URL}/import`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    downloadImportTemplate: async () => {
        const response = await axios.get(`${API_URL}/import/template`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'user_import_template.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    getRoles: async () => {
        const response = await axios.get('/v1/roles');
        return response.data;
    },

    // Permissions Add/Sync
    syncPermissions: async (permissionNames) => {
        try {
            const response = await axios.post('/v1/permissions/sync', { permissions: permissionNames });
            return response.data;
        } catch (error) {
            console.error('Error syncing permissions:', error);
            throw error;
        }
    },

    getPermissions: async () => {
        const response = await axios.get('/v1/permissions');
        return response.data;
    },

    createRole: async (roleData) => {
        const response = await axios.post('/v1/roles', roleData);
        return response.data;
    },

    updateRole: async (id, roleData) => {
        const response = await axios.put(`/v1/roles/${id}`, roleData);
        return response.data;
    },

    deleteRole: async (id) => {
        const response = await axios.delete(`/v1/roles/${id}`);
        return response.data;
    }
};

export default userService;
