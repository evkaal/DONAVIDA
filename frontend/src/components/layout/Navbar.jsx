import React, { useState, useEffect } from 'react';
import './Navbar.css';
import { obtenerNotificaciones, marcarNotificacionLeida } from '../../services/notificacionesService';

export default function Navbar({
  usuario,
  placeholder = 'Buscar unidad, folio o solicitud...',
  valorBusqueda,
  onCambioBusqueda,
  onNotificacionesClick,
}) {
  // Panel de notificaciones (la campana): si el padre pasa su propio
  // onNotificacionesClick, manda ese; si no, se usa el panel interno con
  // las notificaciones reales del usuario de la sesión.
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const cargarNotificaciones = async () => {
    // Sin token no hay sesión: no se consulta nada (la campana no debe
    // romper la pantalla de login ni ninguna otra).
    if (!localStorage.getItem('token')) return;
    try {
      const data = await obtenerNotificaciones();
      setNotificaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    }
  };

  // Contador de no leídas al montar (solo con sesión).
  useEffect(() => { cargarNotificaciones(); }, []);

  const handleCampanaClick = () => {
    if (onNotificacionesClick) {
      onNotificacionesClick();
      return;
    }
    if (!panelAbierto) cargarNotificaciones();
    setPanelAbierto(!panelAbierto);
  };

  const handleClickNotificacion = async (n) => {
    if (!n.leida) {
      try {
        await marcarNotificacionLeida(n.id);
        setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      } catch (err) {
        console.error("Error al marcar notificación como leída:", err);
      }
    }
  };

  const handleMarcarTodas = async () => {
    const pendientes = notificaciones.filter((n) => !n.leida);
    await Promise.all(pendientes.map((n) => marcarNotificacionLeida(n.id).catch(() => null)));
    setNotificaciones((prev) => prev.map((x) => ({ ...x, leida: true })));
  };
  // Admin general: rol_id 1 (el usuario real nunca trae rol='admin').
  const esAdminGen = usuario?.rol_id === 1;
  const esAdmin = esAdminGen || usuario?.rol === 'admin' || (typeof usuario === 'string' && usuario.includes('admin'));
  const sinSesion = !usuario || (typeof usuario === 'object' && !usuario.nombre && !usuario.email);
  const nombreUsuario = sinSesion
    ? 'Sin sesión'
    : (usuario?.nombre
      || (usuario?.email ? usuario.email.split('@')[0] : null)
      || (esAdmin ? 'Admin DONAVIDA' : 'Usuario'));
  // Admin general nunca es de un hospital: su institución es el sistema.
  const institucionUsuario = sinSesion
    ? 'Sesión no iniciada'
    : (esAdminGen
      ? 'Administrador · Sistema'
      : (usuario?.institucion || 'Sin institución'));
  const avatarIniciales = sinSesion
    ? '--'
    : (esAdmin
      ? 'AD'
      : (usuario?.correo
        ? usuario.correo.substring(0, 2).toUpperCase()
        : (usuario?.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : 'PM')));

  return (
    <header className="dona-topbar">
      <div className="dona-search-wrapper">
        <span className="dona-search-icon">
          <img src="/assets/iconos_sidenavbar/busqueda.png" alt="Buscar" className="dona-search-icon-img" />
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
        <div className="dona-notif-wrapper">
          <button
            type="button"
            className="dona-notif-btn"
            title="Notificaciones"
            onClick={handleCampanaClick}
          >
            <img src="/assets/iconos_sidenavbar/campana.png" alt="Notificaciones" className="dona-nav-icon-img" />
            {noLeidas > 0 && (
              <span className="dona-notif-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>
            )}
          </button>

          {panelAbierto && (
            <>
              <div className="dona-notif-overlay" onClick={() => setPanelAbierto(false)} />
              <div className="dona-notif-panel">
                <div className="dona-notif-panel-header">
                  <span>Notificaciones</span>
                  {noLeidas > 0 && (
                    <button type="button" className="dona-notif-marcar-todas" onClick={handleMarcarTodas}>
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                {notificaciones.length === 0 ? (
                  <p className="dona-notif-empty">Sin notificaciones.</p>
                ) : (
                  <ul className="dona-notif-list">
                    {notificaciones.map((n) => (
                      <li
                        key={n.id}
                        className={n.leida ? 'dona-notif-item leida' : 'dona-notif-item no-leida'}
                        onClick={() => handleClickNotificacion(n)}
                      >
                        <span className="dona-notif-msg">{n.mensaje}</span>
                        <span className="dona-notif-fecha">
                          {n.fecha}{n.solicitud ? ` · ${n.solicitud}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

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

