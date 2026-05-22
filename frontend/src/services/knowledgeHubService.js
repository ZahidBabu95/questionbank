import axios from '../utils/axios';

let cachedBooks = null;
let activeRequests = null;

export const knowledgeHubService = {
    // Fetch all books for the resource library with caching
    getSourceBooks: async (bypassCache = false) => {
        if (!bypassCache && cachedBooks) {
            return cachedBooks;
        }
        if (activeRequests) {
            return activeRequests;
        }
        activeRequests = axios.get('/v1/knowledge-hub/source-books')
            .then(res => {
                cachedBooks = res.data;
                activeRequests = null;
                return res.data;
            })
            .catch(err => {
                activeRequests = null;
                throw err;
            });
        return activeRequests;
    },

    getCachedBooks: () => {
        return cachedBooks;
    },

    clearCache: () => {
        cachedBooks = null;
        activeRequests = null;
    }
};
