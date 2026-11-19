import React, { useState, useEffect } from "react";
import "./GestionUsuarios.css";
import { Sidebar, Navbar } from "../../components/layout";
import ModalRegistrarUsuario from "./ModalRegistrarUsuario";
import ModalAviso from "../../components/common/ModalAviso";
import { obtenerInstituciones, obtenerUsuarios, eliminarUsuarioService, cambiarEstadoUsuario, obtenerRoles } from "../../services/usuariosService";
import ModalRegistrarInstitucion from "../insti/ModalRegistrarInsti";

export default function GestionUsuarios({
  usuario,
  onCambiarModulo,
  onLogout,
}) {
  const userState = usuario || JSON.parse(localStorage.getItem('usuario') || '{}');
  // rol_id puede venir como número o como string: se normaliza con Number.
  const rolNumerico = Number(userState?.rol_id);
  const esAdminGeneral = rolNumerico === 1;
  // El personal médico (rol_id 3) NO puede crear ni gestionar usuarios.
  const esMedico = rolNumerico === 3;
  const puedeCrearUsuarios = rolNumerico === 1 || rolNumerico === 2;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalInstOpen, setIsModalInstOpen] = useState(false);
  const [usuariosList, setUsuariosList] = useState([]);
  // Aviso y confirmación sencillos (modal) en lugar de alert()/confirm().
  const [aviso, setAviso] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null); // { mensaje, onAceptar }

  // Función para cargar usuarios
  const cargarUsuarios = async () => {
    const data = await obtenerUsuarios();
    setUsuariosList(data || []);
  };

  // Estados de los filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroInstitucion, setFiltroInstitucion] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Estado para almacenar la lista de instituciones dinámicas desde la BD
  const [institucionesList, setInstitucionesList] = useState([]);

  // Roles reales de la BD (GET /api/catalogos/roles), para el filtro y el modal.
  const [rolesList, setRolesList] = useState([]);

  // Cargar las instituciones reales al montar el componente.
  // El personal médico no llega a esta pantalla (ver aviso abajo) y el
  // backend le devuelve 403, así que ni siquiera se cargan los datos.
  useEffect(() => {
    if (esMedico) return;
    obtenerInstituciones()
      .then((data) => setInstitucionesList(data || []))
      .catch((err) =>
        console.error("Error al cargar instituciones en filtros:", err),
      );
    obtenerRoles()
      .then((data) => setRolesList(data || []))
      .catch((err) => console.error("Error al cargar roles en filtros:", err));
    cargarUsuarios();
  }, []);

  const eliminarUsuarioConfirmado = async (id) => {
    try {
      await eliminarUsuarioService(id);
      setAviso({ titulo: 'Usuario eliminado', mensaje: 'Usuario eliminado con éxito' });
      cargarUsuarios(); // Recargar la tabla
    } catch (err) {
      console.error("Error al eliminar:", err);
      setAviso({ titulo: 'Error', mensaje: 'No se pudo eliminar el usuario.' });
    }
  };

  const handleEliminar = (id) => {
    setConfirmacion({
      titulo: 'Eliminar usuario',
      mensaje: '¿Estás seguro de eliminar este usuario del sistema?',
      textoAceptar: 'Eliminar',
      onAceptar: () => eliminarUsuarioConfirmado(id),
    });
  };

  // Dar de baja: el usuario sigue en la lista (para poder reactivarlo)
  // pero el Login lo rechaza hasta que se reactive.
  const cambiarEstadoConfirmado = async (id, estado) => {
    try {
      await cambiarEstadoUsuario(id, estado);
      setAviso({
        titulo: estado ? 'Usuario reactivado' : 'Usuario dado de baja',
        mensaje: estado
          ? 'El usuario puede volver a iniciar sesión.'
          : 'El usuario ya no puede iniciar sesión hasta que se reactive.',
      });
      cargarUsuarios(); // Recargar la tabla
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      setAviso({ titulo: 'Error', mensaje: 'No se pudo actualizar el estado del usuario.' });
    }
  };

  const handleCambiarEstado = (u) => {
    const darDeBaja = Boolean(u.activo);
    setConfirmacion({
      titulo: darDeBaja ? 'Dar de baja usuario' : 'Reactivar usuario',
      mensaje: darDeBaja
        ? `¿Dar de baja a ${u.nombre}? Ya no podrá iniciar sesión hasta que se reactive.`
        : `¿Reactivar a ${u.nombre}? Volverá a poder iniciar sesión.`,
      textoAceptar: darDeBaja ? 'Dar de baja' : 'Reactivar',
      onAceptar: () => cambiarEstadoConfirmado(u.id, !darDeBaja),
    });
  };

  // --- CÁLCULO DINÁMICO PARA LAS TARJETAS KPI ---
  const totalUsuarios = usuariosList.length;
  const cuentasActivas = usuariosList.filter(u => u.activo === true).length;
  const cuentasInactivas = usuariosList.filter(u => u.activo === false).length;

  // --- FILTROS APLICADOS DE VERDAD (antes existían en el state pero nunca
  // se usaban: la tabla siempre mostraba usuariosList completo) ---
  // filtroRol guarda el id del rol; se compara con el nombre que devuelve
  // el backend (roles.nombre). filtroInstitucion guarda el id; si el
  // backend no devuelve institucion_id, se compara por nombre.
  const rolSeleccionado = rolesList.find((r) => String(r.id) === String(filtroRol));
  const usuariosFiltrados = usuariosList.filter((u) => {
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      if (!(String(u.nombre || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q))) return false;
    }
    if (filtroRol !== 'todos') {
      if (rolSeleccionado && u.rol !== rolSeleccionado.nombre) return false;
      if (!rolSeleccionado && String(u.rol || '').toLowerCase() !== String(filtroRol).toLowerCase()) return false;
    }
    if (filtroInstitucion !== 'todas') {
      if (u.institucion_id !== undefined && u.institucion_id !== null) {
        if (String(u.institucion_id) !== String(filtroInstitucion)) return false;
      } else {
        const instSel = institucionesList.find((i) => String(i.id) === String(filtroInstitucion));
        if (instSel && u.institucion !== instSel.nombre) return false;
      }
    }
    if (filtroEstado !== 'todos') {
      const quiereActivo = filtroEstado === 'Activo';
      if (Boolean(u.activo) !== quiereActivo) return false;
    }
    return true;
  });

  // El personal médico (rol_id 3) no puede crear ni gestionar usuarios:
  // si llega a esta pantalla, ve el aviso en vez de la tabla y los botones.
  // (El Sidebar ya no le muestra la opción y App.jsx tampoco lo deja entrar;
  // esto es la última defensa si llega por estado viejo.)
  if (esMedico) {
    return (
      <div className="dona-page-wrapper usuarios-page-wrapper" style={{ width: '100%' }}>
        <Sidebar
          usuario={usuario}
          moduloActivo="usuarios"
          onCambiarModulo={onCambiarModulo}
          onLogout={onLogout}
        />
        <div className="dona-main-area usuarios-main-area" style={{ width: '100%', margin: 0 }}>
          <Navbar usuario={usuario} />
          <main className="dona-content-body usuarios-content-body">
            <section className="usuarios-page-header">
              <div className="usuarios-title-group">
                <h1>Gestión de usuarios</h1>
                <p>
                  Administra las cuentas del personal de hospitales y bancos de sangre
                </p>
              </div>
            </section>
            <div className="usuarios-table-blank-notice">
              <span className="usuarios-table-blank-title">No tienes permiso para gestionar usuarios</span>
              <span style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                Solo los administradores pueden ver y crear cuentas de usuario.
              </span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dona-page-wrapper usuarios-page-wrapper" style={{ width: '100%' }}>
      <Sidebar
        usuario={usuario}
        moduloActivo="usuarios"
        onCambiarModulo={onCambiarModulo}
        onLogout={onLogout}
      />
      <div className="dona-main-area usuarios-main-area" style={{ width: '100%', margin: 0 }}>
        <Navbar usuario={usuario} />

        {/* CONTENIDO DEL CUERPO */}
        <main className="dona-content-body usuarios-content-body">
          <section className="usuarios-page-header">
            <div className="usuarios-title-group">
              <h1>Gestión de usuarios</h1>
              <p>
                Administra las cuentas del personal de hospitales y bancos de sangre
              </p>
            </div>

            {/* CONTENEDOR DE BOTONES */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {/* BOTÓN EXCLUSIVO PARA REGISTRAR INSTITUCIÓN (Solo Admin General) */}
              {esAdminGeneral && (
                <button
                  type="button"
                  className="btn-open-modal-register"
                  style={{ backgroundColor: "#1e293b" }}
                  onClick={() => setIsModalInstOpen(true)}
                >
                  <span>🏥</span>
                  <span>Registrar institución</span>
                </button>
              )}

              {/* BOTÓN DE REGISTRAR USUARIO (solo administradores, rol 1 y 2) */}
              {puedeCrearUsuarios && (
                <button
                  type="button"
                  className="btn-open-modal-register"
                  onClick={() => setIsModalOpen(true)}
                >
                  <span>
                    <img
                      src="/assets/iconos_gestionU/agregar-usuario.png"
                      alt="DONAVIDA"
                    />
                  </span>
                  <span>Registrar usuario</span>
                </button>
              )}
            </div>
          </section>

          {/* TARJETAS KPI */}
          <section className="usuarios-kpi-grid">
            <div className="usuarios-kpi-card">
              <div className="usuarios-kpi-info">
                <span className="usuarios-kpi-title">Usuarios registrados</span>
                <h2 className="usuarios-kpi-number">{totalUsuarios}</h2>
              </div>
              <div className="usuarios-kpi-icon-badge badge-users-pink">
                <img
                  src="/assets/iconos_gestionU/usuarios.png"
                  alt="DONAVIDA"
                />
              </div>
            </div>

            <div className="usuarios-kpi-card">
              <div className="usuarios-kpi-info">
                <span className="usuarios-kpi-title">Cuentas activas</span>
                <h2 className="usuarios-kpi-number">{cuentasActivas}</h2>
              </div>
              <div className="usuarios-kpi-icon-badge badge-users-green">
                <img
                  src="/assets/iconos_gestionU/usuario-activo.png"
                  alt="DONAVIDA"
                />
              </div>
            </div>

            <div className="usuarios-kpi-card">
              <div className="usuarios-kpi-info">
                <span className="usuarios-kpi-title">Cuentas dadas de baja</span>
                <h2 className="usuarios-kpi-number">{cuentasInactivas}</h2>
              </div>
              <div className="usuarios-kpi-icon-badge badge-users-gray">
                <img
                  src="/assets/iconos_gestionU/usuario-inactivo.png"
                  alt="DONAVIDA"
                />
              </div>
            </div>
          </section>

          {/* TARJETA PRINCIPAL: FILTROS Y TABLA DE USUARIOS */}
          <section className="usuarios-table-card">
            <div className="usuarios-filters-toolbar">
              <div className="usuarios-search-input-wrapper">
                <span className="usuarios-search-icon">
                  <img
                    src="/assets/iconos_sidenavbar/busqueda.png"
                    alt="DONAVIDA"
                  />
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
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.id}>
                      Rol: {r.nombre}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-select-dropdown"
                  value={filtroInstitucion}
                  onChange={(e) => setFiltroInstitucion(e.target.value)}
                >
                  <option value="todas">Institución: Todas</option>
                  {institucionesList.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-select-dropdown"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="todos">Estado: Todos</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Dado de baja</option>
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

              {usuariosFiltrados.length === 0 ? (
                <div className="usuarios-table-blank-notice">
                  <span className="usuarios-table-blank-title">{esAdminGeneral ? 'No hay usuarios registrados' : 'Aún no has creado usuarios'}</span>
                  {!esAdminGeneral && (
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                      Los usuarios que registres aparecerán aquí.
                    </span>
                  )}
                </div>
              ) : (
                usuariosFiltrados.map((u) => (
                  <div className="usuarios-table-row" key={u.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <span>{u.nombre}</span>
                    <span>{u.email}</span>
                    <span>{u.rol}</span>
                    <span>{u.institucion}</span>
                    <span>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', backgroundColor: u.activo ? '#dcfce7' : '#f1f5f9', color: u.activo ? '#166534' : '#64748b' }}>
                        {u.activo ? 'Activo' : 'Dado de baja'}
                      </span>
                    </span>
                    <span>{u.created_at ? u.created_at.substring(0, 10) : 'N/A'}</span>
                    <span style={{ display: 'flex', gap: '6px' }}>
                      {u.activo ? (
                        <button
                          type="button"
                          onClick={() => handleCambiarEstado(u)}
                          style={{ background: '#fef3c7', color: '#92400e', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Dar de baja
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCambiarEstado(u)}
                          style={{ background: '#dcfce7', color: '#166534', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Reactivar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEliminar(u.id)}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Eliminar
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>

            <footer className="usuarios-pagination-footer">
              <span>Mostrando {usuariosFiltrados.length} de {usuariosList.length} usuarios</span>
              <div className="pagination-controls">
                <button type="button" className="pagination-btn" disabled>‹</button>
                <button type="button" className="pagination-btn active">1</button>
                <button type="button" className="pagination-btn" disabled>›</button>
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
          console.log("[USUARIOS] Nuevo usuario registrado:", nuevoUsuario);
          cargarUsuarios();
          setIsModalOpen(false);
        }}
      />

      {/* MODAL DE REGISTRO DE INSTITUCIÓN */}
      <ModalRegistrarInstitucion
        isOpen={isModalInstOpen}
        onClose={() => setIsModalInstOpen(false)}
        onSaveSuccess={() => {
          cargarUsuarios();
          setIsModalInstOpen(false);
        }}
      />

      {/* Aviso y confirmación sencillos (modal) en lugar de alert()/confirm() */}
      <ModalAviso
        isOpen={!!aviso}
        titulo={aviso?.titulo || 'Aviso'}
        mensaje={aviso?.mensaje}
        onClose={() => setAviso(null)}
      />
      <ModalAviso
        isOpen={!!confirmacion}
        tipo="confirmacion"
        titulo={confirmacion?.titulo || 'Confirmar'}
        mensaje={confirmacion?.mensaje}
        textoAceptar={confirmacion?.textoAceptar || 'Aceptar'}
        onAceptar={() => {
          const accion = confirmacion?.onAceptar;
          setConfirmacion(null);
          if (accion) accion();
        }}
        onClose={() => setConfirmacion(null)}
      />
    </div>
  );
}