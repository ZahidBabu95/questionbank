import axios from '../utils/axios';

const CACHE_KEY = 'qs_resource_library_books';
let cachedBooks = null;
let activeRequests = null;

export const knowledgeHubService = {
    // Fetch all books for the resource library with caching
    getSourceBooks: async (bypassCache = false) => {
        if (!bypassCache) {
            const sessionData = sessionStorage.getItem(CACHE_KEY);
            if (sessionData) {
                try {
                    cachedBooks = JSON.parse(sessionData);
                } catch (e) {}
            }
        }
        if (!bypassCache && cachedBooks) {
            return cachedBooks;
        }
        if (activeRequests) {
            return activeRequests;
        }
        activeRequests = axios.get('/v1/knowledge-hub/source-books')
            .then(res => {
                cachedBooks = res.data;
                try {
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
                } catch (e) {}
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
        if (!cachedBooks) {
            try {
                const sessionData = sessionStorage.getItem(CACHE_KEY);
                if (sessionData) cachedBooks = JSON.parse(sessionData);
            } catch (e) {}
        }
        return cachedBooks;
    },

    clearCache: () => {
        cachedBooks = null;
        activeRequests = null;
        try {
            sessionStorage.removeItem(CACHE_KEY);
        } catch (e) {}
    }
};
