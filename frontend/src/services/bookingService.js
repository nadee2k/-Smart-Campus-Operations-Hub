import api from './api';

export const bookingService = {
  getAll: (params) => api.get('/bookings', { params }),
  getMyBookings: (params) => api.get('/bookings/my', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  approve: (id, data) => api.patch(`/bookings/${id}/approve`, data),
  reject: (id, data) => api.patch(`/bookings/${id}/reject`, data),
  cancel: (id, reason) => api.patch(`/bookings/${id}/cancel`, reason ? { reason } : {}),
  checkIn: (id) => api.patch(`/bookings/${id}/check-in`),
  getCalendar: (params) => api.get('/bookings/calendar', { params }),
  getSuggestions: (params) => api.get('/bookings/suggestions', { params }),
  getMyWaitlistedBookings: (params) => api.get('/bookings/waitlist/my', { params }),
  leaveWaitlist: (id) => api.delete(`/bookings/${id}/waitlist`),
};
