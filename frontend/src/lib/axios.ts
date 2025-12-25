import { useAuthStore } from '@/stores/useAuthStore';
import axios from 'axios';

const viteApi = (import.meta.env as { VITE_API_URL?: string }).VITE_API_URL;
const api = axios.create({
  baseURL: viteApi ? `${viteApi.replace(/\/$/, '')}/api` : (import.meta.env.MODE === 'development' ? 'http://localhost:5001/api' : '/api'),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();


  // send header
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// auto call refresh token api when access token expired
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // APIs that do not require token refresh
    if (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/register') ||
      originalRequest.url.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retryCount = originalRequest._retryCount || 0;

    // Trigger refresh on 401 (unauthenticated) only — not 403 (forbidden)
    if (error.response?.status === 401 && originalRequest._retryCount < 4) {
      originalRequest._retryCount += 1;

      console.log('refresh', originalRequest._retryCount);

      try {
        const res = await api.post(
          '/auth/refresh',
          {},
          { withCredentials: true }
        );
        const newAccessToken = res.data.accessToken;

        useAuthStore.getState().setAccessToken(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearState();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
export default api;
