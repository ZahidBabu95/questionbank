import axios from '../utils/axios';

const blogService = {
    // Admin Posts
    getAllPosts: async (page = 0, size = 10) => {
        const res = await axios.get(`/v1/cms/blog/posts?page=${page}&size=${size}`);
        return res.data;
    },
    getPostById: async (id) => {
        const res = await axios.get(`/v1/cms/blog/posts/${id}`);
        return res.data;
    },
    createPost: async (data) => {
        const res = await axios.post('/v1/cms/blog/posts', data);
        return res.data;
    },
    updatePost: async (id, data) => {
        const res = await axios.put(`/v1/cms/blog/posts/${id}`, data);
        return res.data;
    },
    deletePost: async (id) => {
        await axios.delete(`/v1/cms/blog/posts/${id}`);
    },
    publishPost: async (id) => {
        const res = await axios.patch(`/v1/cms/blog/posts/${id}/publish`);
        return res.data;
    },
    archivePost: async (id) => {
        const res = await axios.patch(`/v1/cms/blog/posts/${id}/archive`);
        return res.data;
    },

    // Admin Categories
    getCategories: async () => {
        const res = await axios.get('/v1/cms/blog/categories');
        return res.data;
    },
    createCategory: async (data) => {
        const res = await axios.post('/v1/cms/blog/categories', data);
        return res.data;
    },
    updateCategory: async (id, data) => {
        const res = await axios.put(`/v1/cms/blog/categories/${id}`, data);
        return res.data;
    },
    deleteCategory: async (id) => {
        await axios.delete(`/v1/cms/blog/categories/${id}`);
    },

    // Admin Tags
    getTags: async () => {
        const res = await axios.get('/v1/cms/blog/tags');
        return res.data;
    },
    createTag: async (data) => {
        const res = await axios.post('/v1/cms/blog/tags', data);
        return res.data;
    },
    deleteTag: async (id) => {
        await axios.delete(`/v1/cms/blog/tags/${id}`);
    },

    // Public
    getPublicPosts: async (page = 0, size = 10) => {
        const res = await axios.get(`/v1/public/blog/posts?page=${page}&size=${size}`);
        return res.data;
    },
    getPublicPost: async (slug) => {
        const res = await axios.get(`/v1/public/blog/posts/${slug}`);
        return res.data;
    },
    getPublicCategories: async () => {
        const res = await axios.get('/v1/public/blog/categories');
        return res.data;
    },
    getPostsByCategory: async (slug, page = 0, size = 10) => {
        const res = await axios.get(`/v1/public/blog/category/${slug}?page=${page}&size=${size}`);
        return res.data;
    },
    getPostsByTag: async (slug, page = 0, size = 10) => {
        const res = await axios.get(`/v1/public/blog/tag/${slug}?page=${page}&size=${size}`);
        return res.data;
    }
};

export default blogService;
