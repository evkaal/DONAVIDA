import React, { useState } from 'react';
import './Dashboard.css';

export default function Dashboard({ usuario, onLogout, onCambiarModulo }) {
  // Estado para la opción seleccionada del menú lateral
  const [moduloActivo, setModuloActivo] = useState('dashboard');

  // - 'medico': Ve módulos de gestión clínica (Registro, Solicitudes, Stock, etc.)
  // - 'admin': Ve módulos estratégicos (Stock, Histórico y Gestión de usuarios)
  const esAdmin = usuario?.rol === 'admin' || (typeof usuario === 'string' && usuario.includes('admin'));
  const rol = esAdmin ? 'admin' : 'medico';
  const nombreUsuario = usuario?.nombre || (esAdmin ? 'Admin DONAVIDA' : 'Personal Médico');
  const institucionUsuario = usuario?.institucion || (esAdmin ? 'Administrador · Sistema' : 'Hospital General');
  const avatarIniciales = esAdmin ? 'AD' : (usuario?.correo ? usuario.correo.substring(0, 2).toUpperCase() : 'PM');

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
                className={`dash-nav-link ${moduloActivo === 'dashboard' ? 'active' : ''}`}
                onClick={() => setModuloActivo('dashboard')}
              >
                <span className="dash-nav-icon">
                  <img src="/src/assets/iconos_dash/panel-de-control.png" alt="Dashboard" className="dash-nav-icon-img" />
                </span>
                <span className="dash-nav-text">Dashboard</span>
              </button>
            </li>

            {/* Registro de unidades (Solo Médico) */}
            {!esAdmin && (
              <li className="dash-nav-item">
                <button
                  type="button"
                  className={`dash-nav-link ${moduloActivo === 'registro' ? 'active' : ''}`}
                  onClick={() => setModuloActivo('registro')}
                >
                  <span className="dash-nav-icon">
                    <img src="/src/assets/iconos_dash/aplicaciones-anadir.png" alt="Registro de unidades" className="dash-nav-icon-img" />
                  </span>
                  <span className="dash-nav-text">Registro de unidades</span>
                </button>
              </li>
            )}

            {/* Stock de inventario (Común para Médico y Admin) */}
            <li className="dash-nav-item">
              <button
                type="button"
                className={`dash-nav-link ${moduloActivo === 'stock' ? 'active' : ''}`}
                onClick={() => setModuloActivo('stock')}
              >
                <span className="dash-nav-icon">
                  <img src="/src/assets/iconos_dash/caja-alt.png" alt="Stock de inventario" className="dash-nav-icon-img" />
                </span>
                <span className="dash-nav-text">Stock de inventario</span>
              </button>
            </li>

            {/* Histórico (Común para Médico y Admin) */}
            <li className="dash-nav-item">
              <button
                type="button"
                className={`dash-nav-link ${moduloActivo === 'historico' ? 'active' : ''}`}
                onClick={() => setModuloActivo('historico')}
              >
                <span className="dash-nav-icon">
                  <img src="/src/assets/iconos_dash/reloj-tres.png" alt="Histórico" className="dash-nav-icon-img" />
                </span>
                <span className="dash-nav-text">Histórico</span>
              </button>
            </li>

            {/* Solicitud de unidades (Solo Médico) */}
            {!esAdmin && (
              <li className="dash-nav-item">
                <button
                  type="button"
                  className={`dash-nav-link ${moduloActivo === 'solicitud' ? 'active' : ''}`}
                  onClick={() => setModuloActivo('solicitud')}
                >
                  <span className="dash-nav-icon">
                    <img src="/src/assets/iconos_dash/avion-de-papel.png" alt="Solicitud de unidades" className="dash-nav-icon-img" />
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
                  className={`dash-nav-link ${moduloActivo === 'entrantes' ? 'active' : ''}`}
                  onClick={() => setModuloActivo('entrantes')}
                >
                  <span className="dash-nav-icon">
                    <img src="/src/assets/iconos_dash/bandeja-de-entrada.png" alt="Solicitudes entrantes" className="dash-nav-icon-img" />
                  </span>
                  <span className="dash-nav-text">Solicitudes entrantes</span>
                </button>
              </li>
            )}
          </ul>

          {/* SECCIÓN ADMINISTRACIÓN (Solo visible para rol Admin) */}
          {esAdmin && (
            <div style={{ marginTop: '1.25rem' }}>
              <div className="dash-nav-section-title">ADMINISTRACIÓN</div>
              <ul className="dash-nav-list">
                <li className="dash-nav-item">
                  <button
                    type="button"
                    className={`dash-nav-link ${moduloActivo === 'usuarios' ? 'active' : ''}`}
                    onClick={() => onCambiarModulo('usuarios')}
                  >
                    <span className="dash-nav-icon dash-user-mgmt-icon">
                      <img src="/src/assets/iconos_dash/usuarios-alt.png" alt="Gestión de usuarios" className="dash-nav-icon-img" />
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <img src="/src/assets/iconos_dash/busqueda.png" alt="Buscar" className="dash-search-icon-img" />
            </span>
            <input
              type="text"
              className="dash-search-input"
              placeholder="Buscar unidad, folio o solicitud..."
            />
          </div>

          <div className="dash-topbar-actions">
            <button type="button" className="dash-notif-btn" title="Notificaciones">
              <img src="/src/assets/iconos_dash/campana.png" alt="Notificaciones" className="dash-nav-icon-img" />
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
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
                    onClick={() => onCambiarModulo('usuarios')}
                  >
                    <span className="dash-action-icon">
                      <img src="/src/assets/iconos_dash/agregar-usuario.png" alt="Gestión de usuarios" className="dash-nav-icon-img" />
                    </span>
                    <span>Registrar usuario</span>
                  </button>
                ) : (
                  /* Botones para Personal Médico */
                  <>
                    <button type="button" className="dash-btn-secondary">
                      <span className="dash-action-icon">
                        <img src="/src/assets/iconos_dash/agregar.png" alt="Registrar unidad" className="dash-nav-icon-img" />
                      </span>
                      <span>Registrar unidad</span>
                    </button>

                    <button type="button" className="dash-btn-primary">
                      <span className="dash-action-icon">
                        <img src="/src/assets/iconos_dash/avion-de-papel2.png" alt="Nueva solicitud" className="dash-nav-icon-img" />
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
                        <img src="/src/assets/iconos_dash/sangre.png" alt="Stock total" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      {/* [BACKEND] Reemplazar 0 con stockTotal del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Unidades en inventario</span>
                    </div>
                  </div>

                  {/* KPI A2: Unidades próximas a caducar
                      [BACKEND] GET /api/dashboard/admin/kpis
                      Campo esperado: { proximasCaducar: 0 } */}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Próximas a caducar</span>
                      <div className="dash-kpi-icon-badge badge-orange-subtle">
                        <img src="/src/assets/iconos_dash/reloj.png" alt="Próximas a caducar" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      {/* [BACKEND] Reemplazar 0 con proximasCaducar del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Próximos 7 días</span>
                    </div>
                  </div>

                  {/* KPI A3: Tipos sanguíneos en nivel crítico (≤ 10 unidades)
                      [BACKEND] GET /api/dashboard/admin/kpis
                      Campo esperado: { tiposCriticos: 0 } */}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Tipos en nivel crítico</span>
                      <div className="dash-kpi-icon-badge badge-crimson-subtle">
                        <img src="/src/assets/iconos_dash/advertencia.png" alt="Tipos en nivel crítico" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      {/* [BACKEND] Reemplazar 0 con tiposCriticos del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Tipos sanguíneos ≤ 10 unidades</span>
                    </div>
                  </div>

                  {/* KPI A4: Usuarios registrados en el sistema
                      [BACKEND] GET /api/dashboard/admin/kpis
                      Campo esperado: { totalUsuarios: 0 } */}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Usuarios registrados</span>
                      <div className="dash-kpi-icon-badge badge-blue-subtle">
                        <img src="/src/assets/iconos_dash/usuarios.png" alt="Usuarios registrados" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      {/* [BACKEND] Reemplazar 0 con totalUsuarios del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Total en el sistema</span>
                    </div>
                  </div>
                </>
              ) : (
                /* ---- KPIs DEL MÉDICO ---- */
                <>
                  {/* KPI M1: Unidades disponibles
                      [BACKEND] GET /api/dashboard/medico/kpis
                      Campo esperado: { unidadesDisponibles: 0 } */}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Unidades disponibles</span>
                      <div className="dash-kpi-icon-badge badge-red-subtle">
                        <img src="/src/assets/iconos_dash/sangre.png" alt="Unidades disponibles" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      {/* [BACKEND] Reemplazar 0 con unidadesDisponibles del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Sin registros hoy</span>
                    </div>
                  </div>

                  {/* KPI M2: Próximas a caducar
                      [BACKEND] GET /api/dashboard/medico/kpis
                      Campo esperado: { proximasCaducar: 0 } */}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Próximas a caducar</span>
                      <div className="dash-kpi-icon-badge badge-orange-subtle">
                        <img src="/src/assets/iconos_dash/reloj.png" alt="Próximas a caducar" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      {/* [BACKEND] Reemplazar 0 con proximasCaducar del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Próximos 7 días</span>
                    </div>
                  </div>

                  {/* KPI M3: Solicitudes pendientes
                      [BACKEND] GET /api/dashboard/medico/kpis
                      Campo esperado: { solicitudesPendientes: 0 } */}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Solicitudes pendientes</span>
                      <div className="dash-kpi-icon-badge badge-blue-subtle">
                        <img src="/src/assets/iconos_dash/bandeja.png" alt="Solicitudes pendientes" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      {/* [BACKEND] Reemplazar 0 con solicitudesPendientes del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Sin solicitudes urgentes</span>
                    </div>
                  </div>

                  {/* KPI M4: Niveles críticos
                      [BACKEND] GET /api/dashboard/medico/kpis
                      Campo esperado: { nivelesCriticos: 0 } */}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Niveles críticos</span>
                      <div className="dash-kpi-icon-badge badge-crimson-subtle">
                        <img src="/src/assets/iconos_dash/advertencia.png" alt="Niveles críticos" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      {/* [BACKEND] Reemplazar 0 con nivelesCriticos del endpoint */}
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Sin tipos en nivel crítico</span>
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

                {/* [BACKEND / FRONTEND]: APARTADO PARA LA GRÁFICA
                Aquí se inserta el componente de la gráfica de barras
                (ej: Chart.js, Recharts, ApexCharts o barras personalizadas)
                Endpoint: GET /api/dashboard/stock-tipos
                Payload:  [{ tipo: 'A+', cantidad: 0, esCritico: false }, ...] */}
                <div className="dash-chart-blank-body">
                  <span>[ESPACIO RESERVADO: Aquí se monta el componente de la Gráfica de Barras por Tipo Sanguíneo]</span>
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
                      <h2 className="dash-card-title">Últimos usuarios registrados</h2>
                      <p className="dash-card-subtitle">Altas recientes en el sistema</p>
                    </div>
                    <a href="#usuarios" className="dash-card-link">
                      Ver todos
                    </a>
                  </div>
                  {/* [BACKEND / FRONTEND]: APARTADO PARA USUARIOS RECIENTES
                  Aquí se mapea el listado obtenido del endpoint:
                  GET /api/dashboard/admin/usuarios-recientes */}
                  <div className="dash-requests-blank-body">
                    <span>[ESPACIO RESERVADO: Aquí se mapean las filas de Últimos Usuarios Registrados]</span>
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
                  <div className="dash-requests-blank-body">
                    <span>[ESPACIO RESERVADO: Aquí se mapean las tarjetas/filas de Solicitudes Recientes]</span>
                  </div>
                </div>
              )}
            </section>

            {/* ACTIVIDAD RECIENTE (TABLA) */}
            <section className="dash-card">
              <div className="dash-card-header">
                <div>
                  <h2 className="dash-card-title">Actividad reciente</h2>
                  <p className="dash-card-subtitle">
                    Trazabilidad de operaciones: responsable, fecha, hora y folio
                  </p>
                </div>
                <a href="#bitacora" className="dash-card-link">
                  Ver bitácora
                </a>
              </div>

              {/* CONTENEDOR DE TABLA */}
              <div className="dash-table-blank-body">
                {/* Encabezados de columnas */}
                <div className="dash-table-header-row">
                  <span>Folio</span>
                  <span>Operación</span>
                  <span>Responsable</span>
                  <span>Fecha y hora</span>
                </div>

                {/* [BACKEND / FRONTEND]: APARTADO PARA FILAS DE BITÁCORA
                  Aquí se mapean las filas de actividad obtenidas de:
                  GET /api/bitacora/reciente */}
                <div className="dash-table-empty-notice">
                  <span>[ESPACIO RESERVADO: Aquí se mapean las filas de la Bitácora de Actividad Reciente]</span>
                </div>
              </div>
            </section>
          </>
        </main>
      </div>
    </div>
  );
}
