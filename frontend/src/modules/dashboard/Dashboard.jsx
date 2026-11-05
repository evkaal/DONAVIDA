import React, { useState, useEffect } from "react";
import {
  getDashboardStats,
  getStockPorTipo,
  getSolicitudesRecientes,
} from "../../services/dashboardService";
import "./Dashboard.css";

export default function Dashboard({ usuario, onLogout, onCambiarModulo }) {
  // Estado para la opción seleccionada del menú lateral
  const [moduloActivo, setModuloActivo] = useState("dashboard");

  // Estado para almacenar las métricas reales que vienen de Go
  const [stats, setStats] = useState({
    unidades_disponibles: 0,
    proximas_caducar: 0,
    solicitudes_pendientes: 0,
    niveles_criticos: 0,
  });
  const [cargando, setCargando] = useState(true);

  const [stockTipos, setStockTipos] = useState([]);
  const [solicitudesRecientes, setSolicitudesRecientes] = useState([]);

  const [actividadReciente] = useState([]);

  // Petición al backend al cargar el componente
  useEffect(() => {
    const cargarDatosDashboard = async () => {
      try {
        const statsData = await getDashboardStats();
        setStats(statsData);

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

  const esAdmin =
    usuario?.rol === "admin" ||
    (typeof usuario === "string" && usuario.includes("admin"));
  const rol = esAdmin ? "admin" : "medico";
  const nombreUsuario =
    usuario?.nombre || (esAdmin ? "Admin DONAVIDA" : "Personal Médico");
  const institucionUsuario =
    usuario?.institucion ||
    (esAdmin ? "Administrador · Sistema" : "Hospital General");
  const avatarIniciales = esAdmin
    ? "AD"
    : usuario?.correo
      ? usuario.correo.substring(0, 2).toUpperCase()
      : "PM";

  // =========================================================================
  // PROPUESTA DE INTEGRACIÓN PARA EL BACKEND (Go / REST API):
  //
  // 1. Métricas de tarjetas (KPIs):
  //    Endpoint sugerido: GET /api/dashboard/kpis
  //    Payload esperado:
  //    {
  //      unidadesDisponibles: 0,
  //      proximasCaducar: 0,
  //      solicitudesPendientes: 0,
  //      nivelesCriticos: 0
  //    }
  //
  // 2. Gráfica de stock por tipo sanguíneo:
  //    Endpoint sugerido: GET /api/dashboard/stock-tipos
  //    Payload esperado:
  //    [
  //      { tipo: 'A+', cantidad: 0, esCritico: false },
  //      { tipo: 'A-', cantidad: 0, esCritico: false },
  //      { tipo: 'B+', cantidad: 0, esCritico: false },
  //      { tipo: 'B-', cantidad: 0, esCritico: true },
  //      { tipo: 'AB+', cantidad: 0, esCritico: false },
  //      { tipo: 'AB-', cantidad: 0, esCritico: true },
  //      { tipo: 'O+', cantidad: 0, esCritico: false },
  //      { tipo: 'O-', cantidad: 0, esCritico: true }
  //    ]
  //
  // 3. Solicitudes recientes:
  //    Endpoint sugerido: GET /api/solicitudes/recientes?limit=5
  //    Payload esperado:
  //    [
  //      { id: 'SOL-0148', tipoSangre: 'A+', institucion: 'Hospital General', unidades: 4, estado: 'Urgente' }
  //    ]
  //
  // 4. Actividad reciente / Bitácora:
  //    Endpoint sugerido: GET /api/bitacora/reciente?limit=5
  //    Payload esperado:
  //    [
  //      { folio: 'UN-2031', operacion: 'Entrada', responsable: 'Raúl Méndez', fechaHora: '2026-10-18 09:42' }
  //    ]
  // =========================================================================

  return (
    <div className="dash-wrapper">
      <aside className="dash-sidebar">
        <div className="dash-sidebar-top">
          <div className="dash-brand-container">
            <img
              src="/src/assets/donavida_logo2.png"
              alt="DONAVIDA"
              className="dash-brand-logo-img"
            />
          </div>

          <div className="dash-nav-section-title">MÓDULOS</div>

          {/* Menú de navegación dinámico según el rol */}
          <ul className="dash-nav-list">
            {/* Dashboard (Común para Médico y Admin) */}
            <li className="dash-nav-item">
              <button
                type="button"
                className={`dash-nav-link ${moduloActivo === "dashboard" ? "active" : ""}`}
                onClick={() => setModuloActivo("dashboard")}
              >
                <span className="dash-nav-icon">
                  <img
                    src="/src/assets/iconos_dash/panel-de-control.png"
                    alt="Dashboard"
                    className="dash-nav-icon-img"
                  />
                </span>
                <span className="dash-nav-text">Dashboard</span>
              </button>
            </li>

            {/* Registro de unidades (Solo Médico) */}
            {!esAdmin && (
              <li className="dash-nav-item">
                <button
                  type="button"
                  className={`dash-nav-link ${moduloActivo === "registro" ? "active" : ""}`}
                  onClick={() => setModuloActivo("registro")}
                >
                  <span className="dash-nav-icon">
                    <img
                      src="/src/assets/iconos_dash/aplicaciones-anadir.png"
                      alt="Registro de unidades"
                      className="dash-nav-icon-img"
                    />
                  </span>
                  <span className="dash-nav-text">Registro de unidades</span>
                </button>
              </li>
            )}

            {/* Stock de inventario (Común para Médico y Admin) */}
            <li className="dash-nav-item">
              <button
                type="button"
                className={`dash-nav-link ${moduloActivo === "stock" ? "active" : ""}`}
                onClick={() => setModuloActivo("stock")}
              >
                <span className="dash-nav-icon">
                  <img
                    src="/src/assets/iconos_dash/caja-alt.png"
                    alt="Stock de inventario"
                    className="dash-nav-icon-img"
                  />
                </span>
                <span className="dash-nav-text">Stock de inventario</span>
              </button>
            </li>

            {/* Histórico (Común para Médico y Admin) */}
            <li className="dash-nav-item">
              <button
                type="button"
                className={`dash-nav-link ${moduloActivo === "historico" ? "active" : ""}`}
                onClick={() => setModuloActivo("historico")}
              >
                <span className="dash-nav-icon">
                  <img
                    src="/src/assets/iconos_dash/reloj-tres.png"
                    alt="Histórico"
                    className="dash-nav-icon-img"
                  />
                </span>
                <span className="dash-nav-text">Histórico</span>
              </button>
            </li>

            {/* Solicitud de unidades (Solo Médico) */}
            {!esAdmin && (
              <li className="dash-nav-item">
                <button
                  type="button"
                  className={`dash-nav-link ${moduloActivo === "solicitud" ? "active" : ""}`}
                  onClick={() => setModuloActivo("solicitud")}
                >
                  <span className="dash-nav-icon">
                    <img
                      src="/src/assets/iconos_dash/avion-de-papel.png"
                      alt="Solicitud de unidades"
                      className="dash-nav-icon-img"
                    />
                  </span>
                  <span className="dash-nav-text">Solicitud de unidades</span>
                </button>
              </li>
            )}

            {/* Solicitudes entrantes (Solo Médico) */}
            {!esAdmin && (
              <li className="dash-nav-item">
                <button
                  type="button"
                  className={`dash-nav-link ${moduloActivo === "entrantes" ? "active" : ""}`}
                  onClick={() => setModuloActivo("entrantes")}
                >
                  <span className="dash-nav-icon">
                    <img
                      src="/src/assets/iconos_dash/bandeja-de-entrada.png"
                      alt="Solicitudes entrantes"
                      className="dash-nav-icon-img"
                    />
                  </span>
                  <span className="dash-nav-text">Solicitudes entrantes</span>
                </button>
              </li>
            )}
          </ul>

          {/* SECCIÓN ADMINISTRACIÓN (Solo visible para rol Admin) */}
          {esAdmin && (
            <div style={{ marginTop: "1.25rem" }}>
              <div className="dash-nav-section-title">ADMINISTRACIÓN</div>
              <ul className="dash-nav-list">
                <li className="dash-nav-item">
                  <button
                    type="button"
                    className={`dash-nav-link ${moduloActivo === "usuarios" ? "active" : ""}`}
                    onClick={() => onCambiarModulo("usuarios")}
                  >
                    <span className="dash-nav-icon dash-user-mgmt-icon">
                      <img
                        src="/src/assets/iconos_dash/usuarios-alt.png"
                        alt="Gestión de usuarios"
                        className="dash-nav-icon-img"
                      />
                    </span>
                    <span className="dash-nav-text">Gestión de usuarios</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* CERRAR SESIÓN AL PIE DEL SIDEBAR */}
        <div className="dash-sidebar-bottom">
          <button type="button" className="dash-btn-logout" onClick={onLogout}>
            <span className="dash-logout-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL*/}
      <div className="dash-main-area">
        <header className="dash-topbar">
          <div className="dash-search-wrapper">
            <span className="dash-search-icon">
              <img
                src="/src/assets/iconos_dash/busqueda.png"
                alt="Buscar"
                className="dash-search-icon-img"
              />
            </span>
            <input
              type="text"
              className="dash-search-input"
              placeholder="Buscar unidad, folio o solicitud..."
            />
          </div>

          <div className="dash-topbar-actions">
            <button
              type="button"
              className="dash-notif-btn"
              title="Notificaciones"
            >
              <img
                src="/src/assets/iconos_dash/campana.png"
                alt="Notificaciones"
                className="dash-nav-icon-img"
              />
            </button>

            {/* Perfil de usuario */}
            <div className="dash-user-profile">
              <div className="dash-user-avatar">
                <span>{avatarIniciales}</span>
              </div>
              <div className="dash-user-info">
                <span className="dash-user-name">{nombreUsuario}</span>
                <span className="dash-user-role">{institucionUsuario}</span>
              </div>
              {/* Flecha dropdown */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2.5"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </header>

        <main className="dash-content-body">
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
                    <button type="button" className="dash-btn-secondary">
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

            {/* 3. TARJETAS KPI — Condicionales por rol
            - Médico: Unidades disponibles · Próximas a caducar
                      Solicitudes pendientes · Niveles críticos
            - Admin:  Stock total · Próximas a caducar
                      Tipos en nivel crítico · Usuarios registrados
            El admin no ve solicitudes porque no tiene ese módulo.*/}
            <section className="dash-kpi-grid">
              {esAdmin ? (
                /* ---- KPIs DEL ADMINISTRADOR ---- */
                <>
                  {/* KPI A1: Stock total de unidades
                      [BACKEND] GET /api/dashboard/admin/kpis
                      Campo esperado: { stockTotal: 0 } */}
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
                      {/* [BACKEND] Reemplazar 0 con stockTotal del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Unidades en inventario
                      </span>
                    </div>
                  </div>

                  {/* KPI A2: Unidades próximas a caducar
                      [BACKEND] GET /api/dashboard/admin/kpis
                      Campo esperado: { proximasCaducar: 0 } */}
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
                      {/* [BACKEND] Reemplazar 0 con proximasCaducar del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Próximos 7 días
                      </span>
                    </div>
                  </div>

                  {/* KPI A3: Tipos sanguíneos en nivel crítico (≤ 10 unidades)
                      [BACKEND] GET /api/dashboard/admin/kpis
                      Campo esperado: { tiposCriticos: 0 } */}
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
                      {/* [BACKEND] Reemplazar 0 con tiposCriticos del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Tipos sanguíneos ≤ 10 unidades
                      </span>
                    </div>
                  </div>

                  {/* KPI A4: Usuarios registrados en el sistema
                      [BACKEND] GET /api/dashboard/admin/kpis
                      Campo esperado: { totalUsuarios: 0 } */}
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
                      {/* [BACKEND] Reemplazar 0 con totalUsuarios del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Total en el sistema
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* ---- KPIs DEL MÉDICO ---- */
                <>
                  {/* KPI M1: Unidades disponibles
                      [BACKEND] GET /api/dashboard/medico/kpis
                      Campo esperado: { unidadesDisponibles: 0 } */}
                  {/* KPI M1: Unidades disponibles */}
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
                        {cargando ? "..." : stats.unidades_disponibles}
                      </h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Inventario actual
                      </span>
                    </div>
                  </div>

                  {/* KPI M2: Próximas a caducar */}
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
                      <h3 className="dash-kpi-number">
                        {cargando ? "..." : stats.proximas_caducar}
                      </h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Próximos 7 días
                      </span>
                    </div>
                  </div>

                  {/* KPI M3: Solicitudes pendientes */}
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
                        {cargando ? "..." : stats.solicitudes_pendientes}
                      </h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">
                        Urgentes por atender
                      </span>
                    </div>
                  </div>

                  {/* KPI M4: Niveles críticos */}
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
                      <h3 className="dash-kpi-number">
                        {cargando ? "..." : stats.niveles_criticos}
                      </h3>
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

            {/* =========================================================
            4. SECCIÓN CENTRAL: GRÁFICA + COLUMNA DERECHA (por rol)
            - Ambos roles ven la gráfica de stock por tipo sanguíneo
            - Médico: columna derecha: Solicitudes recientes
            - Admin: columna derecha: Últimos usuarios registrados
            ========================================================= */}
            <section className="dash-middle-grid">
              {/* Columna Izquierda: Gráfica de Stock (común para ambos roles) */}
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

                {/* [BACKEND / FRONTEND]: APARTADO PARA LA GRÁFICA
                Aquí se inserta el componente de la gráfica de barras
                (ej: Chart.js, Recharts, ApexCharts o barras personalizadas)
                Endpoint: GET /api/dashboard/stock-tipos
                Payload:  [{ tipo: 'A+', cantidad: 0, esCritico: false }, ...] */}
                <div
                  className="dash-stock-container"
                  style={{ padding: "16px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      height: "180px",
                      borderBottom: "2px solid #e2e8f0",
                      paddingBottom: "8px",
                      gap: "12px",
                    }}
                  >
                    {stockTipos.map((item, index) => {
                      // Determinamos si es crítico (<= 10 unidades) según la regla de negocio del diseño
                      const esCritico = item.cantidad <= 10;
                      // Calculamos una altura proporcional para la barra (máximo 120px de alto visual)
                      const alturaPx = Math.min(
                        Math.max(item.cantidad * 2, 15),
                        120,
                      );

                      return (
                        <div
                          key={`${item.tipo}-${index}`}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flex: 1,
                            height: "100%",
                            justifyContent: "flex-end",
                          }}
                        >
                          {/* Número de unidades arriba de la barra */}
                          <span
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                              marginBottom: "6px",
                              color: esCritico ? "#991b1b" : "#334155",
                            }}
                          >
                            {item.cantidad}
                          </span>

                          {/* Barra vertical */}
                          <div
                            style={{
                              width: "100%",
                              maxWidth: "36px",
                              height: `${alturaPx}px`,
                              backgroundColor: esCritico
                                ? "#dc2626"
                                : "#fbcfe8", // Rojo intenso si es crítico, rosa claro si es normal
                              borderTopLeftRadius: "6px",
                              borderTopRightRadius: "6px",
                              transition: "height 0.3s ease",
                            }}
                          />

                          {/* Etiqueta del tipo sanguíneo abajo */}
                          <span
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              marginTop: "8px",
                              color: "#64748b",
                            }}
                          >
                            {item.tipo}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Columna Derecha — condicional por rol */}
              {esAdmin ? (
                /* ADMIN: Últimos usuarios registrados
                   [BACKEND] GET /api/dashboard/admin/usuarios-recientes?limit=5
                   Payload: [{ nombre, rol, institucion, fechaRegistro }] */
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
                  {/* [BACKEND / FRONTEND]: APARTADO PARA USUARIOS RECIENTES
                  Aquí se mapea el listado obtenido del endpoint:
                  GET /api/dashboard/admin/usuarios-recientes */}
                  <div className="dash-requests-blank-body">
                    <span>
                      [ESPACIO RESERVADO: Aquí se mapean las filas de Últimos
                      Usuarios Registrados]
                    </span>
                  </div>
                </div>
              ) : (
                /* MÉDICO: Solicitudes recientes
                   [BACKEND] GET /api/solicitudes/recientes?limit=5
                   Payload: [{ id, tipoSangre, institucion, unidades, estado }] */
                <div className="dash-card">
                  <div className="dash-card-header">
                    <div>
                      <h2 className="dash-card-title">Solicitudes recientes</h2>
                    </div>
                    <a href="#solicitudes" className="dash-card-link">
                      Ver todas
                    </a>
                  </div>
                  {/* [BACKEND / FRONTEND]: APARTADO PARA SOLICITUDES RECIENTES
                  Aquí se mapea el listado obtenido del endpoint:
                  GET /api/solicitudes/recientes */}
                  <div
                    className="dash-requests-container"
                    style={{ padding: "8px 0" }}
                  >
                    {solicitudesRecientes.length === 0 ? (
                      <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                        No hay solicitudes recientes registradas.
                      </span>
                    ) : (
                      solicitudesRecientes.map((sol, index) => {
                        // Determinamos los colores del badge según el estado
                        const estadoLower = (sol.estado || "").toLowerCase();
                        let badgeBg = "#dcfce7"; // Verde (Atendida)
                        let badgeColor = "#15803d";
                        let dotColor = "#22c55e";

                        if (estadoLower.includes("urgente")) {
                          badgeBg = "#fee2e2"; // Rojo suave
                          badgeColor = "#991b1b";
                          dotColor = "#dc2626";
                        } else if (estadoLower.includes("pendiente")) {
                          badgeBg = "#fef3c7"; // Amarillo / Naranja suave
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
                              {/* Cuadro indicador del tipo sanguíneo */}
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

                              {/* Información principal de la solicitud */}
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

                            {/* Etiqueta de Estado con punto indicador */}
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
              {/* CONTENEDOR DE TABLA */}
              <div className="dash-table-blank-body">
                {/* [BACKEND / FRONTEND]: APARTADO PARA FILAS DE BITÁCORA
                  Aquí se mapean las filas de actividad obtenidas de:
                  GET /api/bitacora/reciente */}
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
                  {/* Encabezado de la sección */}
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
                        e.preventDefault(); /* Lógica para navegar a la bitácora completa */
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

                  {/* Tabla de Actividad */}
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
