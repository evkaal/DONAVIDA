import axios from 'axios';

const API_URL = 'http://159.173.138.239:8080/api';

export const obtenerStockInstitucion = async (institucionId) => {
  const token = localStorage.getItem('token');
  try {
    const response = await axios.get(`${API_URL}/stock?institucion_id=${institucionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (err) {
    console.error("Error al obtener stock:", err);
    return null;
  }
};