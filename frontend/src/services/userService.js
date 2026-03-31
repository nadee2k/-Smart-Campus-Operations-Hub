import api from './api';

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  getTechnicians: () => api.get('/users/technicians'),
  getMyProfile: () => api.get('/users/me/profile'),
  updateProfile: (data) => api.put('/users/me/profile', data),
};
