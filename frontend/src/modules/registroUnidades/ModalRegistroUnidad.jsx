import React, { useState, useEffect } from 'react';
import './ModalRegistroUnidad.css';
import ModalAviso from '../../components/common/ModalAviso';
import { registrarUnidad } from '../../services/unidadesService';
import { obtenerHemocomponentes, obtenerTiposSangre } from '../../services/catalogosService';

// Catálogo de hemocomponentes con su vigencia y volumen por defecto.
// Las CLAVES son solo la referencia para vigencia/volumen: el select de
// hemocomponentes se llena con el catálogo real de la BD y la búsqueda
// aquí es NORMALIZADA (minúsculas, sin acentos), con defaults si el
// nombre de la BD no está en este mapa.
const HEMOCOMPONENTES_CATALOGO = {
  'Concentrado eritrocitario': { vigenciaDias: 42, volumenDefault: '300 ml' },
  'Sangre total': { vigenciaDias: 35, volumenDefault: '450 ml' },
  'Plaquetas': { vigenciaDias: 5, volumenDefault: '250 ml' },
  'Plasma fresco congelado': { vigenciaDias: 365, volumenDefault: '200 ml' },
  'Crioprecipitado': { vigenciaDias: 365, volumenDefault: '150 ml' },
};

// Normaliza un nombre para compararlo sin depender de acentos,
// mayúsculas ni espacios de más ("Plasma Fresco" == "plasma fresco").
const normalizar = (s) => (s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .trim()
  .replace(/\s+/g, ' ');

// Busca vigencia/volumen para el nombre que venga de la BD. Si no está
// en el mapa, defaults (35 días / 450 ml): nunca se rompe el flujo por
// un nombre de catálogo distinto al esperado.
const buscarConfigHemo = (nombre) => {
  const n = normalizar(nombre);
  if (!n) return null;
  for (const [clave, cfg] of Object.entries(HEMOCOMPONENTES_CATALOGO)) {
    if (normalizar(clave) === n) return cfg;
  }
  for (const [clave, cfg] of Object.entries(HEMOCOMPONENTES_CATALOGO)) {
    const k = normalizar(clave);
    if (k.includes(n) || n.includes(k)) return cfg;
  }
  if (n.includes('eritroc')) return HEMOCOMPONENTES_CATALOGO['Concentrado eritrocitario'];
  if (n.includes('globular')) return HEMOCOMPONENTES_CATALOGO['Concentrado eritrocitario'];
  if (n.includes('plaquet')) return HEMOCOMPONENTES_CATALOGO['Plaquetas'];
  if (n.includes('plasma')) return HEMOCOMPONENTES_CATALOGO['Plasma fresco congelado'];
  if (n.includes('sangre')) return HEMOCOMPONENTES_CATALOGO['Sangre total'];
  if (n.includes('crioprecip')) return HEMOCOMPONENTES_CATALOGO['Crioprecipitado'];
  return null;
};

const configHemo = (nombre) => buscarConfigHemo(nombre) || { vigenciaDias: 35, volumenDefault: '450 ml' };

// Fecha de hoy en formato YYYY-MM-DD (la fecha de extracción por defecto
// ya no es una fecha fija del pasado).
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const sumarDiasISO = (iso, dias) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ModalRegistroUnidad({ isOpen, onClose, onSaveSuccess, usuario }) {
  // 1. Estados locales del formulario
  // La institución es la de la sesión; si el usuario no tiene, se muestra
  // "Sin institución" (nunca se inventa una por defecto).
  const institucionDefecto = usuario?.institucion || 'Sin institución';
  const [tipoSangre, setTipoSangre] = useState('');
  const [hemocomponente, setHemocomponente] = useState('');
  const [volumen, setVolumen] = useState('300 ml');
  const [vigenciaDias, setVigenciaDias] = useState(42);
  const [fechaExtraccion, setFechaExtraccion] = useState(hoyISO());
  const [fechaCaducidad, setFechaCaducidad] = useState(() => sumarDiasISO(hoyISO(), 42));
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  // Aviso sencillo (modal) en lugar de alert() del navegador.
  const [aviso, setAviso] = useState(null);

  // Catálogos reales de la BD. Sin lista hardcodeada: si el catálogo
  // falla o viene vacío, se muestra el error y no se puede registrar.
  const [hemos, setHemos] = useState([]);
  const [tiposSangre, setTiposSangre] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState('');

  // Al abrir el modal, las fechas vuelven a hoy (con su vigencia) y se
  // limpia el mensaje de éxito anterior.
  useEffect(() => {
    if (isOpen) {
      const hoy = hoyISO();
      setFechaExtraccion(hoy);
      setFechaCaducidad(sumarDiasISO(hoy, vigenciaDias));
      setMensajeExito('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cargar los catálogos reales al abrir el modal.
  useEffect(() => {
    if (!isOpen) return;
    let cancelado = false;
    setCargandoCatalogos(true);
    setErrorCatalogo('');
    Promise.all([obtenerHemocomponentes(), obtenerTiposSangre()])
      .then(([h, t]) => {
        if (cancelado) return;
        const nombresH = h.map((x) => x.nombre).filter(Boolean);
        const nombresT = t.map((x) => x.nombre).filter(Boolean);
        if (nombresH.length === 0 || nombresT.length === 0) {
          setErrorCatalogo('No se pudo cargar el catálogo de hemocomponentes o de tipos de sangre.');
        }
        setHemos(nombresH);
        setTiposSangre(nombresT);
      })
      .catch(() => {
        if (!cancelado) setErrorCatalogo('No se pudo cargar el catálogo de hemocomponentes. Revisa tu conexión e inténtalo de nuevo.');
      })
      .finally(() => {
        if (!cancelado) setCargandoCatalogos(false);
      });
    return () => { cancelado = true; };
  }, [isOpen]);

  // Si la selección actual no está en el catálogo cargado, se ajusta al
  // primer valor válido (con su vigencia y volumen correspondientes).
  useEffect(() => {
    if (cargandoCatalogos || errorCatalogo || hemos.length === 0) return;
    if (!hemos.includes(hemocomponente)) {
      handleCambioHemocomponente(hemos[0]);
    }
    if (tiposSangre.length > 0 && !tiposSangre.includes(tipoSangre)) {
      setTipoSangre(tiposSangre[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hemos, tiposSangre, cargandoCatalogos, errorCatalogo]);

  // Actualizar vigencia y volumen sugerido al cambiar el hemocomponente
  const handleCambioHemocomponente = (nuevoHemo) => {
    setHemocomponente(nuevoHemo);
    const config = configHemo(nuevoHemo);
    setVigenciaDias(config.vigenciaDias);
    setVolumen(config.volumenDefault);

    // Recalcular fecha de caducidad si hay fecha de extracción válida
    if (fechaExtraccion) {
      const fecha = new Date(fechaExtraccion);
      if (!isNaN(fecha.getTime())) {
        fecha.setDate(fecha.getDate() + config.vigenciaDias);
        const yyyy = fecha.getFullYear();
        const mm = String(fecha.getMonth() + 1).padStart(2, '0');
        const dd = String(fecha.getDate()).padStart(2, '0');
        setFechaCaducidad(`${yyyy}-${mm}-${dd}`);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e, guardarOtro = false) => {
    e.preventDefault();
    // Sin institución no se puede registrar: el backend lo rechazaría,
    // pero se avisa antes de intentar.
    if (!usuario?.institucion_id && usuario?.rol_id !== 1) {
      setAviso({ titulo: 'Sin institución', mensaje: 'Tu usuario no tiene institución asignada. Pide al administrador general que te asigne una institución.' });
      return;
    }
    setCargando(true);
    setMensajeExito('');

    // El código de unidad lo genera el servidor: no se manda codigo
    // y la institución es la de la sesión. El código no se muestra
    // en el mensaje de éxito.
    const nuevaUnidad = {
      institucion_id: usuario?.institucion_id,
      tipoSangre,
      hemocomponente,
      volumen,
      vigenciaDias,
      fechaExtraccion,
      fechaCaducidad,
      estado: 'Disponible',
    };

    try {
      const resultado = await registrarUnidad(nuevaUnidad);
      // El código asignado por el servidor no se menciona: solo se
      // confirma que la unidad quedó registrada.
      setMensajeExito('Unidad registrada con éxito.');

      if (onSaveSuccess) {
        onSaveSuccess(resultado);
      }

      if (guardarOtro) {
        // Se prepara el formulario para otra unidad; el modal sigue abierto
        // con el mensaje de éxito visible.
        const primerHemo = hemos[0] || hemocomponente;
        const cfg = configHemo(primerHemo);
        setTipoSangre(tiposSangre.includes('O+') ? 'O+' : (tiposSangre[0] || tipoSangre));
        setHemocomponente(primerHemo);
        setVolumen(cfg.volumenDefault);
        setVigenciaDias(cfg.vigenciaDias);
        const hoy = hoyISO();
        setFechaExtraccion(hoy);
        setFechaCaducidad(sumarDiasISO(hoy, cfg.vigenciaDias));
      } else {
        // Se deja ver el mensaje de éxito un momento y luego se cierra.
        setTimeout(() => { onClose(); }, 1200);
      }
    } catch (error) {
      console.error(error);
      // Se muestra el motivo real del backend (p. ej. "Hemocomponente no
      // válido: ...") en vez de un mensaje genérico.
      setAviso({ titulo: 'Error', mensaje: String(error?.response?.data || 'Hubo un error al registrar la unidad en la base de datos.') });
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
    <div className="mreg-u-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mreg-u-card" onClick={(e) => e.stopPropagation()}>
        <header className="mreg-u-header">
          <div className="mreg-u-title-group">
            <h2>Registrar unidad</h2>
            <p>Ingresa los datos de la unidad de hemocomponente que se agregará al inventario</p>
          </div>

          <button
            type="button"
            className="mreg-u-close-btn"
            onClick={onClose}
            title="Cerrar ventana"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        {/* Formulario */}
        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div className="mreg-u-body">
            <div className="mreg-u-row-2col">
              {/* Institución */}
              <div className="mreg-u-field-group">
                <label className="mreg-u-label">
                  <span>Institución</span>
                  <span className="mreg-u-badge-tag">Automático</span>
                </label>
                <div className="mreg-u-input-wrapper mreg-u-readonly-box">
                  <span className="mreg-u-input-icon-left">
                    <img src="/assets/iconos_registroU/edificio.png" alt="" />
                  </span>
                  <input
                    type="text"
                    className="mreg-u-input mreg-u-input-readonly"
                    value={institucionDefecto}
                    readOnly
                  />
                  <span className="mreg-u-input-icon-right">
                    <img src="/assets/iconos_gestionU/cerrar.png" alt="" />
                  </span>
                </div>
              </div>

              {/* Estado Inicial */}
              <div className="mreg-u-field-group">
                <label className="mreg-u-label">
                  <span>Estado inicial</span>
                  <span className="mreg-u-badge-tag">Automático</span>
                </label>
                <div className="mreg-u-input-wrapper mreg-u-readonly-box">
                  <span className="mreg-u-input-icon-left">
                    <span className="mreg-u-status-dot-green"></span>
                  </span>
                  <input
                    type="text"
                    className="mreg-u-input mreg-u-input-readonly"
                    value="Disponible"
                    readOnly
                  />
                  <span className="mreg-u-input-icon-right">
                    <img src="/assets/iconos_gestionU/cerrar.png" alt="" />
                  </span>
                </div>
              </div>
            </div>

            {/* Código de unidad: lo asigna el servidor al guardar */}
            <div className="mreg-u-field-group">
              <label className="mreg-u-label">
                <span>Código de unidad</span>
                <span className="mreg-u-badge-tag">Automático</span>
              </label>
              <div className="mreg-u-input-wrapper mreg-u-readonly-box">
                <input
                  type="text"
                  className="mreg-u-input mreg-u-input-readonly"
                  value="Se asigna automáticamente al guardar"
                  readOnly
                />
                <span className="mreg-u-input-icon-right">
                  <img src="/assets/iconos_gestionU/cerrar.png" alt="" />
                </span>
              </div>
            </div>

            {/* Mensaje de éxito (sin mencionar el código asignado) */}
            {mensajeExito && (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontWeight: 600 }}>
                ✓ {mensajeExito}
              </div>
            )}

            {/* Aviso cuando no se pudo cargar el catálogo de la BD */}
            {errorCatalogo && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                <strong>No se pudo cargar el catálogo de hemocomponentes.</strong> {errorCatalogo}
              </div>
            )}

            {/* Tipo sanguíneo (catálogo real de la BD) */}
            <div className="mreg-u-field-group">
              <label className="mreg-u-label">Tipo sanguíneo</label>
              {cargandoCatalogos ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Cargando catálogo…</p>
              ) : (
                <div className="mreg-u-blood-grid">
                  {tiposSangre.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      className={`mreg-u-blood-btn ${tipoSangre === tipo ? 'active' : ''}`}
                      onClick={() => setTipoSangre(tipo)}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hemocomponente, Volumen y Vigencia */}
            <div className="mreg-u-row-3col">
              <div className="mreg-u-field-group">
                <label className="mreg-u-label">Hemocomponente</label>
                <select
                  className="mreg-u-select"
                  value={hemocomponente}
                  onChange={(e) => handleCambioHemocomponente(e.target.value)}
                  disabled={cargandoCatalogos || !!errorCatalogo}
                >
                  {cargandoCatalogos ? (
                    <option value={hemocomponente}>Cargando catálogo…</option>
                  ) : (
                    hemos.map((hemo) => (
                      <option key={hemo} value={hemo}>
                        {hemo}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="mreg-u-field-group">
                <label className="mreg-u-label">Volumen</label>
                <input
                  type="text"
                  className="mreg-u-input"
                  placeholder="300 ml"
                  value={volumen}
                  onChange={(e) => setVolumen(e.target.value)}
                  required
                />
              </div>

              <div className="mreg-u-field-group">
                <label className="mreg-u-label">Vigencia</label>
                <input
                  type="text"
                  className="mreg-u-input mreg-u-input-readonly"
                  value={`${vigenciaDias} días`}
                  readOnly
                />
              </div>
            </div>

            {/* Fechas de extracción y caducidad */}
            <div className="mreg-u-row-2col">
              <div className="mreg-u-field-group">
                <label className="mreg-u-label">Fecha de extracción</label>
                <div className="mreg-u-input-wrapper">
                  <input
                    type="date"
                    className="mreg-u-input"
                    value={fechaExtraccion}
                    onChange={(e) => setFechaExtraccion(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mreg-u-field-group">
                <label className="mreg-u-label">
                  <span>Fecha de caducidad</span>
                  <span className="mreg-u-badge-tag">Calculada</span>
                </label>
                <div className="mreg-u-input-wrapper">
                  <input
                    type="date"
                    className="mreg-u-input"
                    value={fechaCaducidad}
                    onChange={(e) => setFechaCaducidad(e.target.value)}
                    required
                  />
                </div>
                <span className="mreg-u-helper-text">Calculada con la vigencia; puedes ajustarla</span>
              </div>
            </div>
          </div>

          <footer className="mreg-u-footer">
            <button type="button" className="btn-mreg-cancel" onClick={onClose} disabled={cargando}>
              Cancelar
            </button>

            <button
              type="button"
              className="btn-mreg-secondary"
              onClick={(e) => handleSubmit(e, true)}
              disabled={cargando || cargandoCatalogos || !!errorCatalogo}
            >
              <span className="mreg-action-icon">
                <img src="/assets/iconos_gestionU/agregar.png" alt="" />
              </span>
              <span>{cargando ? 'Guardando...' : 'Guardar y agregar otra'}</span>
            </button>

            <button type="submit" className="btn-mreg-primary" disabled={cargando || cargandoCatalogos || !!errorCatalogo}>
              <span className="mreg-action-icon">
                <img src="/assets/iconos_gestionU/aceptar.png" alt="" />
              </span>
              <span>{cargando ? 'Registrando...' : 'Registrar unidad'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>

      {/* Aviso sencillo (modal) en lugar de alert() */}
      <ModalAviso
        isOpen={!!aviso}
        titulo={aviso?.titulo || 'Aviso'}
        mensaje={aviso?.mensaje}
        onClose={() => setAviso(null)}
      />
    </>
  );
}