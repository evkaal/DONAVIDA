import React, { useState } from 'react';
import './ModalRegistroUnidad.css';
import { registrarUnidad } from '../../services/authService'; // Asegúrate de ajustar esta ruta según tu estructura de carpetas

// Catálogo de hemocomponentes con su vigencia, volumen y su ID correspondiente en la BD
const HEMOCOMPONENTES_CATALOGO = {
  'Concentrado eritrocitario': { id: 1, vigenciaDias: 42, volumenDefault: '300 ml' },
  'Sangre total': { id: 2, vigenciaDias: 35, volumenDefault: '450 ml' },
  'Plaquetas': { id: 3, vigenciaDias: 5, volumenDefault: '250 ml' },
  'Plasma fresco congelado': { id: 4, vigenciaDias: 365, volumenDefault: '200 ml' },
  'Crioprecipitado': { id: 5, vigenciaDias: 365, volumenDefault: '150 ml' },
};

// Mapeo de tipos sanguíneos a su respectivo ID en la tabla tipos_sangre
const TIPOS_SANGRE_MAP = {
  'A+': 1, 'A-': 2, 'B+': 3, 'B-': 4, 
  'AB+': 5, 'AB-': 6, 'O+': 7, 'O-': 8
};

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ModalRegistroUnidad({ isOpen, onClose, onSaveSuccess, usuario }) {
  const institucionDefecto = usuario?.institucion || 'Hospital General';
  const [codigo, setCodigo] = useState('UN-2032');
  const [tipoSangre, setTipoSangre] = useState('O+');
  const [hemocomponente, setHemocomponente] = useState('Concentrado eritrocitario');
  const [volumen, setVolumen] = useState('300 ml');
  const [vigenciaDias, setVigenciaDias] = useState(42);
  const [fechaExtraccion, setFechaExtraccion] = useState('2026-10-21');
  const [fechaCaducidad, setFechaCaducidad] = useState('2026-12-02');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Actualizar vigencia, volumen y ID al cambiar el hemocomponente
  const handleCambioHemocomponente = (nuevoHemo) => {
    setHemocomponente(nuevoHemo);
    const config = HEMOCOMPONENTES_CATALOGO[nuevoHemo];
    if (config) {
      setVigenciaDias(config.vigenciaDias);
      setVolumen(config.volumenDefault);

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
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e, guardarOtro = false) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    // Mapear los valores visuales a los IDs que espera el backend y la base de datos
    const tipoSangreId = TIPOS_SANGRE_MAP[tipoSangre] || 1;
    const tipoHemocompConfig = HEMOCOMPONENTES_CATALOGO[hemocomponente];
    const tipoHemocomponenteId = tipoHemocompConfig ? tipoHemocompConfig.id : 1;

    const nuevaUnidadPayload = {
      codigo_unidad: codigo.trim(),
      tipo_sangre_id: Number(tipoSangreId),
      tipo_hemocomponente_id: Number(tipoHemocomponenteId),
      estado_id: 1,         // 1 = Disponible en estados_hemocomponente
      institucion_id: 1,    // 1 = Hospital General en instituciones
      fecha_extraccion: fechaExtraccion,
      fecha_caducidad: fechaCaducidad,
    };

    try {
      // Llamada real al endpoint de Go que creamos
      const responseData = await registrarUnidad(nuevaUnidadPayload);
      console.log('[BACKEND] Unidad guardada con éxito:', responseData);

      setCargando(false);

      if (onSaveSuccess) {
        onSaveSuccess({ ...nuevaUnidadPayload, id: responseData.id, estado: 'Disponible' });
      }

      if (guardarOtro) {
        // Limpiar y generar un siguiente código sugerido
        const match = codigo.match(/\d+/);
        const siguienteNumero = match ? parseInt(match[0], 10) + 1 : 2033;
        setCodigo(`UN-${siguienteNumero}`);
      } else {
        onClose();
      }
    } catch (err) {
      setCargando(false);
      setError('Hubo un error al registrar la unidad en el servidor.');
      console.error('Error al registrar unidad:', err);
    }
  };

  return (
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

        {error && <div style={{ color: 'red', padding: '0 24px', fontSize: '14px' }}>{error}</div>}

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
                    <img src="/src/assets/iconos_registroU/edificio.png" alt="" />
                  </span>
                  <input
                    type="text"
                    className="mreg-u-input mreg-u-input-readonly"
                    value={institucionDefecto}
                    readOnly
                  />
                  <span className="mreg-u-input-icon-right">
                    <img src="/src/assets/iconos_gestionU/cerrar.png" alt="" />
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
                    <img src="/src/assets/iconos_gestionU/cerrar.png" alt="" />
                  </span>
                </div>
              </div>
            </div>

            {/* Código de unidad */}
            <div className="mreg-u-field-group">
              <label htmlFor="codigo-unidad" className="mreg-u-label">
                Código de unidad
              </label>
              <input
                id="codigo-unidad"
                type="text"
                className="mreg-u-input"
                placeholder="Ej. UN-2032"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                maxLength={30}
                required
              />
              <span className="mreg-u-helper-text">Sugerido por el sistema · máximo 30 caracteres</span>
            </div>

            {/* Tipo sanguíneo */}
            <div className="mreg-u-field-group">
              <label className="mreg-u-label">Tipo sanguíneo</label>
              <div className="mreg-u-blood-grid">
                {TIPOS_SANGUINEOS.map((tipo) => (
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
            </div>

            {/* Hemocomponente, Volumen y Vigencia */}
            <div className="mreg-u-row-3col">
              <div className="mreg-u-field-group">
                <label className="mreg-u-label">Hemocomponente</label>
                <select
                  className="mreg-u-select"
                  value={hemocomponente}
                  onChange={(e) => handleCambioHemocomponente(e.target.value)}
                >
                  {Object.keys(HEMOCOMPONENTES_CATALOGO).map((hemo) => (
                    <option key={hemo} value={hemo}>
                      {hemo}
                    </option>
                  ))}
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
              disabled={cargando}
            >
              <span className="mreg-action-icon">
                <img src="/src/assets/iconos_gestionU/agregar.png" alt="" />
              </span>
              <span>{cargando ? 'Guardando...' : 'Guardar y agregar otra'}</span>
            </button>

            <button type="submit" className="btn-mreg-primary" disabled={cargando}>
              <span className="mreg-action-icon">
                <img src="/src/assets/iconos_gestionU/aceptar.png" alt="" />
              </span>
              <span>{cargando ? 'Guardando...' : 'Registrar unidad'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}