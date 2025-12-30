// src/utils/api.ts
import axios from 'axios';

// ✅ Usa variável de ambiente ou fallback para backend no Render
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://erp-minhas-obras-backend.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL
});

export default api;