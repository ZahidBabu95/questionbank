import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../utils/i18n';

// DEVELOPMENT NOTE:
// Replace the IP below with your computer's local IP address (e.g. 192.168.1.100)
// Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) in terminal to find your local IP.
export const LOCAL_DEV_IP = '192.168.68.108'; // Active local IP address
export const BASE_URL = `http://${LOCAL_DEV_IP}:8080/api/v1`;

export const getWebAppBaseUrl = () => {
  if (BASE_URL.includes('192.168.') || BASE_URL.includes('10.') || BASE_URL.includes('localhost') || BASE_URL.includes('172.')) {
    return `http://${LOCAL_DEV_IP}:5173`;
  }
  const match = BASE_URL.match(/^(https?:\/\/[^\/]+)/);
  return match ? match[1] : 'https://qb.learningshaper.com';
};

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Token & Language Header
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Fetch JWT Token from SecureStore
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('Error reading token from SecureStore:', e);
    }

    // 2. Fetch language code from i18n and attach Accept-Language header
    const currentLang = i18n.language || 'en';
    config.headers['Accept-Language'] = currentLang;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Authentication Expiry (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Session expired. Cleared credentials.');
      try {
        await SecureStore.deleteItemAsync('token');
        await AsyncStorage.removeItem('user');
      } catch (e) {
        console.log('Error clearing credentials:', e);
      }
      // You can add global navigation redirect hooks here (e.g., using navigation ref)
    }
    return Promise.reject(error);
  }
);

export default apiClient;
