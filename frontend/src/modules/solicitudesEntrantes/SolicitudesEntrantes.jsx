import React, { useState } from 'react';
import './SolicitudesEntrantes.css';
import { Sidebar, Navbar } from '../../components/layout';

export default function SolicitudesEntrantes({ usuario, onCambiarModulo, onLogout }) {
  const [tabActiva, setTabActiva] = useState('pendientes');

  // Buscador de solicitudes
  const [busqueda, setBusqueda] = useState('');

  const [solicitudes, setSolicitudes] = useState([]);

  // Solicitud actualmente seleccionada
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);

  const [conteos, setConteos] = useState({
    pendientes: 0,
    aceptadas: 0,
    rechazadas: 0,
    todas: 0
  });

  const solicitudesFiltradas = solicitudes.filter((item) => {
    // Filtro por pestaña
    if (tabActiva === 'pendientes' && item.estado !== 'pendiente') return false;
    if (tabActiva === 'aceptadas' && item.estado !== 'aceptada') return false;
    if (tabActiva === 'rechazadas' && item.estado !== 'rechazada') return false;

    // Filtro por texto (ID o Institución)
    if (busqueda.trim() !== '') {
      const matchId = item.id.toLowerCase().includes(busqueda.toLowerCase());
      const matchInst = item.institucion.toLowerCase().includes(busqueda.toLowerCase());
      if (!matchId && !matchInst) return false;
    }

    return true;
  });

  // Manejadores
  const handleAceptar = (id) => {
    console.log(`[BACKEND] Aceptando solicitud ${id} en POST /api/solicitudes/entrantes/${id}/aceptar`);
    alert(`Solicitud ${id} aceptada. Se notificó a la institución y se reservaron las unidades del inventario.`);

    setSolicitudes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, estado: 'aceptada' } : s))
    );
    if (solicitudSeleccionada?.id === id) {
      setSolicitudSeleccionada((prev) => (prev ? { ...prev, estado: 'aceptada' } : null));
    }
  };

  const handleRechazar = (id) => {
    const confirmacion = window.confirm(`¿Estás seguro de rechazar la solicitud ${id}?`);
    if (!confirmacion) return;

    console.log(`[BACKEND] Rechazando solicitud ${id} en POST /api/solicitudes/entrantes/${id}/rechazar`);
    alert(`Solicitud ${id} rechazada.`);

    setSolicitudes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, estado: 'rechazada' } : s))
    );
    if (solicitudSeleccionada?.id === id) {
      setSolicitudSeleccionada((prev) => (prev ? { ...prev, estado: 'rechazada' } : null));
    }
  };

  // Helpers
  const renderPrioridadBadge = (prioridad) => {
    const p = prioridad?.toLowerCase();
    if (p === 'critica' || p === 'crítica') {
      return (
        <span className="sentr-badge badge-critica">
          <span className="sentr-dot dot-critica"></span>
          Crítica
        </span>
      );
    }
    if (p === 'urgente') {
      return (
        <span className="sentr-badge badge-urgente">
          <span className="sentr-dot dot-urgente"></span>
          Urgente
        </span>
      );
    }
    return (
      <span className="sentr-badge badge-normal">
        <span className="sentr-dot dot-normal"></span>
        Normal
      </span>
    );
  };

  const renderEstadoBadge = (estado) => {
    const e = estado?.toLowerCase();
    if (e === 'aceptada') {
      return (
        <span className="sentr-badge badge-aceptada">
          <span className="sentr-dot dot-aceptada"></span>
          Aceptada
        </span>
      );
    }
    if (e === 'rechazada') {
      return (
        <span className="sentr-badge badge-rechazada">
          <span className="sentr-dot dot-rechazada"></span>
          Rechazada
        </span>
      );
    }
    return (
      <span className="sentr-badge badge-pendiente">
        <span className="sentr-dot dot-pendiente"></span>
        Pendiente
      </span>
    );
  };

  return (
    <div className="dona-page-wrapper">
      <Sidebar
        usuario={usuario}
        moduloActivo="entrantes"
        onCambiarModulo={onCambiarModulo}
        onLogout={onLogout}
      />

      {/* ÁREA PRINCIPAL*/}
      <div className="dona-main-area">
        <Navbar
          usuario={usuario}
          placeholder="Buscar unidad, folio o solicitud..."
        />

        {/* CONTENIDO*/}
        <main className="dona-content-body sentr-content-body">
          <section className="sentr-page-header">
            <div className="sentr-title-group">
              <h1>Solicitudes entrantes</h1>
              <p>Solicitudes de emergencia de otras instituciones que tu banco de sangre puede atender</p>
            </div>
          </section>

          {/* TABLA*/}
          <div className="sentr-layout-grid">
            <div className="sentr-table-card">
              {/* Pestañas y Buscador */}
              <div className="sentr-toolbar-header">
                <div className="sentr-tabs-group">
                  <button
                    type="button"
                    className={`sentr-tab-btn ${tabActiva === 'pendientes' ? 'active' : ''}`}
                    onClick={() => setTabActiva('pendientes')}
                  >
                    <span>Pendientes</span>
                    <span className="sentr-tab-counter">{conteos.pendientes}</span>
                  </button>

                  <button
                    type="button"
                    className={`sentr-tab-btn ${tabActiva === 'aceptadas' ? 'active' : ''}`}
                    onClick={() => setTabActiva('aceptadas')}
                  >
                    <span>Aceptadas</span>
                    <span className="sentr-tab-counter">{conteos.aceptadas}</span>
                  </button>

                  <button
                    type="button"
                    className={`sentr-tab-btn ${tabActiva === 'rechazadas' ? 'active' : ''}`}
                    onClick={() => setTabActiva('rechazadas')}
                  >
                    <span>Rechazadas</span>
                    <span className="sentr-tab-counter">{conteos.rechazadas}</span>
                  </button>

                  <button
                    type="button"
                    className={`sentr-tab-btn ${tabActiva === 'todas' ? 'active' : ''}`}
                    onClick={() => setTabActiva('todas')}
                  >
                    <span>Todas</span>
                    <span className="sentr-tab-counter">{conteos.todas}</span>
                  </button>
                </div>

                <div className="sentr-search-box">
                  <span className="sentr-search-icon">
                    <img src="/src/assets/iconos_sidenavbar/busqueda.png" alt="" />
                  </span>
                  <input
                    type="text"
                    className="sentr-search-input"
                    placeholder="Buscar..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>

              {/* TABLA DE SOLICITUDES ENTRANTES */}
              <div className="sentr-table-container">
                <table className="sentr-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>INSTITUCIÓN</th>
                      <th>PRIORIDAD</th>
                      <th>UNIDADES</th>
                      <th>FECHA DE SOLICITUD</th>
                      <th>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudesFiltradas.length > 0 ? (
                      solicitudesFiltradas.map((item) => (
                        <tr
                          key={item.id}
                          className={`sentr-table-row ${solicitudSeleccionada?.id === item.id ? 'row-selected' : ''}`}
                          onClick={() => setSolicitudSeleccionada(item)}
                        >
                          <td className="cell-sentr-id">{item.id}</td>
                          <td className="cell-sentr-inst">{item.institucion}</td>
                          <td>{renderPrioridadBadge(item.prioridad)}</td>
                          <td className="cell-sentr-units">{item.totalUnidades}</td>
                          <td className="cell-sentr-date">{item.fechaSolicitud}</td>
                          <td>{renderEstadoBadge(item.estado)}</td>
                        </tr>
                      ))
                    ) : (
                      /* [BACKEND]: Estado vacío inicial */
                      <tr>
                        <td colSpan="6" className="sentr-table-empty-cell">
                          <div className="sentr-empty-placeholder">
                            <p className="sentr-empty-title">Sin solicitudes entrantes (0)</p>
                            <span className="sentr-empty-sub">
                              [BACKEND]: Aquí se listarán las solicitudes de emergencia entrantes devueltas por{' '}
                              <code>GET /api/solicitudes/entrantes</code>.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PANEL DE DETALLE DE LA SOLICITUD */}
            <aside className="sentr-detail-column">
              {solicitudSeleccionada ? (
                <div className="sentr-detail-card">
                  <div className="sentr-detail-header">
                    <div className="sentr-detail-title-group">
                      <h2 className="sentr-detail-id">{solicitudSeleccionada.id}</h2>
                      <span className="sentr-detail-date-sub">
                        Recibida el {solicitudSeleccionada.fechaCompleta || solicitudSeleccionada.fechaSolicitud}
                      </span>
                    </div>
                    <div>{renderPrioridadBadge(solicitudSeleccionada.prioridad)}</div>
                  </div>

                  {/* Metadatos de institución, solicitante y num. tel */}
                  <div className="sentr-detail-meta-list">
                    <div className="sentr-meta-item">
                      <span className="sentr-meta-icon">
                        <img src="/src/assets/iconos_registroU/edificio.png" alt="" />
                      </span>
                      <div className="sentr-meta-texts">
                        <span className="sentr-meta-val">{solicitudSeleccionada.institucion}</span>
                        <span className="sentr-meta-sub">Institución solicitante</span>
                      </div>
                    </div>

                    <div className="sentr-meta-item">
                      <span className="sentr-meta-icon">
                        <img src="/src/assets/iconos_soliU/usuario.png" alt="" />
                      </span>
                      <div className="sentr-meta-texts">
                        <span className="sentr-meta-val">{solicitudSeleccionada.solicitante}</span>
                        <span className="sentr-meta-sub">Solicitante</span>
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div className="sentr-meta-item">
                      <span className="sentr-meta-icon">
                        <img src="/src/assets/iconos_soliU/telefono.png" alt="" />
                      </span>
                      <div className="sentr-meta-texts">
                        <span className="sentr-meta-val">{solicitudSeleccionada.telefono || '951 123 4567'}</span>
                        <span className="sentr-meta-sub">Teléfono de la institución</span>
                      </div>
                    </div>
                  </div>

                  {/*Motivo */}
                  <div className="sentr-motivo-box">
                    <span className="sentr-motivo-label">Motivo</span>
                    <p className="sentr-motivo-text">
                      {solicitudSeleccionada.motivo || 'Sin motivo especificado.'}
                    </p>
                  </div>

                  {/* Desglose de Unidades Solicitadas */}
                  <div className="sentr-units-section">
                    <span className="sentr-units-section-title">UNIDADES SOLICITADAS</span>

                    <div className="sentr-units-cards-list">
                      {solicitudSeleccionada.unidades?.map((u, idx) => (
                        <div key={idx} className="sentr-unit-card">
                          <div className="sentr-unit-header-row">
                            <span className={`blood-badge blood-${u.tipo.replace('+', 'pos').replace('-', 'neg')}`}>
                              {u.tipo}
                            </span>
                            <span className="sentr-unit-name">{u.hemocomponente}</span>
                            <span className="sentr-unit-qty">× {u.cantidad}</span>
                          </div>

                          {/* Disponibilidad en stock */}
                          <div className="sentr-stock-availability">
                            <span>{u.disponibles} disponibles</span>
                          </div>

                          {/* Chips de folios de unidades sugeridas */}
                          {u.foliosSugeridos && u.foliosSugeridos.length > 0 && (
                            <div className="sentr-unit-chips-row">
                              {u.foliosSugeridos.map((folio) => (
                                <span key={folio} className="sentr-folio-chip">
                                  {folio}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <span className="sentr-sugerencia-foot">
                      Unidades sugeridas por fecha de caducidad más próxima.
                    </span>
                  </div>

                  {/* Acciones para Responder la Solicitud */}
                  {solicitudSeleccionada.estado === 'pendiente' && (
                    <div className="sentr-actions-row">
                      <button
                        type="button"
                        className="sentr-btn-reject"
                        onClick={() => handleRechazar(solicitudSeleccionada.id)}
                      >
                        <span>Rechazar</span>
                      </button>

                      <button
                        type="button"
                        className="sentr-btn-accept"
                        onClick={() => handleAceptar(solicitudSeleccionada.id)}
                      >
                        <span>Aceptar solicitud</span>
                      </button>
                    </div>
                  )}

                  {solicitudSeleccionada.estado === 'aceptada' && (
                    <div className="sentr-status-notice notice-aceptada">
                      Esta solicitud ya fue aceptada y transferida.
                    </div>
                  )}

                  {solicitudSeleccionada.estado === 'rechazada' && (
                    <div className="sentr-status-notice notice-rechazada">
                      Esta solicitud fue rechazada.
                    </div>
                  )}
                </div>
              ) : (
                /* Estado vacío cuando no hay ninguna fila seleccionada */
                <div className="sentr-detail-card sentr-detail-empty">
                  <h3 className="sentr-empty-detail-title">Selecciona una solicitud</h3>
                  <p className="sentr-empty-detail-sub">
                    Haz clic en cualquier solicitud de la lista para revisar el desglose de unidades requeridas, el stock disponible y responder al requerimiento.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

