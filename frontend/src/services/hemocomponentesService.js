import api from './api';

export const getHemocomponentes = async (search = '', page = 1, limit = 10, filtros = {}) => {
  try {
    const params = { search, page, limit };
    if (filtros.tipo && filtros.tipo !== 'todos') params.tipo = filtros.tipo;
    if (filtros.hemocomponente && filtros.hemocomponente !== 'todos') params.hemocomponente = filtros.hemocomponente;
    if (filtros.estado && filtros.estado !== 'todos') params.estado = filtros.estado;

    const response = await api.get('/unidades', { params });
    return response.data;
  } catch (error) {
    console.error('Error al obtener unidades:', error);
    throw error;
  }
};