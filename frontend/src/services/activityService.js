import api from './api';

export const activityService = {
  getAll: (params) => api.get('/activity', { params }),
  getMyActivity: (params) => api.get('/activity/my', { params }),
};
