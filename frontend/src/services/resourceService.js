import api from './api';

export const resourceService = {
  getAll: (params) => api.get('/resources', { params }),
  getById: (id) => api.get(`/resources/${id}`),
  getWeeklyReport: (id) => api.get(`/resources/${id}/weekly-report`),
  downloadWeeklyReport: (id) => api.get(`/resources/${id}/weekly-report.pdf`, { responseType: 'blob' }),
  search: (params) => api.get('/resources/search', { params }),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.put(`/resources/${id}`, data),
  delete: (id) => api.delete(`/resources/${id}`),
};
