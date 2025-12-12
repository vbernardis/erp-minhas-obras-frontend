const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://erp-minhas-obras-backend.onrender.com'
  : 'http://localhost:3001';

export default API_BASE;