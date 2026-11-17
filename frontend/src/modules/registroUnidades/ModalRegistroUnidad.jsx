import React, { useState } from 'react';
import './ModalRegistroUnidad.css';
import { registrarUnidad, getUnidades } from '../../services/unidadesService';

// Catálogo de hemocomponentes con su vigencia y volumen por defecto
const HEMOCOMPONENTES_CATALOGO = {
  'Concentrado eritrocitario': { vigenciaDias: 42, volumenDefault: '300 ml' },
  'Sangre total': { vigenciaDias: 35, volumenDefault: '450 ml' },
  'Plaquetas': { vigenciaDias: 5, volumenDefault: '250 ml' },
  'Plasma fresco congelado': { vigenciaDias: 365, volumenDefault: '200 ml' },
  'Crioprecipitado': { vigenciaDias: 365, volumenDefault: '150 ml' },
};

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ModalRegistroUnidad({ isOpen, onClose, onSaveSuccess, usuario }) {
  // 1. Estados locales del formulario
  const institucionDefecto = usuario?.institucion || 'Hospital General';
  const [codigo, setCodigo] = useState('UN-2032');
  const [tipoSangre, setTipoSangre] = useState('O+');
  const [hemocomponente, setHemocomponente] = useState('Concentrado eritrocitario');
  const [volumen, setVolumen] = useState('300 ml');
  const [vigenciaDias, setVigenciaDias] = useState(42);
  const [fechaExtraccion, setFechaExtraccion] = useState('2026-10-21');
  const [fechaCaducidad, setFechaCaducidad] = useState('2026-12-02');
  const [cargando, setCargando] = useState(false);

  // Actualizar vigencia y volumen sugerido al cambiar el hemocomponente
  const handleCambioHemocomponente = (nuevoHemo) => {
    setHemocomponente(nuevoHemo);
    const config = HEMOCOMPONENTES_CATALOGO[nuevoHemo];
    if (config) {
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
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e, guardarOtro = false) => {
    e.preventDefault();
    setCargando(true);

    const nuevaUnidad = {
      codigo: codigo.trim(),
      institucion_id: usuario?.institucion_id || 1,
      institucion: institucionDefecto,
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

      if (onSaveSuccess) {
        onSaveSuccess(nuevaUnidad);
      }

      if (guardarOtro) {
        const match = codigo.match(/\d+/);
        const siguienteNumero = match ? parseInt(match[0], 10) + 1 : 2033;
        setCodigo(`UN-${siguienteNumero}`);
      } else {
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al registrar la unidad en la base de datos.");
    } finally {
      setCargando(false);
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
              <span>{cargando ? 'Registrando...' : 'Registrar unidad'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}