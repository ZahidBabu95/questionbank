import axios from '../utils/axios';

const billingService = {
    getPackages: async () => {
        const res = await axios.get('/v1/billing/packages');
        return res.data;
    },
    getPackage: async (id) => {
        const res = await axios.get(`/v1/billing/packages/${id}`);
        return res.data;
    },
    createPackage: async (data) => {
        const res = await axios.post('/v1/billing/packages', data);
        return res.data;
    },
    updatePackage: async (id, data) => {
        const res = await axios.put(`/v1/billing/packages/${id}`, data);
        return res.data;
    },
    deletePackage: async (id) => {
        await axios.delete(`/v1/billing/packages/${id}`);
    },
    updateStatus: async (id, status) => {
        const res = await axios.patch(`/v1/billing/packages/${id}/status`, { status });
        return res.data;
    }
};

export default billingService;
