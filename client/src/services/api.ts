import axios from 'axios';
import { NavigateResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const HCMC_PRESETS = [
  { label: 'ĐH Khoa Học Tự Nhiên (227 Nguyễn Văn Cừ, Q5)', lat: 10.7626, lng: 106.6823 },
  { label: 'Chợ Bến Thành (Quận 1)', lat: 10.7725, lng: 106.6980 },
  { label: 'KĐT Phú Mỹ Hưng (Quận 7)', lat: 10.7303, lng: 106.7075 },
  { label: 'Đường Trần Xuân Soạn (Quận 7 - Hay ngập triều)', lat: 10.7485, lng: 106.7082 },
  { label: 'Landmark 81 (Bình Thạnh)', lat: 10.7950, lng: 106.7219 },
  { label: 'Thảo Điền (TP. Thủ Đức - Đường Quốc Hương)', lat: 10.8038, lng: 106.7326 },
  { label: 'Sân bay Tân Sơn Nhất (Tân Bình)', lat: 10.8185, lng: 106.6588 },
  { label: 'ĐH Bách Khoa (268 Lý Thường Kiệt, Q10)', lat: 10.7722, lng: 106.6578 },
  { label: 'Hồ Con Rùa (Quận 3)', lat: 10.7828, lng: 106.6958 },
  { label: 'Đường Huỳnh Tấn Phát (Quận 7)', lat: 10.7381, lng: 106.7291 },
  { label: 'Đường Nguyễn Văn Quá (Quận 12)', lat: 10.8415, lng: 106.6273 },
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

export const submitReport = (data: {
  coordinate: { lat: number; lng: number };
  depth_level: string;
  description?: string;
}) => api.post('/reports', data).then((r) => r.data);

export const voteReport = (id: string, type: 'upvote' | 'resolved') =>
  api.post(`/reports/${id}/vote`, { type }).then((r) => r.data);

export const parseArticle = (data: { url?: string; raw_text?: string }) =>
  api.post('/admin/articles/parse', data).then((r) => r.data);

