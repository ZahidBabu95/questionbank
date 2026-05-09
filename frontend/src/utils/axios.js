import axios from 'axios';

const instance = axios.create({
    baseURL: '/api', // Proxy in Vite handles this locally; in prod, it's relative to root
    headers: {
        'Content-Type': 'application/json'
    }
});

// Auto-attach Authorization header
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        // Do not attach token for public endpoints
        const isPublicEndpoint = config.url && config.url.includes('/public/');
        if (token && !isPublicEndpoint) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Do not redirect if the request was a login attempt or a public endpoint
            const isAuthOrPublic = error.config && error.config.url && 
                (error.config.url.includes('/auth/') || error.config.url.includes('/public/'));
            
            if (isAuthOrPublic) {
                return Promise.reject(error);
            }
            
            // Redirect to login and clear token and user data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('adminToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default instance;
