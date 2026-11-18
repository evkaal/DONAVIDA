import api from './api';

export const obtenerStockInstitucion = async (institucionId) => {
  try {
    const id = institucionId ? Number(institucionId) : 0;
    const response = await api.get(`/stock?institucion_id=${id}`);
    return response.data;
  } catch (err) {
    console.error("Error al obtener stock:", err);
    return null;
  }
};
