import api from './api';

export const resourceService = {
  getAll: (params) => api.get('/resources', { params }),
  getById: (id) => api.get(`/resources/${id}`),
  getReviews: (id) => api.get(`/resources/${id}/reviews`),
  saveReview: (id, data) => api.post(`/resources/${id}/reviews`, data),
  deleteReview: (id, reviewId) => api.delete(`/resources/${id}/reviews/${reviewId}`),
  getBlackouts: (id) => api.get(`/resources/${id}/blackouts`),
  createBlackout: (id, data) => api.post(`/resources/${id}/blackouts`, data),
  deleteBlackout: (id, blackoutId) => api.delete(`/resources/${id}/blackouts/${blackoutId}`),
  getMyWatchlist: () => api.get('/resources/watchlist/my'),
  getWatchStatus: (id) => api.get(`/resources/${id}/watch-status`),
  watch: (id) => api.post(`/resources/${id}/watch`),
  unwatch: (id) => api.delete(`/resources/${id}/watch`),
  toggleStatus: (id) => api.patch(`/resources/${id}/toggle-status`),
  getWeeklyReport: (id) => api.get(`/resources/${id}/weekly-report`),
  downloadWeeklyReport: (id) => api.get(`/resources/${id}/weekly-report.pdf`, { responseType: 'blob' }),
  search: (params) => api.get('/resources/search', { params }),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.put(`/resources/${id}`, data),
  delete: (id) => api.delete(`/resources/${id}`),
};
