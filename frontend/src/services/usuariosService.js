import api from './api';

export const registrarUsuario = async (userData) => {
  const response = await api.post('/usuarios', userData);
  return response.data;
};

// Enviar un correo de prueba con Resend (solo admin general).
// Sin botón en la UI por ahora: la prueba se hace por curl a
// POST /api/admin/test-email con { email }.
export const enviarCorreoPrueba = async (email) => {
  const response = await api.post('/admin/test-email', { email });
  return response.data;
};

export const obtenerInstituciones = async () => {
  try {
    const response = await api.get('/instituciones');
    // Validar que la respuesta sea un arreglo, si no, retornar array vacío
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Error obteniendo instituciones:", err);
    return [];
  }
};

export const registrarInstitucion = async (institucionData) => {
  const response = await api.post('/instituciones', institucionData);
  return response.data;
};

export const obtenerUsuarios = async () => {
  try {
    const response = await api.get('/usuarios');
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Error obteniendo usuarios:", err);
    return [];
  }
};

export const eliminarUsuarioService = async (id) => {
  const response = await api.delete(`/usuarios/${id}`);
  return response.data;
};

// Dar de baja (estado=false) o reactivar (estado=true) un usuario.
export const cambiarEstadoUsuario = async (id, estado) => {
  const response = await api.patch(`/usuarios/${id}/estado`, { estado });
  return response.data;
};

export const obtenerTiposInstitucion = async () => {
  try {
    const response = await api.get('/catalogos/tipos-institucion');
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Error obteniendo tipos de institución:", err);
    return [];
  }
};

export const obtenerColonias = async () => {
  try {
    const response = await api.get('/catalogos/colonias');
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Error obteniendo colonias:", err);
    return [];
  }
};

export const obtenerRoles = async () => {
  try {
    const response = await api.get('/catalogos/roles');
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Error obteniendo roles:", err);
    return [];
  }
};
