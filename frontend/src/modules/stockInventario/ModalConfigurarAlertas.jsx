import React, { useState } from 'react';
import './ModalConfigurarAlertas.css';

// Lista de hemocomponentes base
const HEMOCOMPONENTES = [
  { key: 'sangreTotal', label: 'Sangre total', desc: '450 ml · 35 d' },
  { key: 'concEritrocitario', label: 'Conc. eritrocitario', desc: '300 ml · 42 d' },
  { key: 'plasmaFresco', label: 'Plasma fresco', desc: '250 ml · 365 d' },
  { key: 'plaquetas', label: 'Plaquetas', desc: '250 ml · 5 d' },
];

// Tipos sanguíneos del sistema
const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Valores base iniciales en blanco (se cargan desde GET /api/stock/umbrales)
const VALORES_BASE_DEFAULT = {
  sangreTotal: 0,
  concEritrocitario: 0,
  plasmaFresco: 0,
  plaquetas: 0,
};

export default function ModalConfigurarAlertas({
  isOpen,
  onClose,
  hospital = 'Hospital General',
  usuario,
  onGuardar,
}) {
  const [minimosGenerales, setMinimosGenerales] = useState({ ...VALORES_BASE_DEFAULT });

  const [personalizados, setPersonalizados] = useState({});

  // Estado para colapsar/expandir el desglose por tipo de sangre
  const [acordeonAbierto, setAcordeonAbierto] = useState(true);

  if (!isOpen) return null;

  // Manejador del stepper de mínimos generales
  const handleCambiarGeneral = (key, delta) => {
    setMinimosGenerales((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta),
    }));
  };

  // Manejador de cambio manual en celda por tipo de sangre
  const handleCambioCeldaTipo = (tipo, hemoKey, valorRaw) => {
    if (valorRaw === '') {
      // Si se vacía el campo, se elimina la personalización y hereda el general
      setPersonalizados((prev) => {
        const copiaTipo = { ...(prev[tipo] || {}) };
        delete copiaTipo[hemoKey];
        if (Object.keys(copiaTipo).length === 0) {
          const copiaTotal = { ...prev };
          delete copiaTotal[tipo];
          return copiaTotal;
        }
        return { ...prev, [tipo]: copiaTipo };
      });
      return;
    }

    const valorNum = parseInt(valorRaw, 10);
    if (isNaN(valorNum) || valorNum < 0) return;

    setPersonalizados((prev) => ({
      ...prev,
      [tipo]: {
        ...(prev[tipo] || {}),
        [hemoKey]: valorNum,
      },
    }));
  };

  // Restablecer una fila de tipo de sangre completa
  const handleRestablecerTipo = (tipo) => {
    setPersonalizados((prev) => {
      const nuevo = { ...prev };
      delete nuevo[tipo];
      return nuevo;
    });
  };

  // Restablecer todos los valores al estado por defecto
  const handleRestablecerTodo = () => {
    setMinimosGenerales({ ...VALORES_BASE_DEFAULT });
    setPersonalizados({});
  };

  // Guardar configuración
  const handleGuardar = (e) => {
    e.preventDefault();
    const configuracion = {
      hospital,
      minimosGenerales,
      personalizados,
      fechaActualizacion: new Date().toISOString(),
      actualizadoPor: usuario?.nombre || 'Usuario',
    };

    console.log('[BACKEND] Guardar umbrales de stock:', configuracion);

    if (onGuardar) {
      onGuardar(configuracion);
    }
    onClose();
  };

  // Contar cuántos tipos tienen al menos un valor personalizado
  const cantidadTiposPersonalizados = Object.keys(personalizados).filter(
    (tipo) => Object.keys(personalizados[tipo] || {}).length > 0
  ).length;

  return (
    <div className="mstk-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mstk-card" onClick={(e) => e.stopPropagation()}>
        {/* ENCABEZADO */}
        <header className="mstk-header">
          <div className="mstk-header-info">
            <h2 className="mstk-title">Configurar alertas de stock</h2>
            <p className="mstk-subtitle">
              Define cuántas unidades se consideran poco stock. Al bajar de ese mínimo se genera
              una alerta y se notifica a tu institución.
            </p>
          </div>

          <button
            type="button"
            className="mstk-close-btn"
            onClick={onClose}
            title="Cerrar modal"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        {/* CUERPO DEL MODAL */}
        <div className="mstk-body">
          {/* IDENTIFICADOR DE INSTITUCIÓN */}
          <div className="mstk-hospital-badge-row">
            <div className="mstk-hospital-pill">
              <span className="mstk-hospital-icon">
                <img src="/src/assets/iconos_registroU/edificio.png" alt="Institución" />
              </span>
              <span className="mstk-hospital-label">Institución:</span>
              <span className="mstk-hospital-name">{hospital}</span>
            </div>
          </div>

          {/*MÍNIMO GENERAL POR HEMOCOMPONENTE */}
          <section className="mstk-section">
            <div className="mstk-section-header">
              <h3 className="mstk-section-title">Mínimo general por hemocomponente</h3>
              <p className="mstk-section-sub">
                Aplica a todos los tipos de sangre, salvo que lo ajustes abajo
              </p>
            </div>

            <div className="mstk-general-cards-grid">
              {HEMOCOMPONENTES.map((hemo) => (
                <div key={hemo.key} className="mstk-hemo-card">
                  <div className="mstk-hemo-card-header">
                    <span className="mstk-hemo-name">{hemo.label}</span>
                    <span className="mstk-hemo-desc">{hemo.desc}</span>
                  </div>

                  <div className="mstk-stepper-box">
                    <button
                      type="button"
                      className="mstk-stepper-btn"
                      onClick={() => handleCambiarGeneral(hemo.key, -1)}
                      title="Disminuir"
                      disabled={minimosGenerales[hemo.key] <= 0}
                    >
                      −
                    </button>
                    <span className="mstk-stepper-value">{minimosGenerales[hemo.key]}</span>
                    <button
                      type="button"
                      className="mstk-stepper-btn"
                      onClick={() => handleCambiarGeneral(hemo.key, 1)}
                      title="Aumentar"
                    >
                      +
                    </button>
                  </div>

                  <span className="mstk-hemo-unit">unidades</span>
                </div>
              ))}
            </div>
          </section>

          {/*AJUSTAR POR TIPO DE SANGRE (ACORDEÓN) */}
          <section className="mstk-section">
            <div
              className="mstk-accordion-toggle"
              onClick={() => setAcordeonAbierto((prev) => !prev)}
              role="button"
              tabIndex={0}
            >
              <div className="mstk-accordion-header-left">
                <div className="mstk-accordion-title-row">
                  <h3 className="mstk-section-title">Ajustar por tipo de sangre</h3>
                  {cantidadTiposPersonalizados > 0 && (
                    <span className="mstk-pill-custom">
                      {cantidadTiposPersonalizados} tipos personalizados
                    </span>
                  )}
                </div>
                <p className="mstk-section-sub">
                  Opcional · los tipos sin valor propio usan el mínimo general
                </p>
              </div>

              <span className={`mstk-chevron ${acordeonAbierto ? 'open' : ''}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </span>
            </div>

            {acordeonAbierto && (
              <div className="mstk-matrix-container">
                <table className="mstk-matrix-table">
                  <thead>
                    <tr>
                      <th className="th-tipo">TIPO</th>
                      <th>SANGRE TOTAL</th>
                      <th>CONC. ERIT.</th>
                      <th>PLASMA</th>
                      <th>PLAQUETAS</th>
                      <th className="th-action"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIPOS_SANGRE.map((tipo) => {
                      const tienePersonalizado =
                        personalizados[tipo] && Object.keys(personalizados[tipo]).length > 0;

                      return (
                        <tr key={tipo} className={tienePersonalizado ? 'row-customized' : ''}>
                          {/* Tipo sanguíneo */}
                          <td className="td-tipo">
                            <span className="mstk-blood-badge">{tipo}</span>
                          </td>

                          {/* 4 Hemocomponentes */}
                          {HEMOCOMPONENTES.map((hemo) => {
                            const esPropio = personalizados[tipo]?.[hemo.key] !== undefined;
                            const valorCelda = esPropio
                              ? personalizados[tipo][hemo.key]
                              : minimosGenerales[hemo.key];

                            return (
                              <td key={hemo.key} className="td-cell">
                                <input
                                  type="number"
                                  min="0"
                                  className={`mstk-input-cell ${esPropio ? 'is-custom' : 'is-inherited'}`}
                                  value={valorCelda}
                                  onChange={(e) =>
                                    handleCambioCeldaTipo(tipo, hemo.key, e.target.value)
                                  }
                                  title={
                                    esPropio
                                      ? 'Valor personalizado para este tipo'
                                      : 'Hereda el mínimo general'
                                  }
                                />
                              </td>
                            );
                          })}

                          {/* Acción restablecer para la fila */}
                          <td className="td-action">
                            {tienePersonalizado && (
                              <button
                                type="button"
                                className="mstk-btn-reset-row"
                                onClick={() => handleRestablecerTipo(tipo)}
                                title="Volver a los mínimos generales"
                              >
                                ↺ Restablecer
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* LEYENDA */}
                <div className="mstk-legend-row">
                  <div className="mstk-legend-item">
                    <span className="legend-dot dot-inherited"></span>
                    <span>Hereda el mínimo general</span>
                  </div>
                  <div className="mstk-legend-item">
                    <span className="legend-dot dot-custom"></span>
                    <span>Valor personalizado</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* BANNER INFORMATIVO DE COMBINACIONES EN ALERTA */}
          <div className="mstk-alert-banner">
            <div className="mstk-alert-banner-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="mstk-alert-banner-content">
              <span className="mstk-alert-banner-title">
                0 combinaciones quedarían en alerta
              </span>
              <span className="mstk-alert-banner-desc">
                Con el stock actual · Conectar con cálculo de alertas del backend
              </span>
            </div>
          </div>
        </div>

        {/* PIE DEL MODAL (ACCIONES) */}
        <footer className="mstk-footer">
          <div className="mstk-footer-left">
            <button
              type="button"
              className="mstk-btn-reset-all"
              onClick={handleRestablecerTodo}
            >
              Restablecer valores
            </button>
          </div>

          <div className="mstk-footer-right">
            <button type="button" className="mstk-btn-cancel" onClick={onClose}>
              Cancelar
            </button>

            <button type="button" className="mstk-btn-save" onClick={handleGuardar}>
              <span className="mstk-btn-icon-check">✓</span>
              <span>Guardar cambios</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

