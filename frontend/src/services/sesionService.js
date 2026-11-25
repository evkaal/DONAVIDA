
// Sesión del usuario: dónde se guarda el token y el usuario logueado.
//
// Regla (punto 1a del QA): con "Mantener sesión iniciada" marcado, la
// sesión vive en localStorage y sobrevive a recargar y a cerrar el
// navegador; sin marcarla, vive en sessionStorage: sobrevive a recargar
// la página, pero se borra al cerrar el navegador.
//
// Antes el token siempre se guardaba en localStorage (la casilla no se
// usaba) y App.jsx nunca restauraba la sesión al montar, así que al
// recargar siempre aparecía el Login aunque hubiera token guardado.
//
// Este módulo no importa a ningún otro servicio: api.js, authService.js
// y los módulos lo usan directamente, y así se evita un import circular
// (api.js lo necesita en su interceptor y authService lo necesita en
// login/logout).
const CLAVES_SESION = ['token', 'usuario', 'rol_id', 'institucion_id'];

// Guarda la sesión (respuesta del login) en el almacén que corresponda.
export const guardarSesion = (data, recordar) => {
  if (!data) return;
  const destino = recordar ? localStorage : sessionStorage;
  const otro = recordar ? sessionStorage : localStorage;
  // Nunca dejar la sesión en los dos sitios a la vez.
  CLAVES_SESION.forEach((clave) => otro.removeItem(clave));
  if (data.token) destino.setItem('token', data.token);
  if (data.nombre || data.email) {
    destino.setItem('usuario', JSON.stringify({
      nombre: data.nombre ?? null,
      email: data.email ?? null,
      rol_id: data.rol_id ?? null,
      institucion_id: data.institucion_id ?? null,
      institucion: data.institucion ?? null,
    }));
  }
  if (data.rol_id !== undefined && data.rol_id !== null) destino.setItem('rol_id', String(data.rol_id));
  if (data.institucion_id !== undefined && data.institucion_id !== null) destino.setItem('institucion_id', String(data.institucion_id));
};

// Token de la sesión, esté en localStorage o en sessionStorage.
export const obtenerToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

// Usuario de la sesión (objeto con nombre/email/rol_id/institucion_id),
// o {} si no hay sesión.
export const obtenerUsuarioSesion = () => {
  try {
    return JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}');
  } catch {
    return {};
  }
};

// ¿Hay sesión guardada (token en alguno de los dos almacenes)?
export const haySesion = () => Boolean(obtenerToken());

// Borra la sesión de los dos almacenes (cerrar sesión).
export const limpiarSesion = () => {
  CLAVES_SESION.forEach((clave) => {
    localStorage.removeItem(clave);
    sessionStorage.removeItem(clave);
  });
};
