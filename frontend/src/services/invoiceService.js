import axios from '../utils/axios';

const invoiceService = {
    getInvoices: async (params) => {
        const res = await axios.get('/v1/billing/invoices', { params });
        return res.data;
    },
    getInvoice: async (id) => {
        const res = await axios.get(`/v1/billing/invoices/${id}`);
        return res.data;
    },
    createInvoice: async (data) => {
        const res = await axios.post('/v1/billing/invoices', data);
        return res.data;
    },
    updatePayment: async (id, data) => {
        const res = await axios.patch(`/v1/billing/invoices/${id}/payment`, data);
        return res.data;
    },
    deleteInvoice: async (id) => {
        await axios.delete(`/v1/billing/invoices/${id}`);
    },
    downloadPdf: async (id, invoiceNumber) => {
        const response = await axios.get(`/v1/billing/invoices/${id}/download`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Invoice_${invoiceNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
};

export default invoiceService;
