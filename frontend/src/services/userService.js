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

    resetPassword: async (id) => {
        const response = await axios.patch(`${API_URL}/${id}/reset-password`);
        return response.data;
    },

    impersonateUser: async (userId) => {
        try {
            const response = await api.post(`/users/${userId}/impersonate`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getRoles: async () => {
        try {
            const response = await api.get('/roles');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getPermissions: async () => {
        try {
            const response = await api.get('/permissions');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    createRole: async (roleData) => {
        try {
            const response = await api.post('/roles', roleData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateRole: async (id, roleData) => {
        try {
            const response = await api.put(`/roles/${id}`, roleData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteRole: async (id) => {
        try {
            const response = await api.delete(`/roles/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default userService;
