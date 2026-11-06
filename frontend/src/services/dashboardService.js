import api from './api';

export const getDashboardStats = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get('/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener las estadísticas del dashboard:", error);
    throw error;
  }
};

export const getStockPorTipo = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get('/dashboard/stock-tipos', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener el stock por tipo sanguíneo:", error);
    throw error;
  }
};

export const getSolicitudesRecientes = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get('/solicitudes/recientes', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener las solicitudes recientes:", error);
    throw error;
  }
};