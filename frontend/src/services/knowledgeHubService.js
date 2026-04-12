import axiosInternal from '../utils/axios';

const BASE_URL = '/knowledge-hub';

export const knowledgeHubService = {
    // Fetch all books for the resource library
    getAllBooks: async () => {
        const response = await axiosInternal.get(`${BASE_URL}/books`);
        return response.data;
    },

    // Placeholder for future endpoints
    uploadBookDetails: async (formData) => {
        // Will implement the multi-part upload to backend -> R2 later
        const response = await axiosInternal.post(`${BASE_URL}/books/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};
