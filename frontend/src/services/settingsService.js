import axios from '../utils/axios';

const API_URL = '/v1/settings/general';

const settingsService = {
    // Global Settings (Super Admin)
    getGlobalSettings: async (category) => {
        try {
            const response = await axios.get(`${API_URL}/global/${category}`);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    updateGlobalSettings: async (category, settings) => {
        try {
            const response = await axios.put(`${API_URL}/global/${category}`, settings);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    // Institute Settings
    getInstituteSettings: async (category) => {
        try {
            const response = await axios.get(`${API_URL}/institute/${category}`);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    updateInstituteSettings: async (category, settings) => {
        try {
            const response = await axios.put(`${API_URL}/institute/${category}`, settings);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    // Security Settings
    getGlobalSecuritySettings: async () => {
        try {
            const response = await axios.get(`/v1/settings/security/global`);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    updateGlobalSecuritySettings: async (settings) => {
        try {
            const response = await axios.put(`/v1/settings/security/global`, settings);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    getInstituteSecuritySettings: async () => {
        try {
            const response = await axios.get(`/v1/settings/security/institute`);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    updateInstituteSecuritySettings: async (settings) => {
        try {
            const response = await axios.put(`/v1/settings/security/institute`, settings);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    // File Upload for Branding
    uploadBrandingImage: async (file, type) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const response = await axios.post(`${API_URL}/upload-image`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    }
};

export default settingsService;
