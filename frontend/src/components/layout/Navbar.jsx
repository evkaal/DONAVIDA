import React from 'react';
import './Navbar.css';

export default function Navbar({
  usuario,
  placeholder = 'Buscar unidad, folio o solicitud...',
  valorBusqueda,
  onCambioBusqueda,
  onNotificacionesClick,
}) {
  const esAdmin = usuario?.rol === 'admin' || (typeof usuario === 'string' && usuario.includes('admin'));
  const nombreUsuario = usuario?.nombre || (esAdmin ? 'Admin DONAVIDA' : 'Personal Médico');
  const institucionUsuario = usuario?.institucion || (esAdmin ? 'Administrador · Sistema' : 'Hospital General');
  const avatarIniciales = esAdmin
    ? 'AD'
    : (usuario?.correo
      ? usuario.correo.substring(0, 2).toUpperCase()
      : (usuario?.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : 'PM'));

  return (
    <header className="dona-topbar">
      <div className="dona-search-wrapper">
        <span className="dona-search-icon">
          <img src="/src/assets/iconos_sidenavbar/busqueda.png" alt="Buscar" className="dona-search-icon-img" />
        </span>
        <input
          type="text"
          className="dona-search-input"
          placeholder={placeholder}
          value={valorBusqueda !== undefined ? valorBusqueda : undefined}
          onChange={onCambioBusqueda}
        />
      </div>

      {/* Notificaciones y Perfil */}
      <div className="dona-topbar-actions">
        <button
          type="button"
          className="dona-notif-btn"
          title="Notificaciones"
          onClick={onNotificacionesClick}
        >
          <img src="/src/assets/iconos_sidenavbar/campana.png" alt="Notificaciones" className="dona-nav-icon-img" />
        </button>

        {/* Perfil del usuario */}
        <div className="dona-user-profile">
          <div className="dona-user-avatar">
            <span>{avatarIniciales}</span>
          </div>
          <div className="dona-user-info">
            <span className="dona-user-name">{nombreUsuario}</span>
            <span className="dona-user-role">{institucionUsuario}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

