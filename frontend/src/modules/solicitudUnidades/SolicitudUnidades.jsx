import React, { useState, useEffect } from 'react';
import { obtenerUsuarioSesion } from '../../services/sesionService';
import './SolicitudUnidades.css';
import { Sidebar, Navbar } from '../../components/layout';
import ModalPrevisualizacion from './ModalPrevisualizacion';
import ModalAviso from '../../components/common/ModalAviso';
import { crearSolicitud } from '../../services/solicitudesService';
import { obtenerHemocomponentes, obtenerTiposSangre } from '../../services/catalogosService';

export default function SolicitudUnidades({ usuario, onCambiarModulo, onLogout }) {
  // Datos del solicitante tomados de la sesión. Sin fallbacks inventados:
  // si el usuario no tiene institución, se muestra "Sin institución" y el
  // formulario queda deshabilitado (el backend tampoco aceptaría la solicitud).
  const usuarioSesion = usuario || obtenerUsuarioSesion();
  const institucionSesion = usuarioSesion?.institucion || 'Sin institución';
  const solicitanteSesion = usuarioSesion?.nombre || 'Sin sesión';
  const sinInstitucion = !usuarioSesion?.institucion_id;

  const [prioridad, setPrioridad] = useState('critica'); // 'critica' | 'urgente' | 'normal'
  const [motivo, setMotivo] = useState('');

  const [unidades, setUnidades] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Aviso y confirmación sencillos (modal) en lugar de alert()/confirm().
  const [aviso, setAviso] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null); // { mensaje, onAceptar }

  // Catálogos reales de la BD (nombres que el backend sí puede resolver).
  // Sin lista hardcodeada: si el catálogo falla o viene vacío, se muestra
  // el error y no se puede agregar ni enviar ninguna unidad.
  const [hemos, setHemos] = useState([]);
  const [tiposSangre, setTiposSangre] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState('');

  useEffect(() => {
    let cancelado = false;
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
  }, []);

  // Si un renglón quedó con un valor que ya no está en el catálogo,
  // se ajusta al primer valor válido para no mandar un nombre inválido.
  useEffect(() => {
    if (cargandoCatalogos || errorCatalogo || hemos.length === 0 || tiposSangre.length === 0) return;
    setUnidades((prev) => prev.map((u) => ({
      ...u,
      tipo: tiposSangre.includes(u.tipo) ? u.tipo : tiposSangre[0],
      hemocomponente: hemos.includes(u.hemocomponente) ? u.hemocomponente : hemos[0],
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargandoCatalogos, errorCatalogo]);

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
    if (errorCatalogo || hemos.length === 0 || tiposSangre.length === 0) return;
    const nuevaUnidad = {
      id: Date.now(),
      tipo: tiposSangre.includes('O+') ? 'O+' : tiposSangre[0],
      hemocomponente: hemos[0],
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
      setConfirmacion({
        mensaje: '¿Deseas descartar los datos de esta solicitud?',
        onAceptar: () => {
          setUnidades([]);
          setMotivo('');
          setPrioridad('critica');
        },
      });
    } else {
      setPrioridad('critica');
    }
  };

  const handlePrevisualizar = () => {
    if (unidades.length === 0) {
      setAviso({ titulo: 'Sin unidades', mensaje: 'Por favor agrega al menos una unidad a la solicitud antes de previsualizar.' });
      return;
    }
    setIsModalOpen(true);
  };

  const handleConfirmarEnvio = async () => {
    if (enviando || unidades.length === 0) return;
    const institucionId = usuarioSesion?.institucion_id;
    if (!institucionId) {
      setAviso({ titulo: 'Sin institución', mensaje: 'Tu usuario no tiene institución asignada. Pide al administrador general que te asigne una institución.' });
      return;
    }
    setEnviando(true);
    try {
      await crearSolicitud({
        institucion_id: Number(institucionId),
        prioridad,
        motivo,
        unidades: unidades.map(({ tipo, hemocomponente, cantidad }) => ({
          tipo,
          hemocomponente,
          cantidad
        }))
      });
      setIsModalOpen(false);
      setUnidades([]);
      setMotivo('');
      setPrioridad('critica');
      if (onCambiarModulo) {
        onCambiarModulo('historico');
      }
    } catch (err) {
      setAviso({ titulo: 'Error', mensaje: String(err?.response?.data || err?.message || 'No se pudo enviar la solicitud.') });
    } finally {
      setEnviando(false);
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

          {/* Aviso cuando el usuario no tiene institución asignada */}
          {sinInstitucion && (
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.95rem' }}>
              <strong>Sin institución asignada.</strong> Pide al administrador general que te asigne una institución.
            </div>
          )}

          {/* Aviso cuando no se pudo cargar el catálogo de la BD */}
          {errorCatalogo && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.95rem' }}>
              <strong>No se pudo cargar el catálogo de hemocomponentes.</strong> {errorCatalogo}
            </div>
          )}

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
                        <img src="/assets/iconos_registroU/edificio.png" alt="" />
                      </span>
                      <span className="sol-readonly-text">{institucionSesion}</span>
                      <span className="sol-lock-icon" title="Campo bloqueado">
                        <img src="/assets/iconos_gestionU/cerrar.png" alt="" />
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
                        <img src="/assets/iconos_soliU/usuario.png" alt="" />
                      </span>
                      <span className="sol-readonly-text">{solicitanteSesion}</span>
                      <span className="sol-lock-icon" title="Campo bloqueado">
                        <img src="/assets/iconos_gestionU/cerrar.png" alt="" />
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
                      disabled={sinInstitucion}
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
                      disabled={sinInstitucion}
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
                      disabled={sinInstitucion}
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
                    disabled={sinInstitucion}
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
                    disabled={sinInstitucion || cargandoCatalogos || !!errorCatalogo}
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
                        {/* Tipo Sanguíneo (catálogo real de la BD) */}
                        <div className="sol-custom-select-wrapper col-tipo">
                          <select
                            className="sol-filter-select"
                            value={u.tipo}
                            onChange={(e) => handleUpdateUnidad(u.id, 'tipo', e.target.value)}
                            disabled={cargandoCatalogos}
                          >
                            {cargandoCatalogos ? (
                              <option value={u.tipo}>Cargando catálogo…</option>
                            ) : (
                              tiposSangre.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))
                            )}
                          </select>
                        </div>

                        {/* Hemocomponente (catálogo real de la BD) */}
                        <div className="sol-custom-select-wrapper col-hemo">
                          <select
                            className="sol-filter-select"
                            value={u.hemocomponente}
                            onChange={(e) => handleUpdateUnidad(u.id, 'hemocomponente', e.target.value)}
                            disabled={cargandoCatalogos}
                          >
                            {cargandoCatalogos ? (
                              <option value={u.hemocomponente}>Cargando catálogo…</option>
                            ) : (
                              hemos.map((h) => (
                                <option key={h} value={h}>{h}</option>
                              ))
                            )}
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
                    disabled={unidades.length === 0 || sinInstitucion || !!errorCatalogo}
                  >
                    <span className="btn-icon">
                      <img src="/assets/iconos_login/ojo.png" alt="" />
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
                    <img src="/assets/iconos_soliU/campana.png" alt="" />
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
        hemocomponentes={hemos}
        tiposSangre={tiposSangre}
        onUpdateUnidad={handleUpdateUnidad}
        onAgregarUnidad={handleAgregarUnidad}
        onEliminarUnidad={handleEliminarUnidad}
        onConfirmarEnvio={handleConfirmarEnvio}
        enviando={enviando}
      />

      {/* Aviso y confirmación sencillos (modal) en lugar de alert()/confirm() */}
      <ModalAviso
        isOpen={!!aviso}
        titulo={aviso?.titulo || 'Aviso'}
        mensaje={aviso?.mensaje}
        onClose={() => setAviso(null)}
      />
      <ModalAviso
        isOpen={!!confirmacion}
        tipo="confirmacion"
        titulo="Descartar solicitud"
        mensaje={confirmacion?.mensaje}
        textoAceptar="Descartar"
        onAceptar={() => {
          const accion = confirmacion?.onAceptar;
          setConfirmacion(null);
          if (accion) accion();
        }}
        onClose={() => setConfirmacion(null)}
      />
    </div>
  );
}

