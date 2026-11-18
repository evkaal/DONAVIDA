import api from './api';

export const crearSolicitud = async (solicitudData) => {
  const response = await api.post('/solicitudes', solicitudData);
  return response.data;
};

export const obtenerSolicitudesEntrantes = async (institucionId) => {
  // Lanza el error para que el componente muestre el fallo en vez de
  // un estado vacío que parece "no hay solicitudes".
  const q = institucionId ? `?institucion_id=${institucionId}` : '';
  const response = await api.get(`/solicitudes/entrantes${q}`);
  return Array.isArray(response.data) ? response.data : [];
};

export const responderSolicitud = async (id, accion) => {
  // accion: 'aceptar' | 'rechazar'. El id puede venir como "SOL-0001".
  const response = await api.post(`/solicitudes/entrantes/${id}/${accion}`);
  return response.data;
};

export const obtenerHistorico = async (institucionId, filtros = {}) => {
  // Lanza el error para que el componente muestre el fallo en vez de
  // un estado vacío que parece "no hay solicitudes".
  const params = new URLSearchParams();
  if (institucionId) params.set('institucion_id', institucionId);
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.estado) params.set('estado', filtros.estado);
  const q = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/solicitudes/historico${q}`);
  return response.data || { solicitudes: [], conteos: { todas: 0, enviadas: 0, recibidas: 0 } };
};
