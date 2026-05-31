import axios from '../utils/axios';

const cmsService = {
    getSections: async () => {
        const res = await axios.get('/v1/cms/landing/sections');
        return res.data;
    },
    updateSection: async (id, data) => {
        const res = await axios.put(`/v1/cms/landing/sections/${id}`, data);
        return res.data;
    },
    updateStatus: async (id, status) => {
        const res = await axios.patch(`/v1/cms/landing/sections/${id}/status`, { status });
        return res.data;
    },
    getPublicLanding: async () => {
        const res = await axios.get('/v1/public/landing');
        return res.data;
    },
    getPublicSection: async (key) => {
        const res = await axios.get(`/v1/public/sections/${key}`);
        return res.data;
    },
    getPublicPackages: async () => {
        const res = await axios.get('/v1/public/packages');
        return res.data;
    },
    getPublicLanguages: async () => {
        const res = await axios.get('/v1/public/settings/languages');
        return res.data;
    },
    translateText: async (text, targetLang) => {
        const res = await axios.post('/v1/cms/landing/translate', { text, targetLang });
        return res.data;
    },
    getAppReleases: async () => {
        const res = await axios.get('/v1/cms/apps');
        return res.data;
    },
    createAppRelease: async (data) => {
        const res = await axios.post('/v1/cms/apps', data);
        return res.data;
    },
    updateAppRelease: async (id, data) => {
        const res = await axios.put(`/v1/cms/apps/${id}`, data);
        return res.data;
    },
    deleteAppRelease: async (id) => {
        const res = await axios.delete(`/v1/cms/apps/${id}`);
        return res.data;
    },
    uploadAppFile: async (file, platform) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('platform', platform);
        const res = await axios.post('/v1/cms/apps/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return res.data;
    },
    getLatestPublicRelease: async (platform) => {
        const res = await axios.get(`/v1/public/apps/latest?platform=${platform}`);
        return res.data;
    }
};

export default cmsService;

