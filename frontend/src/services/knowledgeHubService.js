import axios from '../utils/axios';

const CACHE_KEY = 'qs_resource_library_books';
let cachedBooks = null;
let activeRequests = null;

export const knowledgeHubService = {
    // Fetch all books for the resource library using Stale-While-Revalidate (SWR)
    getSourceBooks: async (bypassCache = false, onRevalidate = null) => {
        let cachedData = null;
        if (!bypassCache) {
            if (!cachedBooks) {
                const sessionData = sessionStorage.getItem(CACHE_KEY);
                if (sessionData) {
                    try {
                        cachedBooks = JSON.parse(sessionData);
                    } catch (e) {}
                }
            }
            cachedData = cachedBooks;
        }

        // Stale-While-Revalidate Strategy:
        // If cached data exists and we are not explicitly bypassing cache,
        // return cached data immediately for instant UI load, and revalidate in background.
        if (!bypassCache && cachedData) {
            knowledgeHubService.revalidateSourceBooks(onRevalidate);
            return cachedData;
        }

        return knowledgeHubService.revalidateSourceBooks(onRevalidate);
    },

    revalidateSourceBooks: async (onRevalidate = null) => {
        if (activeRequests) {
            return activeRequests;
        }

        const prevCacheStr = JSON.stringify(cachedBooks || []);

        activeRequests = axios.get('/v1/knowledge-hub/source-books')
            .then(res => {
                const freshBooks = res.data || [];
                const freshCacheStr = JSON.stringify(freshBooks);

                cachedBooks = freshBooks;
                try {
                    sessionStorage.setItem(CACHE_KEY, freshCacheStr);
                } catch (e) {}
                activeRequests = null;

                // Auto-notify UI if data has changed (e.g. new book added)
                if (typeof onRevalidate === 'function' && prevCacheStr !== freshCacheStr) {
                    onRevalidate(freshBooks);
                }

                return freshBooks;
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

