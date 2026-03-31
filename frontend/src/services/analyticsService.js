import api from './api';

export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getPeakHours: () => api.get('/analytics/bookings/peak-hours'),
  getMostBooked: () => api.get('/analytics/resources/most-booked'),
  getResolutionTime: () => api.get('/analytics/tickets/resolution-time'),
  getMyStats: () => api.get('/analytics/my-stats'),
  getTechnicianStats: (id) => api.get(`/analytics/technician/${id}/stats`),
  getSlaBreaches: () => api.get('/analytics/sla-breaches'),
  getSatisfactionSummary: () => api.get('/analytics/satisfaction-summary'),
  getTechnicianLeaderboard: () => api.get('/analytics/technician-leaderboard'),
};
