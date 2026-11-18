import api from './api';

// Los catálogos mandan: los formularios usan los nombres reales de la BD
// (GET /api/catalogos/...), nunca una lista hardcodeada.
// Estas funciones LANZAN el error si la petición falla, para que el
// componente muestre el fallo y deshabilite el envío en vez de usar
// una lista inventada como fallback silencioso.
export const obtenerHemocomponentes = async () => {
  const response = await api.get('/catalogos/hemocomponentes');
  return Array.isArray(response.data) ? response.data : [];
};

export const obtenerTiposSangre = async () => {
  const response = await api.get('/catalogos/tipos-sangre');
  return Array.isArray(response.data) ? response.data : [];
};
