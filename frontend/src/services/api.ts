 
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://server-production-373b.up.railway.app/api';

// Separate axios instance for token refresh to avoid interceptor loops
const refreshApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10000, // 10s timeout for refresh
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing && refreshPromise) {
        try {
          const token = await refreshPromise;
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        useAuthStore.getState().logout();
        return Promise.reject(new Error('Max refresh attempts exceeded'));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      refreshAttempts++;

      refreshPromise = (async () => {
        try {
          const { data } = await refreshApi.post('/auth/refresh', {});
          const newAccessToken = data?.data?.accessToken || data?.accessToken;
          
          if (!newAccessToken) {
            throw new Error('No access token in refresh response');
          }
          
          useAuthStore.getState().setAccessToken(newAccessToken);
          refreshAttempts = 0;
          return newAccessToken;
        } catch (err: any) {
          if (err.response?.status === 409) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const newToken = useAuthStore.getState().accessToken;
            if (newToken) return newToken;
          }
          useAuthStore.getState().logout();
          throw err;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      try {
        const token = await refreshPromise;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
