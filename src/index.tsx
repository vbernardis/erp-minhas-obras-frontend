import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// === INÍCIO: Configuração global do Axios para enviar X-User-ID ===
import axios from 'axios';

axios.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // Envia o ID do usuário em todas as requisições
      config.headers['X-User-ID'] = String(user.id);
    } catch (e) {
      console.warn('Erro ao ler usuário do localStorage');
    }
  }
  return config;
});
// === FIM: Configuração global do Axios ===

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
