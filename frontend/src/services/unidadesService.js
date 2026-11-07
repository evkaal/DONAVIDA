import api from './api';

export const registrarUnidad = async (unidadData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.post('/unidades', unidadData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error al registrar la unidad:", error);
    throw error;
  }
};