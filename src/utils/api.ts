// src/utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://erp-minhas-obras-backend.onrender.com'
});

// Interceptor para adicionar X-User-ID automaticamente
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      config.headers['X-User-ID'] = String(user.id);
    } catch (e) {
      console.warn('Erro ao parsear usuário do localStorage');
    }
  }
  return config;
});

export default api;