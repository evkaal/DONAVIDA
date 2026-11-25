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

export const eliminarUuarioService = async (id) => {
  const response = await api.delete(`/usuarios/${id}`);
  return response.data;
};

// Eliminar una institución (solo admin general, rol_id 1). El backend
// responde 409 con el detalle si la institución tiene dependencias
// (usuarios, unidades o solicitudes) y no se puede borrar.
export const eliminarInstitucion = async (id) => {
  const response = await api.delete(`/instituciones/${id}`);
  return response.data;
};

// Nombres legibles para los códigos internos de rol que devuelve el
// backend (roles.nombre: admin_general, admin_institucion,
// personal_medico). Un código desconocido se embellece ("mi_codigo" ->
// "Mi codigo") en vez de mostrarse tal cual. Incluye los roles de la
// app móvil por si ya existen en la BD.
const NOMBRES_ROL = {
  admin_general: "Administrador general",
  admin_institucion: "Administrador de institución",
  personal_medico: "Personal médico",
  donante: "Donante",
  admin_movil: "Administrador de la app móvil",
};

export const nombreRolLegible = (codigo) => {
  if (!codigo) return "Sin rol";
  if (NOMBRES_ROL[codigo]) return NOMBRES_ROL[codigo];
  const texto = String(codigo).replace(/_/g, " ").trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "Sin rol";
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
