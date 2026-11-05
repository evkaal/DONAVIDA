import React, { useState } from 'react';
import './GestionUsuarios.css';
import { Sidebar, Navbar } from '../../components/layout';
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

  return (
    <div className="dona-page-wrapper usuarios-page-wrapper">
      <Sidebar
        usuario={usuario}
        moduloActivo="usuarios"
        onCambiarModulo={onCambiarModulo}
        onLogout={onLogout}
      />

      <div className="dona-main-area usuarios-main-area">
        <Navbar usuario={usuario} />

        {/* CONTENIDO DEL CUERPO */}
        <main className="dona-content-body usuarios-content-body">
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
                  <img src="/src/assets/iconos_sidenavbar/busqueda.png" alt="DONAVIDA" />
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
                  <option value="Personal medico">Personal Médico</option>
                  <option value="Admin Institucional">Admin Institucional</option>
                  <option value="Administrador">Administrador</option>
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
        usuarioActual={usuario}
        onSaveSuccess={(nuevoUsuario) => {
          console.log('[USUARIOS] Nuevo usuario registrado:', nuevoUsuario);
        }}
      />
    </div>
  );
}
