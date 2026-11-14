import api from './api';

export const getHistorico = async (params, signal) => {
  const token = localStorage.getItem('token');
  const response = await api.get('/solicitudes/historico', {
    params,
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};
