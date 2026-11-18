import axios from 'axios';

// VITE_API_URL debe incluir /api, por ejemplo:
// local: http://localhost:8080/api
// producción: http://159.173.138.239:8080/api
// Sin comillas: import.meta.env es código, no un texto.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// El token se agrega automáticamente, así no hay que repetirlo en cada servicio.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
