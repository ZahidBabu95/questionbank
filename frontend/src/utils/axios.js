import axios from 'axios';

// Helper: Safely parse JWT payload
export const parseJwt = (token) => {
    try {
        if (!token) return null;
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

// Helper: Check if token expires within the buffer window (default 15 mins)
export const isTokenExpiringSoon = (token, bufferMinutes = 15) => {
    const decoded = parseJwt(token);
    if (!decoded || !decoded.exp) return false;
    const expirationTimeMs = decoded.exp * 1000;
    const now = Date.now();
    return expirationTimeMs - now < bufferMinutes * 60 * 1000;
};

// Global promise to prevent duplicate parallel token refresh calls
let refreshPromise = null;

export const silentRefreshToken = async (currentToken) => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            // Using clean raw axios instance to prevent recursive interceptor loops
            const response = await axios.post('/api/v1/auth/refresh-token', { token: currentToken });
            if (response.data && response.data.success && response.data.data) {
                const newToken = response.data.data;
                localStorage.setItem('token', newToken);
                // Trigger storage event so other tabs and components learn about the new token
                window.dispatchEvent(new Event('storage'));
                return newToken;
            }
        } catch (err) {
            console.warn('Silent token refresh failed:', err?.message || err);
        } finally {
            refreshPromise = null;
        }
        return currentToken;
    })();

    return refreshPromise;
};

const instance = axios.create({
    baseURL: '/api', // Proxy in Vite handles this locally; in prod, it's relative to root
    headers: {
        'Content-Type': 'application/json'
    },
    paramsSerializer: {
        serialize: (params) => {
            const parts = [];
            for (const [key, value] of Object.entries(params)) {
                if (value === null || value === undefined) continue;
                if (Array.isArray(value)) {
                    for (const val of value) {
                        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
                    }
                } else {
                    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                }
            }
            return parts.join('&');
        }
    }
});

// Auto-attach Authorization header & proactively refresh token if expiring soon
instance.interceptors.request.use(
    async (config) => {
        let token = localStorage.getItem('token');
        if (!token && typeof window !== 'undefined' && window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            const tokenFromUrl = urlParams.get('token');
            if (tokenFromUrl) {
                token = tokenFromUrl;
                try { localStorage.setItem('token', tokenFromUrl); } catch (e) {}
            }
        }
        const isExemptFromAuthHeader = config.url && (
            config.url.includes('/auth/login') ||
            config.url.includes('/auth/signup')
        );

        if (token && !isExemptFromAuthHeader) {
            // Proactively refresh token if it expires in less than 15 minutes (except auth entry endpoints)
            const isRefreshExempt = config.url && config.url.includes('/auth/');
            if (!isRefreshExempt && isTokenExpiringSoon(token, 15)) {
                token = await silentRefreshToken(token);
            }
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
            const isPrintView = typeof window !== 'undefined' && window.location.pathname.includes('/print-view/');
            // Do not redirect if the request was a login attempt, signup, a public endpoint, or print-view
            const isAuthOrPublic = error.config && error.config.url && 
                (error.config.url.includes('/auth/login') || error.config.url.includes('/auth/signup') || error.config.url.includes('/public/'));
            
            if (isAuthOrPublic || isPrintView) {
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

