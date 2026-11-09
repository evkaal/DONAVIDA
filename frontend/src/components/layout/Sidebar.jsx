import React from 'react';
import './Sidebar.css';

export default function Sidebar({ usuario, moduloActivo = 'dashboard', onCambiarModulo, onLogout }) {
  // Roles posibles: 1 = 'admin_gen' | 2 = 'admin_ins' | 3 = 'medico'
  const rol = usuario?.rol ?? '';
  const rolId = Number(usuario?.rol_id ?? (rol === 'admin_gen' ? 1 : rol === 'admin_ins' ? 2 : 3));
  const esAdminGen = rolId === 1 || rol === 'admin_gen';
  const esAdminIns = rolId === 2 || rol === 'admin_ins';
  const esAdminCual = esAdminGen || esAdminIns || rol === 'admin';  // cualquier tipo de admin

  // Admin institución ve TODOS los módulos (médico + administración)
  // Admin general ve solo Dashboard, Stock, Histórico + administración
  const verModulosMedico = !esAdminGen;          // médico y admin_ins
  const verAdministracion = esAdminCual;           // ambos tipos de admin

  const handleNavClick = (moduloId) => {
    if (onCambiarModulo) {
      onCambiarModulo(moduloId);
    }
  };

  return (
    <aside className="dona-sidebar">
      <div className="dona-sidebar-top">
        {/* LOGO DE DONAVIDA */}
        <div className="dona-brand-container">
          <img
            src="/src/assets/donavida_logo2.png"
            alt="DONAVIDA"
            className="dona-brand-logo-img"
          />
        </div>

        <div className="dona-nav-section-title">MÓDULOS</div>

        <ul className="dona-nav-list">
          {/* Dashboard (Común para Médico y Admin) */}
          <li className="dona-nav-item">
            <button
              type="button"
              className={`dona-nav-link ${moduloActivo === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <span className="dona-nav-icon">
                <img src="/src/assets/iconos_sidenavbar/panel-de-control.png" alt="Dashboard" className="dona-nav-icon-img" />
              </span>
              <span className="dona-nav-text">Dashboard</span>
            </button>
          </li>

          {/* Registro de unidades — Médico y Admin institución */}
          {verModulosMedico && (
            <li className="dona-nav-item">
              <button
                type="button"
                className={`dona-nav-link ${moduloActivo === 'registro' ? 'active' : ''}`}
                onClick={() => handleNavClick('registro')}
              >
                <span className="dona-nav-icon">
                  <img src="/src/assets/iconos_sidenavbar/aplicaciones-anadir.png" alt="Registro de unidades" className="dona-nav-icon-img" />
                </span>
                <span className="dona-nav-text">Registro de unidades</span>
              </button>
            </li>
          )}

          {/* Stock de inventario (Común para Médico y Admin) */}
          <li className="dona-nav-item">
            <button
              type="button"
              className={`dona-nav-link ${moduloActivo === 'stock' ? 'active' : ''}`}
              onClick={() => handleNavClick('stock')}
            >
              <span className="dona-nav-icon">
                <img src="/src/assets/iconos_sidenavbar/caja-alt.png" alt="Stock de inventario" className="dona-nav-icon-img" />
              </span>
              <span className="dona-nav-text">Stock de inventario</span>
            </button>
          </li>

          {/* Histórico (Común para Médico y Admin) */}
          <li className="dona-nav-item">
            <button
              type="button"
              className={`dona-nav-link ${moduloActivo === 'historico' ? 'active' : ''}`}
              onClick={() => handleNavClick('historico')}
            >
              <span className="dona-nav-icon">
                <img src="/src/assets/iconos_sidenavbar/reloj-tres.png" alt="Histórico" className="dona-nav-icon-img" />
              </span>
              <span className="dona-nav-text">Histórico</span>
            </button>
          </li>

          {/* Solicitud de unidades — Médico y Admin institución */}
          {verModulosMedico && (
            <li className="dona-nav-item">
              <button
                type="button"
                className={`dona-nav-link ${moduloActivo === 'solicitud' ? 'active' : ''}`}
                onClick={() => handleNavClick('solicitud')}
              >
                <span className="dona-nav-icon">
                  <img src="/src/assets/iconos_sidenavbar/avion-de-papel.png" alt="Solicitud de unidades" className="dona-nav-icon-img" />
                </span>
                <span className="dona-nav-text">Solicitud de unidades</span>
              </button>
            </li>
          )}

          {/* Solicitudes entrantes — Médico y Admin institución */}
          {verModulosMedico && (
            <li className="dona-nav-item">
              <button
                type="button"
                className={`dona-nav-link ${moduloActivo === 'entrantes' ? 'active' : ''}`}
                onClick={() => handleNavClick('entrantes')}
              >
                <span className="dona-nav-icon">
                  <img src="/src/assets/iconos_sidenavbar/bandeja-de-entrada.png" alt="Solicitudes entrantes" className="dona-nav-icon-img" />
                </span>
                <span className="dona-nav-text">Solicitudes entrantes</span>
              </button>
            </li>
          )}
        </ul>

        {/* SECCIÓN ADMINISTRACIÓN — Admin institución y Admin general */}
        {verAdministracion && (
          <div className="dona-admin-nav-section">
            <div className="dona-nav-section-title">ADMINISTRACIÓN</div>
            <ul className="dona-nav-list">
              <li className="dona-nav-item">
                <button
                  type="button"
                  className={`dona-nav-link ${moduloActivo === 'usuarios' ? 'active' : ''}`}
                  onClick={() => handleNavClick('usuarios')}
                >
                  <span className="dona-nav-icon">
                    <img src="/src/assets/iconos_sidenavbar/usuarios-alt.png" alt="Gestión de usuarios" className="dona-nav-icon-img" />
                  </span>
                  <span className="dona-nav-text">Gestión de usuarios</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* CERRAR SESIÓN AL PIE DEL SIDEBAR */}
      <div className="dona-sidebar-bottom">
        <button type="button" className="dona-btn-logout" onClick={onLogout}>
          <span className="dona-logout-icon">
            <img src="/src/assets/iconos_sidenavbar/salida.png" alt="Cerrar sesión" className="dona-nav-icon-img" />
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

