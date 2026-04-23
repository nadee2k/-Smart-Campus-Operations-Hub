import api from './api';

export const assistantService = {
  chat: (data) => api.post('/assistant/resource/chat', data),
};
