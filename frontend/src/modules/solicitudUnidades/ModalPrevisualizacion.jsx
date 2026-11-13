import React from 'react';
import './ModalPrevisualizacion.css';

export default function ModalPrevisualizacion({
  isOpen,
  onClose,
  solicitud,
  onUpdateUnidad,
  onAgregarUnidad,
  onEliminarUnidad,
  onConfirmarEnvio
}) {
  if (!isOpen) return null;

  const {
    institucion,
    solicitante,
    prioridad,
    motivo,
    fechaFormateada,
    unidades = []
  } = solicitud;

  const totalUnidades = unidades.reduce((acc, u) => acc + (u.cantidad || 0), 0);

  return (
    <div className="mprev-overlay" onClick={onClose}>
      <div className="mprev-container" onClick={(e) => e.stopPropagation()}>
        <div className="mprev-header">
          <div className="mprev-header-title-group">
            <h2 className="mprev-title">Previsualización de solicitud</h2>
            <p className="mprev-subtitle">
              Revisa la información y ajusta las unidades antes de enviarla a la red de bancos de sangre
            </p>
          </div>
          <button type="button" className="mprev-btn-close" onClick={onClose} title="Cerrar modal">
            ✕
          </button>
        </div>

        {/* CUERPO*/}
        <div className="mprev-body">
          <section className="mprev-section">
            <div className="mprev-section-header">
              <h3 className="mprev-section-title">Datos generales</h3>
              <span className="mprev-section-subtitle">Solo lectura · tal como se enviará</span>
            </div>

            <div className="mprev-meta-grid">
              <div className="mprev-meta-item">
                <span className="mprev-meta-label">Institución solicitante</span>
                <span className="mprev-meta-val">{institucion || 'Hospital General'}</span>
              </div>
              <div className="mprev-meta-item">
                <span className="mprev-meta-label">Solicitante</span>
                <span className="mprev-meta-val">{solicitante || 'Elena Ruiz'}</span>
              </div>
              <div className="mprev-meta-item">
                <span className="mprev-meta-label">ID de solicitud</span>
                <span className="mprev-meta-val text-muted">Se asigna al enviar</span>
              </div>

              <div className="mprev-meta-item">
                <span className="mprev-meta-label">Prioridad</span>
                <div>
                  {prioridad === 'critica' && (
                    <span className="mprev-badge badge-critica">
                      <span className="mprev-dot dot-critica"></span>
                      Crítica
                    </span>
                  )}
                  {prioridad === 'urgente' && (
                    <span className="mprev-badge badge-urgente">
                      <span className="mprev-dot dot-urgente"></span>
                      Urgente
                    </span>
                  )}
                  {prioridad === 'normal' && (
                    <span className="mprev-badge badge-normal">
                      <span className="mprev-dot dot-normal"></span>
                      Normal
                    </span>
                  )}
                </div>
              </div>

              <div className="mprev-meta-item">
                <span className="mprev-meta-label">Estado inicial</span>
                <div>
                  <span className="mprev-badge badge-pendiente">
                    <span className="mprev-dot dot-pendiente"></span>
                    Pendiente
                  </span>
                </div>
              </div>

              <div className="mprev-meta-item">
                <span className="mprev-meta-label">Fecha de solicitud</span>
                <span className="mprev-meta-val">{fechaFormateada}</span>
              </div>
            </div>

            {/* Motivo de Solicitud */}
            <div className="mprev-motivo-box">
              <span className="mprev-motivo-label">Motivo de la solicitud</span>
              <p className="mprev-motivo-text">
                {motivo.trim() !== '' ? motivo : 'Sin motivo especificado por el solicitante.'}
              </p>
            </div>
          </section>

          {/* UNIDADES SOLICITADAS */}
          <section className="mprev-section">
            <div className="mprev-units-header-row">
              <div className="mprev-section-header">
                <h3 className="mprev-section-title">Unidades solicitadas</h3>
                <span className="mprev-section-subtitle">Tipo de sangre, hemocomponente y cantidad por renglón</span>
              </div>
              <button
                type="button"
                className="mprev-btn-add-unit"
                onClick={onAgregarUnidad}
              >
                + Agregar unidad
              </button>
            </div>

            <div className="mprev-units-table-header">
              <span className="col-tipo">TIPO DE SANGRE</span>
              <span className="col-hemo">HEMOCOMPONENTE</span>
              <span className="col-cant">CANTIDAD</span>
              <span className="col-action"></span>
            </div>

            {/* Filas de unidades */}
            <div className="mprev-units-list">
              {unidades.length > 0 ? (
                unidades.map((u) => (
                  <div key={u.id} className="mprev-unit-row">
                    {/* Selector de Tipo */}
                    <div className="mprev-select-wrapper col-tipo">
                      <select
                        className="mprev-select"
                        value={u.tipo}
                        onChange={(e) => onUpdateUnidad(u.id, 'tipo', e.target.value)}
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>

                    {/* Selector de Hemocomponente */}
                    <div className="mprev-select-wrapper col-hemo">
                      <select
                        className="mprev-select"
                        value={u.hemocomponente}
                        onChange={(e) => onUpdateUnidad(u.id, 'hemocomponente', e.target.value)}
                      >
                        <option value="Concentrado eritrocitario">Concentrado eritrocitario</option>
                        <option value="Plaquetas">Plaquetas</option>
                        <option value="Plasma fresco">Plasma fresco</option>
                        <option value="Sangre total">Sangre total</option>
                        <option value="Crioprecipitado">Crioprecipitado</option>
                      </select>
                    </div>

                    {/* Stepper de Cantidad */}
                    <div className="mprev-stepper col-cant">
                      <button
                        type="button"
                        className="mprev-stepper-btn"
                        onClick={() => onUpdateUnidad(u.id, 'cantidad', Math.max(1, u.cantidad - 1))}
                        disabled={u.cantidad <= 1}
                      >
                        –
                      </button>
                      <span className="mprev-stepper-val">{u.cantidad}</span>
                      <button
                        type="button"
                        className="mprev-stepper-btn"
                        onClick={() => onUpdateUnidad(u.id, 'cantidad', u.cantidad + 1)}
                      >
                        +
                      </button>
                    </div>

                    {/* Botón para eliminar*/}
                    <button
                      type="button"
                      className="mprev-btn-delete-row"
                      onClick={() => onEliminarUnidad(u.id)}
                      title="Eliminar renglón"
                    >
                      {/* Cambiar icono de bote de basura*/}
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="mprev-units-empty">
                  <p>No has agregado unidades. Haz clic en <strong>"+ Agregar unidad"</strong> para ingresar al menos un requerimiento.</p>
                </div>
              )}
            </div>

            <div className="mprev-total-row">
              <span className="mprev-total-label">Total de unidades solicitadas</span>
              <span className="mprev-total-val">{totalUnidades}</span>
            </div>
          </section>
        </div>

        <div className="mprev-footer">
          <div className="mprev-footer-notice">
            {/* Cambiar icono de check*/}

            <span>Se registra como Pendiente y se alerta a los bancos de sangre</span>
          </div>

          <div className="mprev-footer-actions">
            <button type="button" className="mprev-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="mprev-btn-submit"
              onClick={onConfirmarEnvio}
              disabled={unidades.length === 0}
            >
              <span className='mprev-enviar-icon'>
                <img src="/src/assets/iconos_dash/avion-de-papel2.png" alt="" />
              </span>
              <span>Enviar solicitud</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

