import axios from 'axios';
import { NavigateResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
});

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
