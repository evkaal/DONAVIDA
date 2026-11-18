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

export const registrarSalida = async (unidadId, motivo) => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.post(`/unidades/${unidadId}/salida`, { motivo }, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error al registrar la salida:", error);
    throw error;
  }
};

export const getUnidades = async (institucionId) => {
  try{
    const token = localStorage.getItem('token');
    const q = institucionId ? `?institucion_id=${institucionId}` : '';
    const response = await api.get(`/unidades${q}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }catch (error) {
    console.error("Error al consultar las unidades:", error);
    throw error;
  }
};

