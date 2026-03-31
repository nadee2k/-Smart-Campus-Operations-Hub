import api from './api';

export const ticketService = {
  getAll: (params) => api.get('/tickets', { params }),
  getById: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  updateStatus: (id, data) => api.patch(`/tickets/${id}/status`, data),
  assign: (id, data) => api.patch(`/tickets/${id}/assign`, data),
  rate: (id, rating) => api.patch(`/tickets/${id}/rate`, { rating }),
  reopen: (id) => api.patch(`/tickets/${id}/reopen`),
  updateResolutionNotes: (id, notes) => api.patch(`/tickets/${id}/resolution-notes`, { resolutionNotes: notes }),
  getResourceHistory: (resourceId, params) => api.get(`/tickets/resource/${resourceId}/history`, { params }),
  addAttachment: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tickets/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAttachmentUrl: (ticketId, attachmentId) =>
    `/api/tickets/${ticketId}/attachments/${attachmentId}`,
  getComments: (id, params) => api.get(`/tickets/${id}/comments`, { params }),
  addComment: (id, data) => api.post(`/tickets/${id}/comments`, data),
  updateComment: (ticketId, commentId, data) =>
    api.put(`/tickets/${ticketId}/comments/${commentId}`, data),
  deleteComment: (ticketId, commentId) =>
    api.delete(`/tickets/${ticketId}/comments/${commentId}`),
};
