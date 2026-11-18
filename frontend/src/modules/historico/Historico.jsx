import React, { useState, useEffect } from 'react';
import './Historico.css';
import { Sidebar, Navbar } from '../../components/layout';
import { obtenerHistorico } from '../../services/solicitudesService';

/**
 * =========================================================================
 * MÓDULO: HISTÓRICO - DONAVIDA
 * Basado en el diseño oficial de Figma (historico.png)
 *
 * NOTA: Inicializado en 0 / blanco sin datos ficticios de ejemplo para que
 * el desarrollador backend conecte las APIs sin confusiones.
 *
 * PROPUESTA DE INTEGRACIÓN PARA EL DESARROLLADOR BACKEND (Go / REST API):
 *
 * 1. Obtener listado histórico de solicitudes:
 *    Endpoint: GET /api/solicitudes/historico
 *    Query Params sugeridos:
 *      ?tipo=todas|enviadas|recibidas
 *      &busqueda=
 *      &estado=todos|completada|rechazada|cancelada
 *      &fecha_inicio=2026-10-01
 *      &fecha_fin=2026-10-20
 *      &pagina=1
 *      &limite=8
 *
 *    Payload esperado del backend:
 *    {
 *      "total": 0,
 *      "pagina": 1,
 *      "totalPaginas": 1,
 *      "conteos": {
 *        "todas": 0,
 *        "enviadas": 0,
 *        "recibidas": 0
 *      },
 *      "solicitudes": [
 *        {
 *          "id": "SOL-0143",
 *          "tipo": "enviada", // 'enviada' | 'recibida'
 *          "institucion": "Hospital Regional",
 *          "prioridad": "urgente", // 'urgente' | 'normal' | 'critica'
 *          "unidades": 3,
 *          "solicitada": "16 oct · 11:20",
 *          "cerrada": "16 oct · 14:05",
 *          "estado": "completada" // 'completada' | 'rechazada' | 'cancelada'
 *        }
 *      ]
 *    }
 *
 * 2. Exportar histórico a CSV / Excel / PDF:
 *    Endpoint: GET /api/solicitudes/exportar?formato=csv&tipo=...
 * =========================================================================
 */

export default function Historico({ usuario, onCambiarModulo, onLogout }) {
  // Pestaña activa ('todas' | 'enviadas' | 'recibidas')
  const [tabActiva, setTabActiva] = useState('todas');

  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  // 'todas' por defecto: el filtro anterior ("1 – 20 oct 2026") era una
  // etiqueta fija que no filtraba nada y escondía el resto de fechas.
  const [filtroFecha, setFiltroFecha] = useState('todas');

  const [solicitudes, setSolicitudes] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');

  const usuarioSesion = usuario || JSON.parse(localStorage.getItem('usuario') || '{}');
  const esAdminGeneral = usuarioSesion?.rol_id === 1;
  // La institución es solo la de la sesión. Sin fallback: un usuario sin
  // institución no ve el histórico de nadie, ve el aviso.
  const institucionIdSesion = usuarioSesion?.institucion_id ?? null;
  const sinInstitucion = !esAdminGeneral && !institucionIdSesion;

  useEffect(() => {
    const cargarHistorico = async () => {
      if (sinInstitucion) {
        setSolicitudes([]);
        setConteos({ todas: 0, enviadas: 0, recibidas: 0 });
        return;
      }
      try {
        setErrorCarga('');
        // Admin general: sin institución propia -> 0 = todas las solicitudes,
        // con tipo calculado por el tipo de institución solicitante (backend).
        const data = await obtenerHistorico(esAdminGeneral ? 0 : institucionIdSesion);
        const lista = Array.isArray(data?.solicitudes) ? data.solicitudes : [];
        setSolicitudes(lista);
        if (data?.conteos) setConteos(data.conteos);
      } catch (err) {
        console.error("Error al cargar el histórico:", err);
        setErrorCarga(err?.response?.data || err?.message || 'No se pudo cargar el histórico.');
      }
    };
    cargarHistorico();
  }, []);

  // Conteos de las pestañas superiores (inician en 0)
  const [conteos, setConteos] = useState({
    todas: 0,
    enviadas: 0,
    recibidas: 0
  });

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);

  // Filtrado reactivo en front
  // El filtro de fecha usa item.fecha (YYYY-MM-DD, que devuelve el backend).
  const enRangoFecha = (item) => {
    if (filtroFecha === 'todas' || !item.fecha) return true;
    const f = new Date(`${item.fecha}T00:00:00`);
    if (isNaN(f.getTime())) return true;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    switch (filtroFecha) {
      case 'ultimos_30': {
        const hace30 = new Date(hoy);
        hace30.setDate(hoy.getDate() - 29);
        return f >= hace30 && f <= hoy;
      }
      case 'mes_actual':
        return f >= new Date(hoy.getFullYear(), hoy.getMonth(), 1) && f <= hoy;
      case 'mes_anterior':
        return f >= new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1) && f <= new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      case 'ano_actual':
        return f >= new Date(hoy.getFullYear(), 0, 1) && f <= hoy;
      default:
        return true;
    }
  };

  const solicitudesFiltradas = solicitudes.filter((item) => {
    // Filtro por pestaña
    if (tabActiva === 'enviadas' && item.tipo !== 'enviada') return false;
    if (tabActiva === 'recibidas' && item.tipo !== 'recibida') return false;

    // Filtro por fecha
    if (!enRangoFecha(item)) return false;

    // Filtro por texto (ID o Institución)
    if (busqueda.trim() !== '') {
      const matchId = item.id.toLowerCase().includes(busqueda.toLowerCase());
      const matchInst = item.institucion.toLowerCase().includes(busqueda.toLowerCase());
      if (!matchId && !matchInst) return false;
    }

    // Filtro por estado
    if (filtroEstado !== 'todos' && item.estado.toLowerCase() !== filtroEstado.toLowerCase()) {
      return false;
    }

    return true;
  });

  const handleExportar = () => {
    const encabezados = ['ID', 'Tipo', 'Institución', 'Prioridad', 'Unidades', 'Solicitada', 'Cerrada', 'Estado'];
    const filas = solicitudesFiltradas.map((item) => [
      item.id, item.tipo, item.institucion, item.prioridad, item.unidades,
      item.solicitada, item.cerrada, item.estado,
    ]);
    const csv = [encabezados, ...filas]
      .map((fila) => fila.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico-donavida.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  //helpers
  const renderTipoBadge = (tipo) => {
    if (tipo === 'enviada') {
      return (
        <span className="hist-tipo-badge tipo-enviada">
          <span className="hist-dot dot-enviada"></span>
          Enviada
        </span>
      );
    }
    return (
      <span className="hist-tipo-badge tipo-recibida">
        <span className="hist-dot dot-recibida"></span>
        Recibida
      </span>
    );
  };

  const renderPrioridadBadge = (prioridad) => {
    const p = prioridad?.toLowerCase();
    if (p === 'urgente') {
      return (
        <span className="hist-prioridad-badge prioridad-urgente">
          <span className="hist-dot dot-urgente"></span>
          Urgente
        </span>
      );
    }
    if (p === 'critica' || p === 'crítica') {
      return (
        <span className="hist-prioridad-badge prioridad-critica">
          <span className="hist-dot dot-critica"></span>
          Crítica
        </span>
      );
    }
    return (
      <span className="hist-prioridad-badge prioridad-normal">
        <span className="hist-dot dot-normal"></span>
        Normal
      </span>
    );
  };

  const renderEstadoBadge = (estado) => {
    const e = estado?.toLowerCase();
    if (e === 'completada') {
      return (
        <span className="hist-estado-badge estado-completada">
          <span className="hist-dot dot-completada"></span>
          Completada
        </span>
      );
    }
    if (e === 'rechazada') {
      return (
        <span className="hist-estado-badge estado-rechazada">
          <span className="hist-dot dot-rechazada"></span>
          Rechazada
        </span>
      );
    }
    return (
      <span className="hist-estado-badge estado-cancelada">
        <span className="hist-dot dot-cancelada"></span>
        Cancelada
      </span>
    );
  };

  return (
    <div className="dona-page-wrapper">
      <Sidebar
        usuario={usuario}
        moduloActivo="historico"
        onCambiarModulo={onCambiarModulo}
        onLogout={onLogout}
      />

      {/* ÁREA PRINCIPAL*/}
      <div className="dona-main-area">
        <Navbar
          usuario={usuario}
          placeholder="Buscar unidad, folio o solicitud..."
        />

        <main className="dona-content-body hist-content-body">
          <section className="hist-page-header">
            <div className="hist-title-group">
              <h1>Histórico</h1>
              <p>Consulta las solicitudes de unidades enviadas y recibidas por tu institución</p>
            </div>
          </section>

          {/* Aviso cuando el usuario no tiene institución asignada */}
          {sinInstitucion && (
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.95rem' }}>
              <strong>Sin institución asignada.</strong> Pide al administrador general que te asigne una institución.
            </div>
          )}

          {/* Error al cargar desde la API (no se confunde con "no hay solicitudes") */}
          {errorCarga && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.95rem' }}>
              <strong>Error al cargar el histórico:</strong> {String(errorCarga)}
            </div>
          )}

          {/* TARJETA PRINCIPAL: PESTAÑAS, FILTROS Y TABLA*/}
          <section className="hist-table-card">
            <div className="hist-toolbar-header">
              {/* Pestañas de filtrado por dirección de solicitud */}
              <div className="hist-tabs-group">
                <button
                  type="button"
                  className={`hist-tab-btn ${tabActiva === 'todas' ? 'active' : ''}`}
                  onClick={() => setTabActiva('todas')}
                >
                  <span>Todas</span>
                  <span className="hist-tab-counter">{conteos.todas}</span>
                </button>

                <button
                  type="button"
                  className={`hist-tab-btn ${tabActiva === 'enviadas' ? 'active' : ''}`}
                  onClick={() => setTabActiva('enviadas')}
                >
                  <span>Enviadas</span>
                  <span className="hist-tab-counter">{conteos.enviadas}</span>
                </button>

                <button
                  type="button"
                  className={`hist-tab-btn ${tabActiva === 'recibidas' ? 'active' : ''}`}
                  onClick={() => setTabActiva('recibidas')}
                >
                  <span>Recibidas</span>
                  <span className="hist-tab-counter">{conteos.recibidas}</span>
                </button>
              </div>

              <div className="hist-filters-actions">
                {/* Buscador de folio / institución */}
                <div className="hist-search-box">
                  <span className="hist-search-icon">
                    <img src="/assets/iconos_sidenavbar/busqueda.png" alt="" />
                  </span>
                  <input
                    type="text"
                    className="hist-search-input"
                    placeholder="Buscar folio o institución..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>

                {/* Filtro de Rango de Fechas */}
                <div className="hist-custom-select-wrapper">
                  <span className="hist-select-icon">
                    <img src="/assets/iconos_historico/calendario.png" alt="" />
                  </span>
                  <select
                    className="hist-select-filter with-icon"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                  >
                    <option value="todas">Todas las fechas</option>
                    <option value="ultimos_30">Últimos 30 días</option>
                    <option value="mes_actual">Este mes</option>
                    <option value="mes_anterior">Mes anterior</option>
                    <option value="ano_actual">Año en curso</option>
                  </select>
                </div>

                {/* Filtro de Estado */}
                <div className="hist-custom-select-wrapper">
                  <select
                    className="hist-select-filter"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                  >
                    <option value="todos">Estado: Todos</option>
                    <option value="completada">Completada</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                {/* Botón Exportar */}
                <button
                  type="button"
                  className="hist-btn-export"
                  onClick={handleExportar}
                >
                  <span className="hist-action-icon">
                    <img src="/assets/iconos_historico/descargar.png" alt="" />
                  </span>
                  <span>Exportar</span>
                </button>
              </div>
            </div>

            {/* TABLA DE SOLICITUDES HISTÓRICAS */}
            <div className="hist-table-container">
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>TIPO</th>
                    <th>INSTITUCIÓN</th>
                    <th>PRIORIDAD</th>
                    <th>UNIDADES</th>
                    <th>SOLICITADA</th>
                    <th>CERRADA</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudesFiltradas.length > 0 ? (
                    solicitudesFiltradas.map((item) => (
                      <tr key={item.id} className="hist-table-row">
                        <td className="cell-hist-id">{item.id}</td>
                        <td>{renderTipoBadge(item.tipo)}</td>
                        <td className="cell-hist-inst">{item.institucion}</td>
                        <td>{renderPrioridadBadge(item.prioridad)}</td>
                        <td className="cell-hist-units">{item.unidades}</td>
                        <td className="cell-hist-date">{item.solicitada}</td>
                        <td className="cell-hist-date">{item.cerrada}</td>
                        <td>{renderEstadoBadge(item.estado)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="hist-table-empty-cell">
                        <div className="hist-empty-placeholder">
                          <p className="hist-empty-title">Sin solicitudes en el histórico (0)</p>
                          <span className="hist-empty-sub">
                            Aún no hay solicitudes registradas.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="hist-pagination-footer">
              <span>
                Mostrando {solicitudesFiltradas.length} de {solicitudes.length}
              </span>
              <div className="hist-pagination-controls">
                <button type="button" className="hist-pagination-btn" disabled>
                  ‹
                </button>
                <button type="button" className="hist-pagination-btn active">
                  1
                </button>
                <button type="button" className="hist-pagination-btn" disabled>
                  ›
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

