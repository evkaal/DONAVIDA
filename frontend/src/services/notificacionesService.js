import api from './api';

// Notificaciones del usuario de la sesión (las no leídas primero).
export const obtenerNotificaciones = async () => {
  const response = await api.get('/notificaciones');
  return Array.isArray(response.data) ? response.data : [];
};

// Marca una notificación como leída.
export const marcarNotificacionLeida = async (id) => {
  const response = await api.patch(`/notificaciones/${id}/leida`);
  return response.data;
};
