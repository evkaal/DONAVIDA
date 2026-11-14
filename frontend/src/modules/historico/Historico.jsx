import React, { useEffect, useState } from 'react';
import './Historico.css';
import { Sidebar, Navbar } from '../../components/layout';
import { getHistorico } from '../../services/historicoService';

const PAGE_SIZE = 8;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date).replace(',', ' ·');
};

export default function Historico({ usuario, onCambiarModulo, onLogout }) {
  const [tabActiva, setTabActiva] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('ultimos_20');
  const [solicitudes, setSolicitudes] = useState([]);
  const [conteos, setConteos] = useState({ todas: 0, enviadas: 0, recibidas: 0 });
  const [paginaActual, setPaginaActual] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorConsulta, setErrorConsulta] = useState('');
  const [vistaGlobal, setVistaGlobal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setErrorConsulta('');

    getHistorico({
      tipo: tabActiva,
      busqueda: busqueda.trim(),
      estado: filtroEstado,
      periodo: filtroFecha,
      pagina: paginaActual,
      limite: PAGE_SIZE,
    }, controller.signal)
      .then((data) => {
        setSolicitudes(data.solicitudes || []);
        setConteos(data.conteos || { todas: 0, enviadas: 0, recibidas: 0 });
        setTotal(data.total || 0);
        setTotalPaginas(data.totalPaginas || 1);
        setVistaGlobal(Boolean(data.vistaGlobal));
        if (data.pagina && data.pagina !== paginaActual) setPaginaActual(data.pagina);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setSolicitudes([]);
        setTotal(0);
        setTotalPaginas(1);
        setErrorConsulta(error.response?.data || 'No fue posible consultar el histórico. Intenta de nuevo.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [tabActiva, busqueda, filtroEstado, filtroFecha, paginaActual]);

  const cambiarFiltro = (setter, value) => {
    setter(value);
    setPaginaActual(1);
  };

  const handleExportar = () => {
    alert('La exportación se conectará cuando esté disponible el endpoint de descarga.');
  };

  const renderTipoBadge = (tipo) => (
    <span className={`hist-tipo-badge ${tipo === 'enviada' ? 'tipo-enviada' : 'tipo-recibida'}`}>
      <span className={`hist-dot ${tipo === 'enviada' ? 'dot-enviada' : 'dot-recibida'}`} />
      {tipo === 'enviada' ? 'Enviada' : 'Recibida'}
    </span>
  );

  const renderPrioridadBadge = (prioridad) => {
    const value = prioridad?.toLowerCase();
    const critical = value === 'critica' || value === 'crítica';
    const urgent = value === 'urgente';
    const className = critical ? 'prioridad-critica' : urgent ? 'prioridad-urgente' : 'prioridad-normal';
    return (
      <span className={`hist-prioridad-badge ${className}`}>
        <span className={`hist-dot dot-${critical ? 'critica' : urgent ? 'urgente' : 'normal'}`} />
        {prioridad || 'Normal'}
      </span>
    );
  };

  const renderEstadoBadge = (estado) => {
    const value = estado?.toLowerCase();
    const completed = value === 'completada' || value === 'completado' || value === 'aceptada' || value === 'aceptado';
    const rejected = value === 'rechazada' || value === 'rechazado';
    const cancelled = value === 'cancelada' || value === 'cancelado';
    const className = completed ? 'estado-completada' : rejected ? 'estado-rechazada' : cancelled ? 'estado-cancelada' : 'estado-pendiente';
    const dot = completed ? 'completada' : rejected ? 'rechazada' : cancelled ? 'cancelada' : 'pendiente';
    return (
      <span className={`hist-estado-badge ${className}`}>
        <span className={`hist-dot dot-${dot}`} />
        {estado || 'Sin estado'}
      </span>
    );
  };

  const firstResult = total === 0 ? 0 : (paginaActual - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(paginaActual * PAGE_SIZE, total);
  const firstVisiblePage = Math.max(1, Math.min(paginaActual - 2, totalPaginas - 4));
  const pageNumbers = Array.from(
    { length: Math.min(totalPaginas, 5) },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <div className="dona-page-wrapper">
      <Sidebar usuario={usuario} moduloActivo="historico" onCambiarModulo={onCambiarModulo} onLogout={onLogout} />
      <div className="dona-main-area">
        <Navbar usuario={usuario} placeholder="Buscar unidad, folio o solicitud..." />
        <main className="dona-content-body hist-content-body">
          <section className="hist-page-header">
            <div className="hist-title-group">
              <h1>Histórico</h1>
              <p>Consulta las solicitudes de unidades enviadas y recibidas por tu institución</p>
            </div>
          </section>

          <section className="hist-table-card">
            <div className="hist-toolbar-header">
              <div className="hist-tabs-group">
                {(vistaGlobal
                  ? [['todas', 'Todas']]
                  : [['todas', 'Todas'], ['enviadas', 'Enviadas'], ['recibidas', 'Recibidas']]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`hist-tab-btn ${tabActiva === key ? 'active' : ''}`}
                    onClick={() => cambiarFiltro(setTabActiva, key)}
                  >
                    <span>{label}</span>
                    <span className="hist-tab-counter">{conteos[key]}</span>
                  </button>
                ))}
              </div>

              <div className="hist-filters-actions">
                <div className="hist-search-box">
                  <span className="hist-search-icon">
                    <img src="/src/assets/iconos_sidenavbar/busqueda.png" alt="" />
                  </span>
                  <input
                    type="search"
                    className="hist-search-input"
                    placeholder="Buscar folio o institución..."
                    value={busqueda}
                    onChange={(event) => cambiarFiltro(setBusqueda, event.target.value)}
                  />
                </div>

                <div className="hist-custom-select-wrapper">
                  <span className="hist-select-icon">
                    <img src="/src/assets/iconos_historico/calendario.png" alt="" />
                  </span>
                  <select
                    className="hist-select-filter with-icon"
                    value={filtroFecha}
                    onChange={(event) => cambiarFiltro(setFiltroFecha, event.target.value)}
                    aria-label="Filtrar por periodo"
                  >
                    <option value="ultimos_20">Últimos 20 días</option>
                    <option value="mes_actual">Este mes</option>
                    <option value="mes_anterior">Mes anterior</option>
                    <option value="todo_ano">Año en curso</option>
                  </select>
                </div>

                <div className="hist-custom-select-wrapper">
                  <select
                    className="hist-select-filter"
                    value={filtroEstado}
                    onChange={(event) => cambiarFiltro(setFiltroEstado, event.target.value)}
                    aria-label="Filtrar por estado"
                  >
                    <option value="todos">Estado: Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="aceptada">Aceptada</option>
                    <option value="en proceso">En proceso</option>
                    <option value="completada">Completada</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <button type="button" className="hist-btn-export" onClick={handleExportar}>
                  <span className="hist-action-icon">
                    <img src="/src/assets/iconos_historico/descargar.png" alt="" />
                  </span>
                  <span>Exportar</span>
                </button>
              </div>
            </div>

            {errorConsulta && <div className="hist-query-error" role="alert">{errorConsulta}</div>}

            <div className="hist-table-container" aria-busy={cargando}>
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>ID</th><th>TIPO</th><th>INSTITUCIÓN</th><th>PRIORIDAD</th>
                    <th>UNIDADES</th><th>SOLICITADA</th><th>CERRADA</th><th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan="8" className="hist-table-empty-cell">Consultando solicitudes…</td></tr>
                  ) : solicitudes.length > 0 ? solicitudes.map((item) => (
                    <tr key={item.id} className="hist-table-row">
                      <td className="cell-hist-id">{item.id}</td>
                      <td>{renderTipoBadge(item.tipo)}</td>
                      <td className="cell-hist-inst">{item.institucion}</td>
                      <td>{renderPrioridadBadge(item.prioridad)}</td>
                      <td className="cell-hist-units">{item.unidades}</td>
                      <td className="cell-hist-date">{formatDate(item.solicitada)}</td>
                      <td className="cell-hist-date">{formatDate(item.cerrada)}</td>
                      <td>{renderEstadoBadge(item.estado)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="8" className="hist-table-empty-cell">
                        <div className="hist-empty-placeholder">
                          <p className="hist-empty-title">Sin solicitudes para estos filtros</p>
                          <span className="hist-empty-sub">Prueba con otro periodo, estado o término de búsqueda.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="hist-pagination-footer">
              <span>Mostrando {firstResult}–{lastResult} de {total}</span>
              <div className="hist-pagination-controls" aria-label="Paginación del histórico">
                <button
                  type="button"
                  className="hist-pagination-btn"
                  onClick={() => setPaginaActual((page) => Math.max(1, page - 1))}
                  disabled={cargando || paginaActual <= 1}
                  aria-label="Página anterior"
                >‹</button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`hist-pagination-btn ${paginaActual === page ? 'active' : ''}`}
                    onClick={() => setPaginaActual(page)}
                    disabled={cargando}
                    aria-current={paginaActual === page ? 'page' : undefined}
                  >{page}</button>
                ))}
                <button
                  type="button"
                  className="hist-pagination-btn"
                  onClick={() => setPaginaActual((page) => Math.min(totalPaginas, page + 1))}
                  disabled={cargando || paginaActual >= totalPaginas}
                  aria-label="Página siguiente"
                >›</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
