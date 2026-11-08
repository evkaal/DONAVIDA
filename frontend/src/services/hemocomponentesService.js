import api from './api';

export const getHemocomponentes = async (search = '', page = 1, limit = 10) => {
  try {
    const response = await api.get('/unidades', {
      params: {
        search,
        page,
        limit,
      },
    });
    return response.data; // Devuelve { data: [...], meta: { total_pages, current_page, ... } }
  } catch (error) {
    console.error('Error al obtener unidades:', error);
    throw error;
  }
};