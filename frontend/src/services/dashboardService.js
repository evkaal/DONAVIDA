import api from './api';
import { obtenerToken } from './sesionService';

export const getDashboardStats = async () => {
  try {
    const token = obtenerToken();
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
    const token = obtenerToken();
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
    const token = obtenerToken();
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

// Actividad reciente real del Dashboard (unidades registradas y
// solicitudes recientes). Antes la tabla estaba cableada a un estado
// vacío y nunca mostraba nada.
export const getActividadReciente = async () => {
  try {
    const token = obtenerToken();
    const response = await api.get('/dashboard/actividad', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener la actividad reciente:", error);
    throw error;
  }
};





export const getAdminResumen = async () => {
  try {
    const token = obtenerToken();
    const response = await api.get('/admin/resumen', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener el resumen de admin:", error);
    throw error;
  }
};
