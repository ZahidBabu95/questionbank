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
        if (token) {
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
            // Optional: Redirect to login or clear token
            // localStorage.removeItem('token');
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default instance;
