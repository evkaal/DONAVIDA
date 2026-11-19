import api from './api';

// Los catálogos mandan: los formularios usan los nombres reales de la BD
// (GET /api/catalogos/...), nunca una lista hardcodeada.
// Estas funciones LANZAN el error si la petición falla, para que el
// componente muestre el fallo y deshabilite el envío en vez de usar
// una lista inventada como fallback silencioso.

// "Paquete globular" y "Concentrado eritrocitario" son EL MISMO producto
// (eritrocitos concentrados): la BD tiene ambas filas en
// tipos_hemocomponente (id 1 y 3) y hay unidades guardadas con el tipo 1,
// así que no se puede borrar ninguna fila. La fusión se hace AQUÍ, en la
// única fuente del catálogo: todo formulario y filtro que use
// obtenerHemocomponentes muestra UNA sola opción, "Concentrado
// eritrocitario". El resolver del backend ya mapea globular→concentrado,
// así que enviar ese nombre registra la unidad con el tipo correcto.
export const normalizarHemocomponente = (nombre) => {
  const n = String(nombre || '').trim().toLowerCase();
  if (n.includes('globular')) return 'Concentrado eritrocitario';
  return nombre;
};

export const obtenerHemocomponentes = async () => {
  const response = await api.get('/catalogos/hemocomponentes');
  const lista = Array.isArray(response.data) ? response.data : [];
  // Fusionar "Paquete globular" en "Concentrado eritrocitario" y quitar
  // duplicados por nombre normalizado (se conserva la primera aparición).
  const vistos = new Set();
  const fusionada = [];
  for (const item of lista) {
    const nombre = normalizarHemocomponente(item?.nombre);
    const clave = String(nombre || '').trim().toLowerCase();
    if (!clave || vistos.has(clave)) continue;
    vistos.add(clave);
    fusionada.push({ ...item, nombre });
  }
  return fusionada;
};

export const obtenerTiposSangre = async () => {
  const response = await api.get('/catalogos/tipos-sangre');
  return Array.isArray(response.data) ? response.data : [];
};
