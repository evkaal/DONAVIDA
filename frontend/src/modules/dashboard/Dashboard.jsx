import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import { Sidebar, Navbar } from "../../components/layout";
import {
  getDashboardStats,
  getStockPorTipo,
  getSolicitudesRecientes,
} from "../../services/dashboardService";

export default function Dashboard({ usuario, onLogout, onCambiarModulo }) {
  // Estado para la opción seleccionada del menú lateral
  const [moduloActivo, setModuloActivo] = useState("dashboard");
  const [stockTipos, setStockTipos] = useState([]);
  const [solicitudesRecientes, setSolicitudesRecientes] = useState([]);
  const [stats, setStats] = useState({
    totalUnidades: 0,
    solicitudesPendientes: 0,
    proximasCaducar: 0,
    nivelesCriticos: 0,
    totalUsuarios: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [actividadReciente] = useState([]);

  // - 'medico': Ve módulos de gestión clínica (Registro, Solicitudes, Stock, etc.)
  // - 'admin': Ve módulos estratégicos (Stock, Histórico y Gestión de usuarios)
  // Detección automática por ID de rol (1: Admin general, 2: Admin institución, 3: Personal médico)
  const rolId = Number(usuario?.rol_id ?? (usuario?.rol === 'admin_gen' ? 1 : usuario?.rol === 'admin_ins' ? 2 : 3));
  const esAdmin =
    rolId === 1 ||
    usuario?.rol === "admin" ||
    usuario?.rol === "admin_gen" ||
    (typeof usuario === "string" && usuario.includes("admin"));
  const rol = esAdmin ? "admin" : "medico";
  const nombreUsuario =
    usuario?.nombre || (rolId === 1 ? "Admin General" : rolId === 2 ? "Admin Institución" : "Personal Médico");
  const institucionUsuario =
    usuario?.institucion ||
    (rolId === 1 ? "Administrador · Sistema" : "Hospital General");
  const avatarIniciales = usuario?.nombre
    ? usuario.nombre.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : esAdmin ? "AD" : "PM";

  useEffect(() => {
    const cargarDatosDashboard = async () => {
      try {
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
  }, []);

  return (
    <div className="dona-page-wrapper dash-wrapper">
      <Sidebar
        usuario={usuario}
        moduloActivo="dashboard"
        onCambiarModulo={onCambiarModulo}
        onLogout={onLogout}
      />

      <div className="dona-main-area dash-main-area">
        <Navbar usuario={usuario} />

        {/* CONTENIDO DEL CUERPO */}
        <main className="dona-content-body dash-content-body">
          <>
            <section className="dash-page-header">
              <div className="dash-title-group">
                <h1>Dashboard</h1>
                <p>Resumen operativo de hemocomponentes</p>
              </div>

              <div className="dash-header-actions">
                {esAdmin ? (
                  /* Botón ir a Gestión de Usuarios */
                  <button
                    type="button"
                    className="dash-btn-primary"
                    onClick={() => onCambiarModulo("usuarios")}
                  >
                    <span className="dash-action-icon">
                      <img
                        src="/src/assets/iconos_dash/agregar-usuario.png"
                        alt="Gestión de usuarios"
                        className="dash-nav-icon-img"
                      />
                    </span>
                    <span>Registrar usuario</span>
                  </button>
                ) : (
                  /* Botones para Personal Médico */
                  <>
                    <button
                      type="button"
                      className="dash-btn-secondary"
                      onClick={() =>
                        onCambiarModulo && onCambiarModulo("registro")
                      }
                    >
                      <span className="dash-action-icon">
                        <img
                          src="/src/assets/iconos_dash/agregar.png"
                          alt="Registrar unidad"
                          className="dash-nav-icon-img"
                        />
                      </span>
                      <span>Registrar unidad</span>
                    </button>

                    <button type="button" className="dash-btn-primary">
                      <span className="dash-action-icon">
                        <img
                          src="/src/assets/iconos_dash/avion-de-papel2.png"
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

            {/* 3. TARJETAS KPI — Condicionales por rol */}
            <section className="dash-kpi-grid">
              {esAdmin ? (
                /* KPIs DEL ADMINISTRADOR */
                <>
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Stock total</span>
                      <div className="dash-kpi-icon-badge badge-red-subtle">
                        <img
                          src="/src/assets/iconos_dash/sangre.png"
                          alt="Stock total"
                          className="dash-nav-icon-img"
                        />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">
                        {stats.totalUnidades || 0}
                      </h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Unidades en inventario
                      </span>
                    </div>
                  </div>

                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Próximas a caducar</span>
                      <div className="dash-kpi-icon-badge badge-orange-subtle">
                        <img
                          src="/src/assets/iconos_dash/reloj.png"
                          alt="Próximas a caducar"
                          className="dash-nav-icon-img"
                        />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">{stats.proximasCaducar ?? 0}</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Próximos 7 días
                      </span>
                    </div>
                  </div>

                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">
                        Tipos en nivel crítico
                      </span>
                      <div className="dash-kpi-icon-badge badge-crimson-subtle">
                        <img
                          src="/src/assets/iconos_dash/advertencia.png"
                          alt="Tipos en nivel crítico"
                          className="dash-nav-icon-img"
                        />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">{stats.nivelesCriticos ?? 0}</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Tipos sanguíneos ≤ 10 unidades
                      </span>
                    </div>
                  </div>

                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">
                        Usuarios registrados
                      </span>
                      <div className="dash-kpi-icon-badge badge-blue-subtle">
                        <img
                          src="/src/assets/iconos_dash/usuarios.png"
                          alt="Usuarios registrados"
                          className="dash-nav-icon-img"
                        />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">{stats.totalUsuarios ?? 0}</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Total en el sistema
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* KPIs DEL MÉDICO */
                <>
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">
                        Unidades disponibles
                      </span>
                      <div className="dash-kpi-icon-badge badge-red-subtle">
                        <img
                          src="/src/assets/iconos_dash/sangre.png"
                          alt="Unidades disponibles"
                          className="dash-nav-icon-img"
                        />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">
                        {stats.totalUnidades || 0}
                      </h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Inventario actual
                      </span>
                    </div>
                  </div>

                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Próximas a caducar</span>
                      <div className="dash-kpi-icon-badge badge-orange-subtle">
                        <img
                          src="/src/assets/iconos_dash/reloj.png"
                          alt="Próximas a caducar"
                          className="dash-nav-icon-img"
                        />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">{stats.proximasCaducar ?? 0}</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Próximos 7 días
                      </span>
                    </div>
                  </div>

                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">
                        Solicitudes pendientes
                      </span>
                      <div className="dash-kpi-icon-badge badge-blue-subtle">
                        <img
                          src="/src/assets/iconos_dash/bandeja.png"
                          alt="Solicitudes pendientes"
                          className="dash-nav-icon-img"
                        />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">
                        {stats.solicitudesPendientes || 0}
                      </h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Urgentes por atender
                      </span>
                    </div>
                  </div>

                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Niveles críticos</span>
                      <div className="dash-kpi-icon-badge badge-crimson-subtle">
                        <img
                          src="/src/assets/iconos_dash/advertencia.png"
                          alt="Niveles críticos"
                          className="dash-nav-icon-img"
                        />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">{stats.nivelesCriticos ?? 0}</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Bajo umbral mínimo
                      </span>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* SECCIÓN CENTRAL: GRÁFICA Y COLUMNA DERECHA */}
            {/* GRÁFICA Y COLUMNA DERECHA */}
            <section className="dash-middle-grid">
              <div className="dash-card">
                <div className="dash-card-header">
                  <div>
                    <h2 className="dash-card-title">
                      Stock por tipo sanguíneo
                    </h2>
                    <p className="dash-card-subtitle">
                      Unidades disponibles hoy
                    </p>
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

                <div
                  className="dash-chart-body-container"
                  style={{ padding: "16px" }}
                >
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
                      <div
                        style={{
                          width: "100%",
                          textAlign: "center",
                          color: "#64748b",
                          alignSelf: "center",
                        }}
                      >
                        Cargando stock o sin registros disponibles...
                      </div>
                    ) : (
                      stockTipos.map((item, index) => {
                        const esCritico = item.cantidad <= 10;
                        const alturaBarra = Math.min(item.cantidad * 3, 100);
                        return (
                          <div
                            key={`${item.tipo}-${index}`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              flex: 1,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                marginBottom: "4px",
                                color: "#64748b",
                              }}
                            >
                              {item.cantidad}
                            </span>
                            <div
                              style={{
                                width: "100%",
                                maxWidth: "36px",
                                height: "90px",
                                backgroundColor: "#f1f5f9",
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "flex-end",
                              }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  height: `${alturaBarra}%`,
                                  backgroundColor: esCritico
                                    ? "#dc2626"
                                    : "#22c55e",
                                  borderRadius: "6px",
                                  transition: "height 0.3s",
                                }}
                              ></div>
                            </div>
                            <span
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: "700",
                                marginTop: "8px",
                                color: "#1e293b",
                              }}
                            >
                              {item.tipo}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {esAdmin ? (
                <div className="dash-card">
                  <div className="dash-card-header">
                    <div>
                      <h2 className="dash-card-title">
                        Últimos usuarios registrados
                      </h2>
                      <p className="dash-card-subtitle">
                        Altas recientes en el sistema
                      </p>
                    </div>
                    <a href="#usuarios" className="dash-card-link">
                      Ver todos
                    </a>
                  </div>
                  <div className="dash-requests-blank-body">
                    <span>
                      [ESPACIO RESERVADO: Aquí se mapean las filas de Últimos
                      Usuarios Registrados]
                    </span>
                  </div>
                </div>
              ) : (
                <div className="dash-card">
                  <div className="dash-card-header">
                    <div>
                      <h2 className="dash-card-title">Solicitudes recientes</h2>
                    </div>
                    <a href="#solicitudes" className="dash-card-link">
                      Ver todas
                    </a>
                  </div>

                  <div
                    className="dash-requests-body"
                    style={{ padding: "8px 0" }}
                  >
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
                          <div
                            key={`${sol.id}-${index}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 0",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                              }}
                            >
                              <div
                                style={{
                                  width: "48px",
                                  height: "48px",
                                  backgroundColor: "#fdf2f2",
                                  borderRadius: "12px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: "700",
                                  color: "#991b1b",
                                  fontSize: "1rem",
                                  flexShrink: 0,
                                }}
                              >
                                {sol.tipoSangre}
                              </div>
                              <div>
                                <h4
                                  style={{
                                    margin: "0 0 2px 0",
                                    fontSize: "0.95rem",
                                    color: "#1e293b",
                                    fontWeight: "600",
                                  }}
                                >
                                  {sol.institucion}
                                </h4>
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "#64748b",
                                  }}
                                >
                                  SOL-{sol.id} · {sol.unidades} unidades
                                </span>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                backgroundColor: badgeBg,
                                color: badgeColor,
                                padding: "4px 12px",
                                borderRadius: "20px",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                gap: "6px",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: dotColor,
                                }}
                              ></span>
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
                <div
                  className="dash-activity-section"
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    marginTop: "24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "1.1rem",
                          color: "#1e293b",
                          fontWeight: "700",
                        }}
                      >
                        Actividad reciente
                      </h3>
                      <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                        Trazabilidad de operaciones: responsable, fecha, hora y
                        folio
                      </span>
                    </div>
                    <a
                      href="#bitacora"
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                      style={{
                        fontSize: "0.85rem",
                        color: "#991b1b",
                        textDecoration: "none",
                        fontWeight: "600",
                      }}
                    >
                      Ver bitácora
                    </a>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        textAlign: "left",
                        fontSize: "0.9rem",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "2px solid #f1f5f9",
                            color: "#64748b",
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          <th
                            style={{ padding: "10px 12px", fontWeight: "600" }}
                          >
                            Folio
                          </th>
                          <th
                            style={{ padding: "10px 12px", fontWeight: "600" }}
                          >
                            Operación
                          </th>
                          <th
                            style={{ padding: "10px 12px", fontWeight: "600" }}
                          >
                            Responsable
                          </th>
                          <th
                            style={{ padding: "10px 12px", fontWeight: "600" }}
                          >
                            Fecha y hora
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {actividadReciente.length === 0 ? (
                          <tr>
                            <td
                              colSpan="4"
                              style={{
                                textAlign: "center",
                                padding: "24px",
                                color: "#64748b",
                                fontSize: "0.9rem",
                              }}
                            >
                              No hay actividad reciente registrada.
                            </td>
                          </tr>
                        ) : (
                          actividadReciente.map((item, index) => (
                            <tr
                              key={`${item.id || item.folio}-${index}`}
                              style={{
                                borderBottom: "1px solid #f8fafc",
                                transition: "background 0.2s",
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px",
                                  fontWeight: "600",
                                  color: "#991b1b",
                                }}
                              >
                                {item.folio}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#1e293b",
                                  fontWeight: "500",
                                }}
                              >
                                {item.operacion}
                              </td>
                              <td style={{ padding: "12px", color: "#64748b" }}>
                                {item.responsable}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#64748b",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {item.fechaHora}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </>
        </main>
      </div>
    </div>
  );
}
