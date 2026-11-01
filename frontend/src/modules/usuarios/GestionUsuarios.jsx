import React, { useState } from 'react';
import './GestionUsuarios.css';
import ModalRegistrarUsuario from './ModalRegistrarUsuario';

export default function GestionUsuarios({ usuario, onCambiarModulo, onLogout }) {
  // Estado para controlar la apertura del modal de registro
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados de los filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroInstitucion, setFiltroInstitucion] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Datos del perfil activo
  const nombreUsuario = usuario?.nombre || 'Admin DONAVIDA';
  const institucionUsuario = usuario?.institucion || 'Administrador · Sistema';
  const avatarIniciales = usuario?.rol === 'admin' ? 'AD' : 'U';

  // =========================================================================
  // PROPUESTA DE INTEGRACIÓN PARA EL DESARROLLADOR BACKEND (Go / REST API):
  //
  // 1. Métricas de Usuarios (KPIs):
  //    Endpoint sugerido: GET /api/usuarios/kpis
  //    Payload esperado:
  //    {
  //      totalRegistrados: 0,
  //      cuentasActivas: 0,
  //      cuentasInactivas: 0
  //    }
  //
  // 2. Listado de usuarios con filtros y paginación:
  //    Endpoint sugerido: GET /api/usuarios?search=${busqueda}&rol=${filtroRol}&institucion=${filtroInstitucion}&estado=${filtroEstado}&page=1
  //    Payload esperado:
  //    {
  //      usuarios: [],
  //      total: 0,
  //      paginaActual: 1,
  //      totalPaginas: 1
  //    }
  // =========================================================================

  return (
    <div className="usuarios-page-wrapper">
      <aside className="usuarios-sidebar">
        <div className="usuarios-sidebar-top">
          <div className="usuarios-brand-container">
            <img
              src="/src/assets/donavida_logo2.png"
              alt="DONAVIDA"
              className="usuarios-brand-logo-img"
            />
          </div>

          <div className="usuarios-nav-section-title">MÓDULOS</div>

          <ul className="usuarios-nav-list">
            <li className="usuarios-nav-item">
              <button
                type="button"
                className="usuarios-nav-link"
                onClick={() => onCambiarModulo && onCambiarModulo('dashboard')}
              >
                <span className="usuarios-nav-icon">
                  <img src="/src/assets/iconos_gestionU/panel-de-control.png" alt="DONAVIDA" />
                </span>
                <span className="usuarios-nav-text">Dashboard</span>
              </button>
            </li>

            <li className="usuarios-nav-item">
              <button
                type="button"
                className="usuarios-nav-link"
                onClick={() => onCambiarModulo && onCambiarModulo('stock')}
              >
                <span className="usuarios-nav-icon">
                  <img src="/src/assets/iconos_gestionU/aplicaciones-anadir.png" alt="DONAVIDA" />
                </span>
                <span className="usuarios-nav-text">Stock de inventario</span>
              </button>
            </li>

            <li className="usuarios-nav-item">
              <button
                type="button"
                className="usuarios-nav-link"
                onClick={() => onCambiarModulo && onCambiarModulo('historico')}
              >
                <span className="usuarios-nav-icon">
                  <img src="/src/assets/iconos_gestionU/reloj-tres.png" alt="DONAVIDA" />
                </span>
                <span className="usuarios-nav-text">Histórico</span>
              </button>
            </li>
          </ul>

          <div style={{ marginTop: '1.25rem' }}>
            <div className="usuarios-nav-section-title">ADMINISTRACIÓN</div>
            <ul className="usuarios-nav-list">
              <li className="usuarios-nav-item">
                <button
                  type="button"
                  className="usuarios-nav-link active"
                >
                  <span className="usuarios-nav-icon">
                    <img src="/src/assets/iconos_gestionU/usuarios-alt.png" alt="DONAVIDA" />
                  </span>
                  <span className="usuarios-nav-text">Gestión de usuarios</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="usuarios-sidebar-bottom">
          <button type="button" className="usuarios-btn-logout" onClick={onLogout}>
            <span className="usuarios-logout-icon">
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

      {/* ÁREA PRINCIPAL DEL MÓDULO*/}
      <div className="usuarios-main-area">
        <header className="usuarios-topbar">
          <div className="usuarios-top-search-wrapper">
            <span className="usuarios-top-search-icon">
              <img src="/src/assets/iconos_gestionU/busqueda.png" alt="DONAVIDA" />
            </span>
            <input
              type="text"
              className="usuarios-top-search-input"
              placeholder="Buscar unidad, folio o solicitud..."
            />
          </div>

          {/* Notificaciones y Perfil */}
          <div className="usuarios-topbar-actions">
            <button type="button" className="usuarios-notif-btn" title="Notificaciones">
              <img src="/src/assets/iconos_gestionU/campana.png" alt="Notificaciones" className="usuarios-nav-icon-img" />
            </button>

            <div className="usuarios-user-profile">
              <div className="usuarios-user-avatar">
                <span>{avatarIniciales}</span>
              </div>
              <div className="usuarios-user-info">
                <span className="usuarios-user-name">{nombreUsuario}</span>
                <span className="usuarios-user-role">{institucionUsuario}</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </header>

        <main className="usuarios-content-body">
          <section className="usuarios-page-header">
            <div className="usuarios-title-group">
              <h1>Gestión de usuarios</h1>
              <p>Administra las cuentas del personal de hospitales y bancos de sangre</p>
            </div>

            <button
              type="button"
              className="btn-open-modal-register"
              onClick={() => setIsModalOpen(true)}
            >
              <span>
                <img src="/src/assets/iconos_gestionU/agregar-usuario.png" alt="DONAVIDA" />
              </span>
              <span>Registrar usuario</span>
            </button>
          </section>

          {/* TARJETAS KPI */}
          <section className="usuarios-kpi-grid">
            {/* KPI 1: Usuarios registrados */}
            <div className="usuarios-kpi-card">
              <div className="usuarios-kpi-info">
                <span className="usuarios-kpi-title">Usuarios registrados</span>
                {/* [BACKEND]: Inyecta kpi.totalRegistrados */}
                <h2 className="usuarios-kpi-number">0</h2>
              </div>
              <div className="usuarios-kpi-icon-badge badge-users-pink">
                <img src="/src/assets/iconos_gestionU/usuarios.png" alt="DONAVIDA" />
              </div>
            </div>

            {/* KPI 2: Cuentas activas */}
            <div className="usuarios-kpi-card">
              <div className="usuarios-kpi-info">
                <span className="usuarios-kpi-title">Cuentas activas</span>
                {/* [BACKEND]: Inyecta kpi.cuentasActivas */}
                <h2 className="usuarios-kpi-number">0</h2>
              </div>
              <div className="usuarios-kpi-icon-badge badge-users-green">
                <img src="/src/assets/iconos_gestionU/usuario-activo.png" alt="DONAVIDA" />
              </div>
            </div>

            {/* KPI 3: Cuentas inactivas */}
            <div className="usuarios-kpi-card">
              <div className="usuarios-kpi-info">
                <span className="usuarios-kpi-title">Cuentas inactivas</span>
                {/* [BACKEND]: Inyecta kpi.cuentasInactivas */}
                <h2 className="usuarios-kpi-number">0</h2>
              </div>
              <div className="usuarios-kpi-icon-badge badge-users-gray">
                <img src="/src/assets/iconos_gestionU/usuario-inactivo.png" alt="DONAVIDA" />
              </div>
            </div>
          </section>

          {/* TARJETA PRINCIPAL: FILTROS Y TABLA DE USUARIOS*/}
          <section className="usuarios-table-card">
            <div className="usuarios-filters-toolbar">
              <div className="usuarios-search-input-wrapper">
                <span className="usuarios-search-icon">
                  <img src="/src/assets/iconos_gestionU/busqueda.png" alt="DONAVIDA" />
                </span>
                <input
                  type="text"
                  className="usuarios-search-field"
                  placeholder="Buscar por nombre o correo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <div className="usuarios-dropdowns-group">
                <select
                  className="filter-select-dropdown"
                  value={filtroRol}
                  onChange={(e) => setFiltroRol(e.target.value)}
                >
                  <option value="todos">Rol: Todos</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Hospital">Hospital</option>
                  <option value="Banco de sangre">Banco de sangre</option>
                </select>

                <select
                  className="filter-select-dropdown"
                  value={filtroInstitucion}
                  onChange={(e) => setFiltroInstitucion(e.target.value)}
                >
                  <option value="todas">Institución: Todas</option>
                  <option value="Hospital General">Hospital General</option>
                  <option value="Hospital Regional">Hospital Regional</option>
                  <option value="Clínica Reforma">Clínica Reforma</option>
                  <option value="Banco de Sangre Central">Banco de Sangre Central</option>
                </select>

                <select
                  className="filter-select-dropdown"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="todos">Estado: Todos</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="usuarios-table-wrapper">
              <div className="usuarios-table-head">
                <span>Nombre</span>
                <span>Correo electrónico</span>
                <span>Rol</span>
                <span>Institución</span>
                <span>Estado</span>
                <span>Fecha de alta</span>
                <span>Acciones</span>
              </div>

              {/* [BACKEND / FRONTEND]: APARTADO PARA FILAS DE USUARIOS
                  Aquí se mapea el array devuelto por el backend:
                  GET /api/usuarios?...*/}
              <div className="usuarios-table-blank-notice">
                <span className="usuarios-table-blank-title">
                  [ESPACIO RESERVADO: Aquí se mapean las filas de los Usuarios registrados]
                </span>
                <span className="usuarios-table-blank-sub">
                  Conectar con el endpoint: <code>GET /api/usuarios</code>
                </span>
              </div>
            </div>

            <footer className="usuarios-pagination-footer">
              <span>Mostrando 0 de 0 usuarios</span>

              <div className="pagination-controls">
                <button type="button" className="pagination-btn" disabled>
                  ‹
                </button>
                <button type="button" className="pagination-btn active">
                  1
                </button>
                <button type="button" className="pagination-btn" disabled>
                  ›
                </button>
              </div>
            </footer>
          </section>
        </main>
      </div>

      {/* MODAL DE REGISTRO */}
      <ModalRegistrarUsuario
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={(nuevoUsuario) => {
          console.log('[USUARIOS] Nuevo usuario registrado:', nuevoUsuario);
        }}
      />
    </div>
  );
}
