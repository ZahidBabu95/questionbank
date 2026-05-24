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
    }
};

export default cmsService;
