import React, { useState, useEffect } from 'react';
import { obtenerUsuarioSesion } from '../../services/sesionService';
import './SolicitudesEntrantes.css';
import { Sidebar, Navbar } from '../../components/layout';
import ModalAviso from '../../components/common/ModalAviso';
import { obtenerSolicitudesEntrantes, responderSolicitud } from '../../services/solicitudesService';
import { normalizarHemocomponente } from '../../services/catalogosService';

export default function SolicitudesEntrantes({ usuario, onCambiarModulo, onLogout }) {
  const [tabActiva, setTabActiva] = useState('pendientes');

  // Buscador de solicitudes
  const [busqueda, setBusqueda] = useState('');

  const [solicitudes, setSolicitudes] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');
  // Aviso y confirmación sencillos (modal) en lugar de alert()/confirm().
  const [aviso, setAviso] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null); // { mensaje, onAceptar }

  const usuarioSesion = usuario || obtenerUsuarioSesion();
  // La institución es solo la de la sesión. Sin fallback: un usuario sin
  // institución no ve entrantes de nadie, ve el aviso.
  const institucionIdSesion = usuarioSesion?.institucion_id ?? null;
  const esAdminGeneral = Number(usuarioSesion?.rol_id) === 1;
  // Solo el admin institucional (rol_id 2) puede responder solicitudes
  // entrantes. El personal médico (rol_id 3) las ve en solo lectura.
  const puedeResponder = Number(usuarioSesion?.rol_id) === 2;
  const sinInstitucion = !esAdminGeneral && !institucionIdSesion;

  // Estado PARA EL TABLERO (lo que ve esta institución): el rechazo
  // automático es por institución — la solicitud sigue Pendiente en
  // global (para las demás instituciones), pero para la institución
  // que la ve ya está rechazada. Por eso las pestañas y sus contadores
  // usan este estado derivado y no x.estado directamente (punto 6 del
  // QA: una solicitud con "Rechazo automático" aparecía en
  // "Pendientes (1)" y "Rechazadas" marcaba 0).
  const estadoParaTablero = (item) =>
    item.estado === 'pendiente' && item.rechazoAutomatico ? 'rechazada' : item.estado;

  const calcularConteos = (lista) => ({
    pendientes: lista.filter((x) => estadoParaTablero(x) === 'pendiente').length,
    aceptadas: lista.filter((x) => estadoParaTablero(x) === 'aceptada').length,
    rechazadas: lista.filter((x) => estadoParaTablero(x) === 'rechazada').length,
    todas: lista.length,
  });

  const cargarEntrantes = async () => {
    if (sinInstitucion) {
      setSolicitudes([]);
      setConteos({ pendientes: 0, aceptadas: 0, rechazadas: 0, todas: 0 });
      return;
    }
    try {
      setErrorCarga('');
      const data = await obtenerSolicitudesEntrantes(institucionIdSesion);
      const lista = Array.isArray(data) ? data : [];
      setSolicitudes(lista);
      setConteos(calcularConteos(lista));
    } catch (err) {
      console.error("Error al cargar solicitudes entrantes:", err);
      setErrorCarga(err?.response?.data || err?.message || 'No se pudieron cargar las solicitudes entrantes.');
    }
  };

  useEffect(() => { cargarEntrantes(); }, []);

  // Solicitud actualmente seleccionada
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);

  const [conteos, setConteos] = useState({
    pendientes: 0,
    aceptadas: 0,
    rechazadas: 0,
    todas: 0
  });

  const solicitudesFiltradas = solicitudes.filter((item) => {
    // Filtro por pestaña (con el estado derivado: el rechazo automático
    // cuenta en "Rechazadas", no en "Pendientes").
    if (tabActiva === 'pendientes' && estadoParaTablero(item) !== 'pendiente') return false;
    if (tabActiva === 'aceptadas' && estadoParaTablero(item) !== 'aceptada') return false;
    if (tabActiva === 'rechazadas' && estadoParaTablero(item) !== 'rechazada') return false;

    // Filtro por texto (ID o Institución)
    if (busqueda.trim() !== '') {
      const matchId = item.id.toLowerCase().includes(busqueda.toLowerCase());
      const matchInst = item.institucion.toLowerCase().includes(busqueda.toLowerCase());
      if (!matchId && !matchInst) return false;
    }

    return true;
  });

  // Manejadores
  const actualizarEstadoLocal = (id, estado, extra = {}) => {
    setSolicitudes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, estado, ...extra } : s))
    );
    setConteos((prev) => {
      const lista = solicitudes.map((s) => (s.id === id ? { ...s, estado, ...extra } : s));
      return calcularConteos(lista);
    });
    if (solicitudSeleccionada?.id === id) {
      setSolicitudSeleccionada((prev) => (prev ? { ...prev, estado, ...extra } : null));
    }
  };

  const handleAceptar = async (id) => {
    try {
      const res = await responderSolicitud(id, 'aceptar');
      // La institución que atendió es la de la sesión (el backend también
      // la devuelve en atendidaPor).
      actualizarEstadoLocal(id, 'aceptada', {
        atendidaPor: res?.atendidaPor || usuarioSesion?.institucion || '',
      });
    } catch (err) {
      setAviso({ titulo: 'Error', mensaje: String(err?.response?.data || err?.message || 'No se pudo aceptar la solicitud.') });
    }
  };

  const rechazarSolicitud = async (id) => {
    try {
      await responderSolicitud(id, 'rechazar');
      actualizarEstadoLocal(id, 'rechazada');
    } catch (err) {
      setAviso({ titulo: 'Error', mensaje: String(err?.response?.data || err?.message || 'No se pudo rechazar la solicitud.') });
    }
  };

  const handleRechazar = (id) => {
    setConfirmacion({
      mensaje: `¿Estás seguro de rechazar la solicitud ${id}?`,
      onAceptar: () => rechazarSolicitud(id),
    });
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

  // Badge de estado: cada estado muestra SU propio nombre. Un estado
  // desconocido se muestra capitalizado, nunca "Pendiente" por default.
  const renderEstadoBadge = (estado) => {
    const e = (estado || '').toLowerCase().trim();
    const mapa = {
      pendiente: ['badge-pendiente', 'dot-pendiente', 'Pendiente'],
      aceptada: ['badge-aceptada', 'dot-aceptada', 'Aceptada'],
      completada: ['badge-completada', 'dot-completada', 'Completada'],
      rechazada: ['badge-rechazada', 'dot-rechazada', 'Rechazada'],
      cancelada: ['badge-cancelada', 'dot-cancelada', 'Cancelada'],
    };
    const nombrePropio = e ? e.charAt(0).toUpperCase() + e.slice(1) : 'Sin estado';
    const [cls, dot, texto] = mapa[e] || ['badge-desconocido', 'dot-desconocido', nombrePropio];
    return (
      <span className={`sentr-badge ${cls}`}>
        <span className={`sentr-dot ${dot}`}></span>
        {texto}
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

          {/* Aviso cuando el usuario no tiene institución asignada */}
          {sinInstitucion && (
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.95rem' }}>
              <strong>Sin institución asignada.</strong> Pide al administrador general que te asigne una institución.
            </div>
          )}

          {/* Solo lectura para quien no puede responder (personal médico) */}
          {!puedeResponder && !sinInstitucion && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.95rem' }}>
              Solo el administrador institucional puede responder solicitudes entrantes.
            </div>
          )}

          {/* Error al cargar desde la API (no se confunde con "no hay solicitudes") */}
          {errorCarga && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.95rem' }}>
              <strong>Error al cargar las solicitudes entrantes:</strong> {String(errorCarga)}
            </div>
          )}

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
                    <img src="/assets/iconos_sidenavbar/busqueda.png" alt="" />
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
                          <td>
                            {/* Rechazo automático POR INSTITUCIÓN: la
                                solicitud sigue Pendiente para otras
                                instituciones con stock, pero esta no
                                debería aceptarla (stock menor a 5). */}
                            {item.rechazoAutomatico && item.estado === 'pendiente' ? (
                              <span className="sentr-badge badge-rechazada" title={item.motivoRechazo || 'Stock menor a 5'}>
                                <span className="sentr-dot dot-rechazada"></span>
                                Rechazo automático
                              </span>
                            ) : (
                              renderEstadoBadge(item.estado)
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="sentr-table-empty-cell">
                          <div className="sentr-empty-placeholder">
                            <p className="sentr-empty-title">Sin solicitudes entrantes (0)</p>
                            <span className="sentr-empty-sub">
                              Aún no hay solicitudes de otras instituciones pendientes de atender.
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
                        <img src="/assets/iconos_registroU/edificio.png" alt="" />
                      </span>
                      <div className="sentr-meta-texts">
                        <span className="sentr-meta-val">{solicitudSeleccionada.institucion}</span>
                        <span className="sentr-meta-sub">Institución solicitante</span>
                      </div>
                    </div>

                    <div className="sentr-meta-item">
                      <span className="sentr-meta-icon">
                        <img src="/assets/iconos_soliU/usuario.png" alt="" />
                      </span>
                      <div className="sentr-meta-texts">
                        <span className="sentr-meta-val">{solicitudSeleccionada.solicitante}</span>
                        <span className="sentr-meta-sub">Solicitante</span>
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div className="sentr-meta-item">
                      <span className="sentr-meta-icon">
                        <img src="/assets/iconos_soliU/telefono.png" alt="" />
                      </span>
                      <div className="sentr-meta-texts">
                        <span className="sentr-meta-val">{solicitudSeleccionada.telefono || 'Sin teléfono'}</span>
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
                            {/* "Paquete globular" se muestra como
                                "Concentrado eritrocitario": es el mismo
                                producto (ver catalogosService). */}
                            <span className="sentr-unit-name">{normalizarHemocomponente(u.hemocomponente)}</span>
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

                  {/* Acciones para Responder la Solicitud: solo admin institucional (rol_id 2).
                      Si el stock propio del tipo solicitado es menor a 5, la
                      solicitud se marca como rechazo automático para esta
                      institución y no se puede aceptar (sigue Pendiente para
                      otras instituciones con stock). */}
                  {solicitudSeleccionada.estado === 'pendiente' && puedeResponder && !solicitudSeleccionada.rechazoAutomatico && (
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

                  {solicitudSeleccionada.estado === 'pendiente' && solicitudSeleccionada.rechazoAutomatico && (
                    <div className="sentr-status-notice notice-rechazada">
                      Rechazada automáticamente para tu institución: {solicitudSeleccionada.motivoRechazo || 'tu stock del tipo solicitado es menor a 5.'} La solicitud sigue pendiente para otras instituciones con stock.
                    </div>
                  )}

                  {solicitudSeleccionada.estado === 'pendiente' && !puedeResponder && !solicitudSeleccionada.rechazoAutomatico && (
                    <div className="sentr-status-notice notice-solo-lectura">
                      Solo el administrador institucional puede responder solicitudes entrantes.
                    </div>
                  )}

                  {solicitudSeleccionada.estado === 'aceptada' && (
                    <div className="sentr-status-notice notice-aceptada">
                      Esta solicitud ya fue aceptada y transferida.
                      {solicitudSeleccionada.atendidaPor ? ` Atendida por ${solicitudSeleccionada.atendidaPor}.` : ''}
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
        titulo="Rechazar solicitud"
        mensaje={confirmacion?.mensaje}
        textoAceptar="Rechazar"
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

