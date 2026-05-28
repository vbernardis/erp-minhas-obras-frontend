// src/api/config.js
import axios from 'axios';

// URL base do backend
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://erp-minhas-obras-backend.onrender.com'
  : 'http://localhost:3001';

// Cria instância do axios
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Interceptor: adiciona X-User-ID SEM modificar a URL
api.interceptors.request.use(
  config => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.id) {
          // ✅ Apenas adiciona header, NUNCA modifique config.url
          config.headers['X-User-ID'] = String(user.id);
        }
      }
    } catch (error) {
      console.error('Erro ao ler usuário:', error);
    }
    // ✅ Retorna config SEM modificar url
    return config;
  },
  error => Promise.reject(error)
);

export default api;
export { API_BASE };