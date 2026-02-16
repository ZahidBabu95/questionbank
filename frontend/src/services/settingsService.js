import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1/settings/general';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

const settingsService = {
    // Global Settings (Super Admin)
    getGlobalSettings: async (category) => {
        try {
            const response = await axios.get(`${API_URL}/global/${category}`, getAuthHeader());
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    updateGlobalSettings: async (category, settings) => {
        try {
            const response = await axios.put(`${API_URL}/global/${category}`, settings, getAuthHeader());
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    // Institute Settings
    getInstituteSettings: async (category) => {
        try {
            const response = await axios.get(`${API_URL}/institute/${category}`, getAuthHeader());
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    updateInstituteSettings: async (category, settings) => {
        try {
            const response = await axios.put(`${API_URL}/institute/${category}`, settings, getAuthHeader());
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    // Security Settings
    getGlobalSecuritySettings: async () => {
        try {
            const response = await axios.get(`http://localhost:8080/api/v1/settings/security/global`, getAuthHeader());
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    updateGlobalSecuritySettings: async (settings) => {
        try {
            const response = await axios.put(`http://localhost:8080/api/v1/settings/security/global`, settings, getAuthHeader());
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    getInstituteSecuritySettings: async () => {
        try {
            const response = await axios.get(`http://localhost:8080/api/v1/settings/security/institute`, getAuthHeader());
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    updateInstituteSecuritySettings: async (settings) => {
        try {
            const response = await axios.put(`http://localhost:8080/api/v1/settings/security/institute`, settings, getAuthHeader());
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    }
};

export default settingsService;
