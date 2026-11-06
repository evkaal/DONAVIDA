import api from './api';

// Función para registrar un nuevo usuario
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Función para iniciar sesión
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/login', credentials);
    return response.data; // Aquí se recibirá el token JWT del backend
  } catch (error) {
    throw error.response?.data || error.message;
  }
};