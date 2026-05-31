import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import i18n from '../utils/i18n';

// DEVELOPMENT NOTE:
// We dynamically resolve the computer's local IP address using Expo Constants.
// If not available, we fall back to the active detected local IP: 192.168.68.107
const getHostIp = (): string => {
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.68.107:8081"
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      return ip;
    }
  }
  return '192.168.68.107'; // Fallback to current local active IP
};

export const LOCAL_DEV_IP = getHostIp();
export const BASE_URL = __DEV__
  ? `http://${LOCAL_DEV_IP}:8080/api/v1`
  : 'https://qb.learningshaper.com/api/v1';

export const getWebAppBaseUrl = () => {
  if (__DEV__) {
    return `http://${LOCAL_DEV_IP}:5173`;
  }
  return 'https://qb.learningshaper.com';
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

// Global Logout Callback Registry for React Context Sync
let logoutCallback: (() => void) | null = null;

export const injectLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

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
      if (logoutCallback) {
        logoutCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
