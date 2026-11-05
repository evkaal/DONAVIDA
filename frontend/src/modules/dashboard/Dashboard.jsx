import React, { useState } from 'react';
import './Dashboard.css';
import { Sidebar, Navbar } from '../../components/layout';

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
                    <button type="button" className="dash-btn-secondary" onClick={() => onCambiarModulo && onCambiarModulo('registro')}>
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
                /* KPIs DEL ADMINISTRADOR */
                <>
                  {/* KPI A1: Stock total de unidades*/}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Stock total</span>
                      <div className="dash-kpi-icon-badge badge-red-subtle">
                        <img src="/src/assets/iconos_dash/sangre.png" alt="Stock total" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Unidades en inventario</span>
                    </div>
                  </div>

                  {/* KPI A2: Unidades próximas a caducar*/}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Próximas a caducar</span>
                      <div className="dash-kpi-icon-badge badge-orange-subtle">
                        <img src="/src/assets/iconos_dash/reloj.png" alt="Próximas a caducar" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Próximos 7 días</span>
                    </div>
                  </div>

                  {/* KPI A3: Tipos sanguíneos en nivel crítico (≤ 10 unidades)*/}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Tipos en nivel crítico</span>
                      <div className="dash-kpi-icon-badge badge-crimson-subtle">
                        <img src="/src/assets/iconos_dash/advertencia.png" alt="Tipos en nivel crítico" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Tipos sanguíneos ≤ 10 unidades</span>
                    </div>
                  </div>

                  {/* KPI A4: Usuarios registrados en el sistema*/}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Usuarios registrados</span>
                      <div className="dash-kpi-icon-badge badge-blue-subtle">
                        <img src="/src/assets/iconos_dash/usuarios.png" alt="Usuarios registrados" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Total en el sistema</span>
                    </div>
                  </div>
                </>
              ) : (
                /* KPIs DEL MÉDICO */
                <>
                  {/* KPI M1: Unidades disponibles*/}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Unidades disponibles</span>
                      <div className="dash-kpi-icon-badge badge-red-subtle">
                        <img src="/src/assets/iconos_dash/sangre.png" alt="Unidades disponibles" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Sin registros hoy</span>
                    </div>
                  </div>

                  {/* KPI M2: Próximas a caducar*/}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Próximas a caducar</span>
                      <div className="dash-kpi-icon-badge badge-orange-subtle">
                        <img src="/src/assets/iconos_dash/reloj.png" alt="Próximas a caducar" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Próximos 7 días</span>
                    </div>
                  </div>

                  {/* KPI M3: Solicitudes pendientes*/}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Solicitudes pendientes</span>
                      <div className="dash-kpi-icon-badge badge-blue-subtle">
                        <img src="/src/assets/iconos_dash/bandeja.png" alt="Solicitudes pendientes" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Sin solicitudes urgentes</span>
                    </div>
                  </div>

                  {/* KPI M4: Niveles críticos*/}
                  <div className="dash-kpi-card">
                    <div className="dash-kpi-top">
                      <span className="dash-kpi-title">Niveles críticos</span>
                      <div className="dash-kpi-icon-badge badge-crimson-subtle">
                        <img src="/src/assets/iconos_dash/advertencia.png" alt="Niveles críticos" className="dash-nav-icon-img" />
                      </div>
                    </div>
                    <div className="dash-kpi-value-area">
                      <h3 className="dash-kpi-number">0</h3>
                    </div>
                    <div className="dash-kpi-footer">
                      <span className="dash-kpi-subtext-muted">Sin tipos en nivel crítico</span>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* SECCIÓN CENTRAL: GRÁFICA Y COLUMNA DERECHA (por rol)
            - Ambos roles ven la gráfica de stock por tipo sanguíneo
            - Médico: columna derecha: Solicitudes recientes
            - Admin: columna derecha: Últimos usuarios registrados*/}
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

                <div className="dash-chart-blank-body">
                  <span>[ESPACIO RESERVADO: Aquí se monta el componente de la Gráfica de Barras por Tipo Sanguíneo]</span>
                </div>
              </div>

              {/* Columna Derecha — condicional por rol */}
              {esAdmin ? (
                /* ADMIN: Últimos usuarios registrados */
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

                  <div className="dash-requests-blank-body">
                    <span>[ESPACIO RESERVADO: Aquí se mapean las filas de Últimos Usuarios Registrados]</span>
                  </div>
                </div>
              ) : (
                /* MÉDICO: Solicitudes recientes*/
                <div className="dash-card">
                  <div className="dash-card-header">
                    <div>
                      <h2 className="dash-card-title">Solicitudes recientes</h2>
                    </div>
                    <a href="#solicitudes" className="dash-card-link">
                      Ver todas
                    </a>
                  </div>

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
