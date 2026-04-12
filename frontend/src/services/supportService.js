import axios from '../utils/axios';

const API_URL = '/v1/support/tickets';

const createTicket = async (data) => {
    const response = await axios.post(API_URL, data);
    return response.data;
};

const replyToTicket = async (id, data) => {
    const response = await axios.post(`${API_URL}/${id}/messages`, data);
    return response.data;
};

const getMyTickets = async (page = 0, size = 15) => {
    const response = await axios.get(`${API_URL}/me?page=${page}&size=${size}`);
    return response.data;
};

const getAllTickets = async (status = null, page = 0, size = 15) => {
    const statusParam = status ? `&status=${status}` : '';
    const response = await axios.get(`${API_URL}?page=${page}&size=${size}${statusParam}`);
    return response.data;
};

const getTicketDetails = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

const updateTicketStatus = async (id, status) => {
    const response = await axios.patch(`${API_URL}/${id}/status?status=${status}`);
    return response.data;
};

export default {
    createTicket,
    replyToTicket,
    getMyTickets,
    getAllTickets,
    getTicketDetails,
    updateTicketStatus
};
