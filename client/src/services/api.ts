import axios from 'axios';
import { NavigateResponse, WeatherDashboardData, AuthUser, AuthResponse } from '../types';

function getBaseUrl(): string {
  let url = (import.meta.env.VITE_API_URL || '/api').trim();
  url = url.replace(/\/+$/, '');
  if (url.startsWith('http') && !url.endsWith('/api')) {
    url += '/api';
  }
  return url;
}

const api = axios.create({
  baseURL: getBaseUrl(),
});

// Attach Authorization Bearer header if token exists in localStorage
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('saferoute_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('Failed to retrieve token from localStorage', err);
  }
  return config;
});

export const HCMC_PRESETS = [
  { label: 'ĐH Khoa Học Tự Nhiên, 227 Nguyễn Văn Cừ, Quận 5', lat: 10.7626, lng: 106.6823 },
  { label: 'Chợ Bến Thành, Quận 1', lat: 10.7725, lng: 106.6980 },
  { label: 'KĐT Phú Mỹ Hưng, Quận 7', lat: 10.7303, lng: 106.7075 },
  { label: 'Đường Trần Xuân Soạn, Quận 7', lat: 10.7485, lng: 106.7082 },
  { label: 'Landmark 81, Bình Thạnh', lat: 10.7950, lng: 106.7219 },
  { label: 'Thảo Điền, TP Thủ Đức', lat: 10.8038, lng: 106.7326 },
  { label: 'Sân bay Tân Sơn Nhất, Tân Bình', lat: 10.8185, lng: 106.6588 },
  { label: 'ĐH Bách Khoa, 268 Lý Thường Kiệt, Quận 10', lat: 10.7722, lng: 106.6578 },
  { label: 'Hồ Con Rùa, Quận 3', lat: 10.7828, lng: 106.6958 },
  { label: 'Đường Huỳnh Tấn Phát, Quận 7', lat: 10.7381, lng: 106.7291 },
  { label: 'Đường Nguyễn Văn Quá, Quận 12', lat: 10.8415, lng: 106.6273 },
];

export const searchLocation = async (query: string): Promise<{ label: string; lat: number; lng: number }[]> => {
  const trimmed = query.trim();
  if (!trimmed) return HCMC_PRESETS.slice(0, 5);

  try {
    const res = await api.get('/geocoding/search', { params: { q: trimmed } });
    if (res.data && res.data.results && res.data.results.length > 0) {
      return res.data.results;
    }
  } catch (err) {
    console.warn('Geocoding search via backend proxy failed, fallback to presets', err);
  }

  return HCMC_PRESETS.filter((p) => p.label.toLowerCase().includes(trimmed.toLowerCase()));
};

export const reverseGeocode = async (lat: number, lng: number): Promise<{ label: string; lat: number; lng: number }> => {
  try {
    const res = await api.get('/geocoding/reverse', { params: { lat, lng } });
    if (res.data) {
      return res.data;
    }
  } catch (err) {
    console.warn('Reverse geocoding error', err);
  }
  return {
    label: `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    lat,
    lng,
  };
};

export const getActiveFloods = (targetTime?: string) =>
  api.get('/floods/active', { params: { target_time: targetTime } }).then((r) => r.data);

export const navigateRoute = (data: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  target_time: string;
  vehicle_type: 'motorbike' | 'car';
}): Promise<NavigateResponse> => api.post('/routes/navigate', data).then((r) => r.data);

export function getOrCreateClientToken(): string {
  try {
    let token = localStorage.getItem('saferoute_client_token');
    if (!token) {
      token = 'client_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      localStorage.setItem('saferoute_client_token', token);
    }
    return token;
  } catch {
    return 'client_fallback_' + Date.now();
  }
}

export const submitReport = (data: {
  coordinate: { lat: number; lng: number };
  depth_level: string;
  description?: string;
}) =>
  api.post('/reports', data, {
    headers: {
      'x-client-token': getOrCreateClientToken(),
    },
  }).then((r) => r.data);

export const voteReport = (id: string, type: 'upvote' | 'resolved') =>
  api.post(`/reports/${id}/vote`, { type }).then((r) => r.data);

export const getNewsArticles = () =>
  api.get('/news').then((r) => r.data);

export const triggerCrawlNow = () =>
  api.post('/news/crawl-now').then((r) => r.data);

export const getWeatherData = (targetTime?: string): Promise<WeatherDashboardData> =>
  api.get('/weather', { params: { target_time: targetTime } }).then((r) => r.data);

export const getAdminReports = () =>
  api.get('/admin/reports').then((r) => r.data);

export const approveAdminReport = (id: string) =>
  api.post(`/admin/reports/${id}/approve`).then((r) => r.data);

export const rejectAdminReport = (id: string) =>
  api.post(`/admin/reports/${id}/reject`).then((r) => r.data);

export const approveAdminCluster = (clusterId: string) =>
  api.post(`/admin/clusters/${clusterId}/approve`).then((r) => r.data);

export const rejectAdminCluster = (clusterId: string) =>
  api.post(`/admin/clusters/${clusterId}/reject`).then((r) => r.data);

export const takedownAdminReport = (id: string) =>
  api.post(`/admin/reports/${id}/takedown`).then((r) => r.data);

export const getAdminSettings = () =>
  api.get('/admin/settings').then((r) => r.data);

export const updateAdminSettings = (settings: Partial<{ isAutoPilotEnabled: boolean; autoApproveThreshold: number }>) =>
  api.post('/admin/settings', settings).then((r) => r.data);

// ==================== AUTHENTICATION & RBAC ====================

export const login = (data: { username: string; password: string }): Promise<AuthResponse> =>
  api.post('/auth/login', data).then((r) => r.data);

export const register = (data: { username: string; password: string; fullName: string }): Promise<AuthResponse> =>
  api.post('/auth/register', data).then((r) => r.data);

export const getMe = (): Promise<{ user: AuthUser }> =>
  api.get('/auth/me').then((r) => r.data);

export const setAuthToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem('saferoute_auth_token', token);
    } else {
      localStorage.removeItem('saferoute_auth_token');
    }
  } catch (err) {
    console.warn('Error saving auth token', err);
  }
};

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('saferoute_auth_token');
  } catch {
    return null;
  }
};


