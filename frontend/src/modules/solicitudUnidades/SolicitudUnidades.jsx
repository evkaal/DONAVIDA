import React, { useState } from 'react';
import './SolicitudUnidades.css';
import { Sidebar, Navbar } from '../../components/layout';
import ModalPrevisualizacion from './ModalPrevisualizacion';

export default function SolicitudUnidades({ usuario, onCambiarModulo, onLogout }) {
  // Datos del solicitante tomados de la sesión
  const institucionSesion = usuario?.institucion || 'Hospital General';
  const solicitanteSesion = usuario?.nombre || 'Elena Ruiz';

  const [prioridad, setPrioridad] = useState('critica'); // 'critica' | 'urgente' | 'normal'
  const [motivo, setMotivo] = useState('');

  const [unidades, setUnidades] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fecha y hora actual formateada según el diseño
  const fechaActualFormateada = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date()).replace(',', ' ·');

  // Total acumulado de unidades solicitadas
  const totalUnidades = unidades.reduce((acc, u) => acc + (u.cantidad || 0), 0);

  // Manejadores
  const handleAgregarUnidad = () => {
    const nuevaUnidad = {
      id: Date.now(),
      tipo: 'O+',
      hemocomponente: 'Concentrado eritrocitario',
      cantidad: 1
    };
    setUnidades((prev) => [...prev, nuevaUnidad]);
  };

  const handleUpdateUnidad = (id, campo, valor) => {
    setUnidades((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [campo]: valor } : u))
    );
  };

  const handleEliminarUnidad = (id) => {
    setUnidades((prev) => prev.filter((u) => u.id !== id));
  };

  const handleCancelar = () => {
    if (unidades.length > 0 || motivo.trim() !== '') {
      if (window.confirm('¿Deseas descartar los datos de esta solicitud?')) {
        setUnidades([]);
        setMotivo('');
        setPrioridad('critica');
      }
    } else {
      setPrioridad('critica');
    }
  };

  const handlePrevisualizar = () => {
    if (unidades.length === 0) {
      alert('Por favor agrega al menos una unidad a la solicitud antes de previsualizar.');
      return;
    }
    setIsModalOpen(true);
  };

  const handleConfirmarEnvio = () => {
    const payload = {
      institucion: institucionSesion,
      solicitante: solicitanteSesion,
      prioridad,
      motivo,
      unidades: unidades.map(({ tipo, hemocomponente, cantidad }) => ({
        tipo,
        hemocomponente,
        cantidad
      }))
    };

    console.log('[BACKEND] Enviando solicitud a POST /api/solicitudes:', payload);

    alert(`¡Solicitud enviada con éxito! Se alertó a la red de bancos de sangre. (Total: ${totalUnidades} unidades)`);
    setIsModalOpen(false);
    setUnidades([]);
    setMotivo('');
    setPrioridad('critica');

    if (onCambiarModulo) {
      onCambiarModulo('historico');
    }
  };

  return (
    <div className="dona-page-wrapper">
      <Sidebar
        usuario={usuario}
        moduloActivo="solicitud"
        onCambiarModulo={onCambiarModulo}
        onLogout={onLogout}
      />

      {/* ÁREA PRINCIPAL*/}
      <div className="dona-main-area">
        <Navbar
          usuario={usuario}
          placeholder="Buscar unidad, folio o solicitud..."
        />

        {/* CONTENIDO DEL FORMULARIO */}
        <main className="dona-content-body sol-content-body">
          <section className="sol-page-header">
            <div className="sol-title-group">
              <h1>Solicitud de unidades</h1>
              <p>Crea una solicitud de emergencia a la red de bancos de sangre</p>
            </div>
          </section>

          <div className="sol-layout-grid">
            <div className="sol-form-column">
              <section className="sol-card">
                <div className="sol-card-header">
                  <div className="sol-card-title-group">
                    <h2 className="sol-card-title">Datos de la solicitud</h2>
                    <p className="sol-card-subtitle">Institución y solicitante se toman de tu sesión</p>
                  </div>
                </div>

                <div className="sol-readonly-row">
                  <div className="sol-field-group">
                    <div className="sol-field-label-row">
                      <label className="sol-field-label">Institución solicitante</label>
                      <span className="sol-badge-auto">Automático</span>
                    </div>
                    <div className="sol-readonly-input-box">
                      <span className="sol-input-icon">
                        <img src="/src/assets/iconos_registroU/edificio.png" alt="" />
                      </span>
                      <span className="sol-readonly-text">{institucionSesion}</span>
                      <span className="sol-lock-icon" title="Campo bloqueado">
                        <img src="/src/assets/iconos_gestionU/cerrar.png" alt="" />
                      </span>
                    </div>
                  </div>

                  {/* Solicitante */}
                  <div className="sol-field-group">
                    <div className="sol-field-label-row">
                      <label className="sol-field-label">Solicitante</label>
                      <span className="sol-badge-auto">Automático</span>
                    </div>
                    <div className="sol-readonly-input-box">
                      <span className="sol-input-icon">
                        <img src="/src/assets/iconos_soliU/usuario.png" alt="" />
                      </span>
                      <span className="sol-readonly-text">{solicitanteSesion}</span>
                      <span className="sol-lock-icon" title="Campo bloqueado">
                        <img src="/src/assets/iconos_gestionU/cerrar.png" alt="" />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sol-priority-section">
                  <label className="sol-field-label">Nivel de prioridad</label>
                  <div className="sol-priority-cards-group">
                    {/* Tarjeta: Crítica */}
                    <button
                      type="button"
                      className={`sol-priority-card card-critica ${prioridad === 'critica' ? 'active' : ''}`}
                      onClick={() => setPrioridad('critica')}
                    >
                      <span className="sol-radio-indicator">
                        <span className="sol-radio-dot"></span>
                      </span>
                      <span className="sol-priority-badge-dot dot-critica"></span>
                      <span className="sol-priority-card-text">Crítica</span>
                    </button>

                    {/* Tarjeta: Urgente */}
                    <button
                      type="button"
                      className={`sol-priority-card card-urgente ${prioridad === 'urgente' ? 'active' : ''}`}
                      onClick={() => setPrioridad('urgente')}
                    >
                      <span className="sol-radio-indicator">
                        <span className="sol-radio-dot"></span>
                      </span>
                      <span className="sol-priority-badge-dot dot-urgente"></span>
                      <span className="sol-priority-card-text">Urgente</span>
                    </button>

                    {/* Tarjeta: Normal */}
                    <button
                      type="button"
                      className={`sol-priority-card card-normal ${prioridad === 'normal' ? 'active' : ''}`}
                      onClick={() => setPrioridad('normal')}
                    >
                      <span className="sol-radio-indicator">
                        <span className="sol-radio-dot"></span>
                      </span>
                      <span className="sol-priority-badge-dot dot-normal"></span>
                      <span className="sol-priority-card-text">Normal</span>
                    </button>
                  </div>
                </div>

                {/* MOTIVO DE LA SOLICITUD */}
                <div className="sol-field-group">
                  <label className="sol-field-label">Motivo de la solicitud</label>
                  <textarea
                    className="sol-textarea"
                    rows="3"
                    placeholder="Describe el motivo de la solicitud (urgencia médica, paciente en quirófano, reposición inmediata, etc.)..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  ></textarea>
                </div>
              </section>

              {/* UNIDADES SOLICITADAS */}
              <section className="sol-card sol-units-card">
                <div className="sol-units-header-row">
                  <div className="sol-card-title-group">
                    <h2 className="sol-card-title">Unidades solicitadas</h2>
                    <p className="sol-card-subtitle">Tipo de sangre, hemocomponente y cantidad por renglón</p>
                  </div>
                  <button
                    type="button"
                    className="btn-add-unit"
                    onClick={handleAgregarUnidad}
                  >
                    + Agregar unidad
                  </button>
                </div>

                <div className="sol-units-table-header">
                  <span className="col-tipo">TIPO DE SANGRE</span>
                  <span className="col-hemo">HEMOCOMPONENTE</span>
                  <span className="col-cant">CANTIDAD</span>
                  <span className="col-action"></span>
                </div>

                {/* Lista de unidades */}
                <div className="sol-units-list">
                  {unidades.length > 0 ? (
                    unidades.map((u) => (
                      <div key={u.id} className="sol-unit-row">
                        {/* Tipo Sanguíneo */}
                        <div className="sol-custom-select-wrapper col-tipo">
                          <select
                            className="sol-filter-select"
                            value={u.tipo}
                            onChange={(e) => handleUpdateUnidad(u.id, 'tipo', e.target.value)}
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

                        {/* Hemocomponente */}
                        <div className="sol-custom-select-wrapper col-hemo">
                          <select
                            className="sol-filter-select"
                            value={u.hemocomponente}
                            onChange={(e) => handleUpdateUnidad(u.id, 'hemocomponente', e.target.value)}
                          >
                            <option value="Concentrado eritrocitario">Concentrado eritrocitario</option>
                            <option value="Plaquetas">Plaquetas</option>
                            <option value="Plasma fresco">Plasma fresco</option>
                            <option value="Sangre total">Sangre total</option>
                            <option value="Crioprecipitado">Crioprecipitado</option>
                          </select>
                        </div>

                        <div className="sol-stepper-box col-cant">
                          <button
                            type="button"
                            className="sol-stepper-btn"
                            onClick={() => handleUpdateUnidad(u.id, 'cantidad', Math.max(1, u.cantidad - 1))}
                            disabled={u.cantidad <= 1}
                          >
                            –
                          </button>
                          <span className="sol-stepper-val">{u.cantidad}</span>
                          <button
                            type="button"
                            className="sol-stepper-btn"
                            onClick={() => handleUpdateUnidad(u.id, 'cantidad', u.cantidad + 1)}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn-delete-row"
                          onClick={() => handleEliminarUnidad(u.id)}
                          title="Eliminar renglón"
                        >
                          {/* Cambiar a img de bote de basura*/}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    /* [BACKEND]: Estado vacío inicial en blanco */
                    <div className="sol-units-empty-state">
                      <p className="sol-empty-title">No has agregado unidades a esta solicitud (0)</p>
                      <span className="sol-empty-sub">
                        Haz clic en <strong>"+ Agregar unidad"</strong> para ingresar el tipo de sangre, hemocomponente y cantidad requerida.
                      </span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* RESUMEN DE LA SOLICITUD */}
            <aside className="sol-summary-column">
              <div className="sol-summary-card">
                <h3 className="sol-summary-title">Resumen de la solicitud</h3>

                <div className="sol-summary-meta-list">
                  <div className="sol-summary-meta-item">
                    <span className="meta-label">Estado</span>
                    <span className="sol-badge-pendiente">
                      <span className="sol-dot-amber"></span>
                      Pendiente
                    </span>
                  </div>

                  <div className="sol-summary-meta-item">
                    <span className="meta-label">Fecha de solicitud</span>
                    <span className="meta-val">{fechaActualFormateada}</span>
                  </div>

                  <div className="sol-summary-meta-item">
                    <span className="meta-label">Prioridad</span>
                    <div>
                      {prioridad === 'critica' && (
                        <span className="sol-priority-pill pill-critica">
                          <span className="dot-critica"></span>
                          Crítica
                        </span>
                      )}
                      {prioridad === 'urgente' && (
                        <span className="sol-priority-pill pill-urgente">
                          <span className="dot-urgente"></span>
                          Urgente
                        </span>
                      )}
                      {prioridad === 'normal' && (
                        <span className="sol-priority-pill pill-normal">
                          <span className="dot-normal"></span>
                          Normal
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sol-summary-divider"></div>

                {/* Lista de unidades agregadas */}
                <div className="sol-summary-units-section">
                  <span className="sol-summary-section-label">UNIDADES</span>
                  <div className="sol-summary-units-list">
                    {unidades.length > 0 ? (
                      unidades.map((u) => (
                        <div key={u.id} className="sol-summary-unit-item">
                          <span className={`blood-badge blood-${u.tipo.replace('+', 'pos').replace('-', 'neg')}`}>
                            {u.tipo}
                          </span>
                          <span className="summary-hemo-name">{u.hemocomponente}</span>
                          <span className="summary-hemo-qty">× {u.cantidad}</span>
                        </div>
                      ))
                    ) : (
                      <span className="sol-summary-empty-text">0 unidades seleccionadas</span>
                    )}
                  </div>
                </div>

                <div className="sol-summary-divider"></div>

                {/* Total de unidades */}
                <div className="sol-summary-total-row">
                  <span className="summary-total-label">Total de unidades</span>
                  <span className="summary-total-val">{totalUnidades}</span>
                </div>

                <div className="sol-summary-actions">
                  <button
                    type="button"
                    className="btn-preview-sol"
                    onClick={handlePrevisualizar}
                    disabled={unidades.length === 0}
                  >
                    <span className="btn-icon">
                      <img src="/src/assets/iconos_login/ojo.png" alt="" />
                    </span>
                    <span>Previsualizar solicitud</span>
                  </button>

                  <button
                    type="button"
                    className="btn-cancel-sol"
                    onClick={handleCancelar}
                  >
                    Cancelar
                  </button>
                </div>

                {/* Aviso*/}
                <div className="sol-summary-notice">
                  <span className="sol-notice-icon">
                    <img src="/src/assets/iconos_soliU/campana.png" alt="" />
                  </span>
                  <p>Al enviar, se generará una alerta para los bancos de sangre de la red.</p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* MODAL*/}
      <ModalPrevisualizacion
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        solicitud={{
          institucion: institucionSesion,
          solicitante: solicitanteSesion,
          prioridad,
          motivo,
          fechaFormateada: fechaActualFormateada,
          unidades
        }}
        onUpdateUnidad={handleUpdateUnidad}
        onAgregarUnidad={handleAgregarUnidad}
        onEliminarUnidad={handleEliminarUnidad}
        onConfirmarEnvio={handleConfirmarEnvio}
      />
    </div>
  );
}

