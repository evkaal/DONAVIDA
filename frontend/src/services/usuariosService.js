import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

export const registrarUsuario = async (userData) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/usuarios`, userData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const obtenerInstituciones = async () => {
  const token = localStorage.getItem('token');
  try {
    const response = await axios.get(`${API_URL}/instituciones`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Validar que la respuesta sea un arreglo, si no, retornar array vacío
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Error obteniendo instituciones:", err);
    return [];
  }
};



export const registrarInstitucion = async (institucionData) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/instituciones`, institucionData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};



export const obtenerUsuarios = async () => {
  const token = localStorage.getItem('token');
  try {
    const response = await axios.get(`${API_URL}/usuarios`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Error obteniendo usuarios:", err);
    return [];
  }
};

export const eliminarUsuarioService = async (id) => {
  const token = localStorage.getItem('token');
  const response = await axios.delete(`${API_URL}/usuarios/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};