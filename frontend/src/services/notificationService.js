import axios from '../utils/axios';

const getNotifications = async (page = 0, size = 20) => {
    const response = await axios.get(`/v1/notifications?page=${page}&size=${size}`);
    return response.data;
};

const getUnreadCount = async () => {
    const response = await axios.get('/v1/notifications/unread-count');
    return response.data.count;
};

const markAsRead = async (id) => {
    const response = await axios.patch(`/v1/notifications/${id}/read`);
    return response.data;
};

const markAllAsRead = async () => {
    const response = await axios.post('/v1/notifications/read-all');
    return response.data;
};

export default {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
};
