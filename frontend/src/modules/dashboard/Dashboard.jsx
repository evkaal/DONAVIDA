import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import { Sidebar, Navbar } from "../../components/layout";
import {
  getDashboardStats,
  getStockPorTipo,
  getSolicitudesRecientes,
  getAdminResumen,
} from "../../services/dashboardService";

// Dashboard es SOLO dashboard. El cambio de módulo lo resuelve App.jsx:
// cada pantalla se renderiza desde ahí con su propio Sidebar/Navbar.
// (Antes Dashboard renderizaba otros módulos sin props, lo que
// duplicaba el Sidebar y mostraba un usuario falso en el Navbar.)
export default function Dashboard({ usuario, onLogout, onCambiarModulo }) {
  const [stockTipos, setStockTipos] = useState([]);
  const [solicitudesRecientes, setSolicitudesRecientes] = useState([]);
  const [stats, setStats] = useState({
    totalUnidades: 0,
    proximasCaducar: 0,
    solicitudesPendientes: 0,
    nivelesCriticos: 0,
  });
  const [adminResumen, setAdminResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actividadReciente] = useState([]);

  // Validación basada estrictamente en el rol_id devuelto por la base de datos y el JWT
  const esAdminGen = usuario?.rol_id === 1;
  const esAdmin = esAdminGen || usuario?.rol_id === 2;

  useEffect(() => {
    const cargarDatosDashboard = async () => {
      try {
        if (esAdminGen) {
          // Vista de dueño/desarrollador: totales del sistema, no de una institución.
          const resumen = await getAdminResumen();
          if (resumen) setAdminResumen(resumen);
        }
        const statsData = await getDashboardStats();
        if (statsData) setStats(statsData);

        const stockData = await getStockPorTipo();
        setStockTipos(stockData || []);

        const solicitudesData = await getSolicitudesRecientes();
        setSolicitudesRecientes(solicitudesData || []);
      } catch (err) {
        console.error("Error al cargar los datos del dashboard:", err);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const irA = (modulo) => {
    if (onCambiarModulo) onCambiarModulo(modulo);
  };

  const kpi = (titulo, icono, alt, valor, subtexto, badgeClass) => (
    <div className="dash-kpi-card">
      <div className="dash-kpi-top">
        <span className="dash-kpi-title">{titulo}</span>
        <div className={`dash-kpi-icon-badge ${badgeClass}`}>
          <img src={icono} alt={alt} className="dash-nav-icon-img" />
        </div>
      </div>
      <div className="dash-kpi-value-area">
        <h3 className="dash-kpi-number">{valor}</h3>
      </div>
      <div className="dash-kpi-footer">
        <span className="dash-kpi-subtext-muted">{subtexto}</span>
      </div>
    </div>
  );

  const totalesAdmin = adminResumen?.totales || {};
  const institucionesAdmin = adminResumen?.instituciones || [];

  return (
    <div className="dona-page-wrapper dash-wrapper">
      <Sidebar
        usuario={usuario}
        moduloActivo="dashboard"
        onCambiarModulo={irA}
        onLogout={onLogout}
      />

      <div className="dona-main-area dash-main-area">
        <Navbar usuario={usuario} />

        <main className="dona-content-body dash-content-body">
          {/* VISTA PRINCIPAL DEL DASHBOARD */}
          <section className="dash-page-header">
            <div className="dash-title-group">
              <h1>Dashboard</h1>
              <p>
                {esAdminGen
                  ? "Resumen general del sistema DONAVIDA"
                  : "Resumen operativo de hemocomponentes"}
              </p>
            </div>

            <div className="dash-header-actions">
              {esAdmin ? (
                <button
                  type="button"
                  className="dash-btn-primary"
                  onClick={() => irA("usuarios")}
                >
                  <span className="dash-action-icon">
                    <img
                      src="/assets/iconos_dash/agregar-usuario.png"
                      alt="Gestión de usuarios"
                      className="dash-nav-icon-img"
                    />
                  </span>
                  <span>Registrar usuario</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="dash-btn-secondary"
                    onClick={() => irA("registro")}
                  >
                    <span className="dash-action-icon">
                      <img
                        src="/assets/iconos_dash/agregar.png"
                        alt="Registrar unidad"
                        className="dash-nav-icon-img"
                      />
                    </span>
                    <span>Registrar unidad</span>
                  </button>

                  <button
                    type="button"
                    className="dash-btn-primary"
                    onClick={() => irA("solicitud")}
                  >
                    <span className="dash-action-icon">
                      <img
                        src="/assets/iconos_dash/avion-de-papel2.png"
                        alt="Nueva solicitud"
                        className="dash-nav-icon-img"
                      />
                    </span>
                    <span>Nueva solicitud</span>
                  </button>
                </>
              )}
            </div>
          </section>

          {/* TARJETAS KPI */}
          <section className="dash-kpi-grid">
            {esAdminGen ? (
              <>
                {kpi("Instituciones registradas", "/assets/iconos_registroU/edificio.png", "Instituciones", totalesAdmin.instituciones ?? 0, "Hospitales y bancos de sangre", "badge-blue-subtle")}
                {kpi("Usuarios registrados", "/assets/iconos_dash/usuarios.png", "Usuarios registrados", totalesAdmin.usuarios ?? 0, "Total en el sistema", "badge-blue-subtle")}
                {kpi("Unidades disponibles", "/assets/iconos_dash/sangre.png", "Unidades disponibles", totalesAdmin.unidadesDisponibles ?? 0, "En toda la red", "badge-red-subtle")}
                {kpi("Solicitudes pendientes", "/assets/iconos_dash/bandeja.png", "Solicitudes pendientes", totalesAdmin.solicitudesPendientes ?? 0, "En toda la red", "badge-orange-subtle")}
              </>
            ) : esAdmin ? (
              <>
                {kpi("Stock total", "/assets/iconos_dash/sangre.png", "Stock total", stats.totalUnidades || 0, "Unidades en inventario", "badge-red-subtle")}
                {kpi("Próximas a caducar", "/assets/iconos_dash/reloj.png", "Próximas a caducar", stats.proximasCaducar || 0, "Próximos 7 días", "badge-orange-subtle")}
                {kpi("Tipos en nivel crítico", "/assets/iconos_dash/advertencia.png", "Tipos en nivel crítico", stats.nivelesCriticos || 0, "Tipos sanguíneos ≤ 10 unidades", "badge-crimson-subtle")}
                {kpi("Solicitudes pendientes", "/assets/iconos_dash/bandeja.png", "Solicitudes pendientes", stats.solicitudesPendientes || 0, "Urgentes por atender", "badge-blue-subtle")}
              </>
            ) : (
              <>
                {kpi("Unidades disponibles", "/assets/iconos_dash/sangre.png", "Unidades disponibles", stats.totalUnidades || 0, "Inventario actual", "badge-red-subtle")}
                {kpi("Próximas a caducar", "/assets/iconos_dash/reloj.png", "Próximas a caducar", stats.proximasCaducar || 0, "Próximos 7 días", "badge-orange-subtle")}
                {kpi("Solicitudes pendientes", "/assets/iconos_dash/bandeja.png", "Solicitudes pendientes", stats.solicitudesPendientes || 0, "Urgentes por atender", "badge-blue-subtle")}
                {kpi("Niveles críticos", "/assets/iconos_dash/advertencia.png", "Niveles críticos", stats.nivelesCriticos || 0, "Bajo umbral mínimo", "badge-crimson-subtle")}
              </>
            )}
          </section>

          {/* SECCIÓN CENTRAL: GRÁFICA Y COLUMNA DERECHA */}
          <section className="dash-middle-grid">
            <div className="dash-card">
              <div className="dash-card-header">
                <div>
                  <h2 className="dash-card-title">Stock por tipo sanguíneo</h2>
                  <p className="dash-card-subtitle">Unidades disponibles hoy</p>
                </div>
                <div className="dash-chart-legend">
                  <span>
                    <span className="legend-dot normal"></span>Normal
                  </span>
                  <span>
                    <span className="legend-dot critico"></span>Crítico (≤ 10)
                  </span>
                </div>
              </div>

              <div className="dash-chart-body-container" style={{ padding: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    height: "140px",
                    paddingBottom: "10px",
                  }}
                >
                  {stockTipos.length === 0 ? (
                    <div style={{ width: "100%", textAlign: "center", color: "#64748b", alignSelf: "center" }}>
                      Cargando stock o sin registros disponibles...
                    </div>
                  ) : (
                    stockTipos.map((item, index) => {
                      const esCritico = item.cantidad <= 10;
                      const alturaBarra = Math.min(item.cantidad * 3, 100);
                      return (
                        <div key={`${item.tipo}-${index}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: "600", marginBottom: "4px", color: "#64748b" }}>
                            {item.cantidad}
                          </span>
                          <div style={{ width: "100%", maxWidth: "36px", height: "90px", backgroundColor: "#f1f5f9", borderRadius: "6px", display: "flex", alignItems: "flex-end" }}>
                            <div style={{ width: "100%", height: `${alturaBarra}%`, backgroundColor: esCritico ? "#dc2626" : "#22c55e", borderRadius: "6px", transition: "height 0.3s" }}></div>
                          </div>
                          <span style={{ fontSize: "0.85rem", fontWeight: "700", marginTop: "8px", color: "#1e293b" }}>
                            {item.tipo}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {esAdminGen ? (
              <div className="dash-card">
                <div className="dash-card-header">
                  <div>
                    <h2 className="dash-card-title">Instituciones</h2>
                    <p className="dash-card-subtitle">Usuarios, unidades y solicitudes por institución</p>
                  </div>
                  <button type="button" className="dash-card-link" onClick={() => irA("usuarios")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    Ver usuarios
                  </button>
                </div>
                <div className="dash-requests-body" style={{ padding: "8px 0" }}>
                  {cargando && institucionesAdmin.length === 0 ? (
                    <span style={{ color: "#64748b", fontSize: "0.9rem" }}>Cargando instituciones...</span>
                  ) : institucionesAdmin.length === 0 ? (
                    <span style={{ color: "#64748b", fontSize: "0.9rem" }}>No hay instituciones registradas.</span>
                  ) : (
                    institucionesAdmin.map((inst) => (
                      <div key={inst.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div>
                          <h4 style={{ margin: "0 0 2px 0", fontSize: "0.95rem", color: "#1e293b", fontWeight: "600" }}>{inst.nombre}</h4>
                          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                            {inst.usuarios} usuarios · {inst.unidadesDisponibles} unidades disponibles
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", backgroundColor: inst.solicitudesPendientes > 0 ? "#fef3c7" : "#dcfce7", color: inst.solicitudesPendientes > 0 ? "#b45309" : "#15803d", padding: "4px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", gap: "6px" }}>
                          {inst.solicitudesPendientes} pendientes
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="dash-card">
                <div className="dash-card-header">
                  <div>
                    <h2 className="dash-card-title">Solicitudes recientes</h2>
                  </div>
                  <button type="button" className="dash-card-link" onClick={() => irA("historico")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    Ver todas
                  </button>
                </div>

                <div className="dash-requests-body" style={{ padding: "8px 0" }}>
                  {solicitudesRecientes.length === 0 ? (
                    <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                      No hay solicitudes recientes registradas.
                    </span>
                  ) : (
                    solicitudesRecientes.map((sol, index) => {
                      const estadoLower = (sol.estado || "").toLowerCase();
                      let badgeBg = "#dcfce7";
                      let badgeColor = "#15803d";
                      let dotColor = "#22c55e";

                      if (estadoLower.includes("urgente")) {
                        badgeBg = "#fee2e2";
                        badgeColor = "#991b1b";
                        dotColor = "#dc2626";
                      } else if (estadoLower.includes("pendiente")) {
                        badgeBg = "#fef3c7";
                        badgeColor = "#b45309";
                        dotColor = "#d97706";
                      }

                      return (
                        <div key={`${sol.id}-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ width: "48px", height: "48px", backgroundColor: "#fdf2f2", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "#991b1b", fontSize: "1rem", flexShrink: 0 }}>
                              {sol.tipoSangre}
                            </div>
                            <div>
                              <h4 style={{ margin: "0 0 2px 0", fontSize: "0.95rem", color: "#1e293b", fontWeight: "600" }}>{sol.institucion}</h4>
                              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                                SOL-{sol.id} · {sol.unidades} unidades
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", backgroundColor: badgeBg, color: badgeColor, padding: "4px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", gap: "6px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: dotColor }}></span>
                            {sol.estado}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ACTIVIDAD RECIENTE (TABLA) */}
          <section className="dash-card">
            <div className="dash-table-blank-body">
              <div className="dash-activity-section" style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginTop: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem", color: "#1e293b", fontWeight: "700" }}>
                      Actividad reciente
                    </h3>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      Trazabilidad de operaciones: responsable, fecha, hora y folio
                    </span>
                  </div>
                  <button type="button" onClick={() => irA("historico")} style={{ fontSize: "0.85rem", color: "#991b1b", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}>
                    Ver bitácora
                  </button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #f1f5f9", color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <th style={{ padding: "10px 12px", fontWeight: "600" }}>Folio</th>
                        <th style={{ padding: "10px 12px", fontWeight: "600" }}>Operación</th>
                        <th style={{ padding: "10px 12px", fontWeight: "600" }}>Responsable</th>
                        <th style={{ padding: "10px 12px", fontWeight: "600" }}>Fecha y hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actividadReciente.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: "center", padding: "24px", color: "#64748b", fontSize: "0.9rem" }}>
                            No hay actividad reciente registrada.
                          </td>
                        </tr>
                      ) : (
                        actividadReciente.map((item, index) => (
                          <tr key={`${item.id || item.folio}-${index}`} style={{ borderBottom: "1px solid #f8fafc" }}>
                            <td style={{ padding: "12px", fontWeight: "600", color: "#991b1b" }}>{item.folio}</td>
                            <td style={{ padding: "12px", color: "#1e293b", fontWeight: "500" }}>{item.operacion}</td>
                            <td style={{ padding: "12px", color: "#64748b" }}>{item.responsable}</td>
                            <td style={{ padding: "12px", color: "#64748b", fontSize: "0.85rem" }}>{item.fechaHora}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
