import { apiClient } from './client';
import { saveSurveyForms, getOfflineSurveyForms } from '../lib/db';
import { useSyncStore } from '../store/syncStore';

export const authService = {
  login: (data: any) => apiClient.post('/api/auth/login', data).then(res => res.data),
};

export const formService = {
  getForms: async () => {
    try {
      const res = await apiClient.get('/api/forms');
      await saveSurveyForms(res.data);
      return res.data;
    } catch (err) {
      if (!useSyncStore.getState().isOnline) {
        return getOfflineSurveyForms();
      }
      throw err;
    }
  },
  getFormById: (id: string) => apiClient.get(`/api/forms/${id}`).then(res => res.data),
  createForm: (data: any) => apiClient.post('/api/forms', data).then(res => res.data),
  deleteForm: (id: string) => apiClient.delete(`/api/forms/${id}`).then(res => res.data),
};

export const responseService = {
  submitResponse: (data: any) => apiClient.post('/api/responses', data).then(res => res.data),
  getResponses: () => apiClient.get('/api/responses').then(res => res.data),
  getResponsesStats: () => apiClient.get('/api/responses/stats').then(res => res.data),
};

export const userService = {
  getUsers: () => apiClient.get('/api/users').then(res => res.data),
  createUser: (data: any) => apiClient.post('/api/users', data).then(res => res.data),
  deleteUser: (id: string) => apiClient.delete(`/api/users/${id}`).then(res => res.data),
};
