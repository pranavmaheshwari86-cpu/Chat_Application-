 
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

const processQueue = (error: any, token: string | null = null) => {
  // Copy queue to avoid stale closure issues
  const queue = [...failedQueue];
  failedQueue = [];
  
  queue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
};

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
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        useAuthStore.getState().logout();
        return Promise.reject(new Error('Max refresh attempts exceeded'));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      refreshAttempts++;

      try {
        // Use separate refreshApi instance to avoid interceptor loop
        const { data } = await refreshApi.post('/auth/refresh', {});
        
        // Backend TransformInterceptor wraps response as { success, data: { accessToken } }
        const newAccessToken = data?.data?.accessToken || data?.accessToken;
        
        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }
        
        useAuthStore.getState().setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);
        refreshAttempts = 0; // Reset on success
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        useAuthStore.getState().logout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
