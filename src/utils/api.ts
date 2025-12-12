// src/utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001', // ← Porta do seu backend
});

export default api;