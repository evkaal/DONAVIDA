import React, { useState, useEffect } from "react";
import "./GestionUsuarios.css";
import { Sidebar, Navbar } from "../../components/layout";
import ModalRegistrarUsuario from "./ModalRegistrarUsuario";
import { obtenerInstituciones, obtenerUsuarios, eliminarUsuarioService } from "../../services/usuariosService"; // Asegúrate de tener este servicio
import ModalRegistrarInstitucion from "../insti/ModalRegistrarInsti";
import { AArrowUp } from "lucide-react";


export default function GestionUsuarios({
  usuario,
  onCambiarModulo,
  onLogout,
}) {


  const userState = usuario || JSON.parse(localStorage.getItem('usuario') || '{}');
  const esAdminGeneral = userState?.rol_id === 1;
  // Estado para controlar la apertura del modal de registro
  const [isModalOpen, setIsModalOpen] = useState(false);
const [isModalInstOpen, setIsModalInstOpen]= useState(false);

const [usuariosList, setUsuariosList] = useState([]




)
 

// Función para cargar usuarios
const cargarUsuarios = async () => {
  const data = await obtenerUsuarios();
  setUsuariosList(data);
};
  // Estados de los filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroInstitucion, setFiltroInstitucion] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Estado para almacenar la lista de instituciones dinámicas desde la BD
  const [institucionesList, setInstitucionesList] = useState([]);

  // Cargar las instituciones reales al montar el componente
  useEffect(() => {
    obtenerInstituciones()
      .then((data) => setInstitucionesList(data || []))
      .catch((err) =>
        console.error("Error al cargar instituciones en filtros:", err),
      );
cargarUsuarios();


  }, []);


  const handleEliminar = async (id) => {
  if (window.confirm("¿Estás seguro de eliminar este usuario del sistema?")) {
    try {
      await eliminarUsuarioService(id);
      alert("Usuario eliminado con éxito");
      cargarUsuarios(); // Recargar la tabla
    } catch (err) {
      console.error("Error al eliminar:", err);
      alert("No se pudo eliminar el usuario.");
    }
  }
};

  // Datos del perfil activo
  const nombreUsuario = usuario?.nombre || "Admin DONAVIDA";
  const institucionUsuario = usuario?.institucion || "Administrador · Sistema";
  const avatarIniciales = usuario?.rol === "admin" ? "AD" : "U";

// --- CÁLCULO DINÁMICO PARA LAS TARJETAS KPI ---
  const totalUsuarios = usuariosList.length;
  const cuentasActivas = usuariosList.filter(u => u.activo === true).length;
  const cuentasInactivas = usuariosList.filter(u => u.activo === false).length;




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
              <p>
                Administra las cuentas del personal de hospitales y bancos de
                sangre
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

              {/* BOTÓN DE REGISTRAR USUARIO */}
              <button
                type="button"
                className="btn-open-modal-register"
                onClick={() => setIsModalOpen(true)}
              >
                <span>
                  <img
                    src="/src/assets/iconos_gestionU/agregar-usuario.png"
                    alt="DONAVIDA"
                  />
                </span>
                <span>Registrar usuario</span>
              </button>
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
                  src="/src/assets/iconos_gestionU/usuarios.png"
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
                  src="/src/assets/iconos_gestionU/usuario-activo.png"
                  alt="DONAVIDA"
                />
              </div>
            </div>

            <div className="usuarios-kpi-card">
              <div className="usuarios-kpi-info">
                <span className="usuarios-kpi-title">Cuentas inactivas</span>
                <h2 className="usuarios-kpi-number">{cuentasInactivas}</h2>
              </div>
              <div className="usuarios-kpi-icon-badge badge-users-gray">
                <img
                  src="/src/assets/iconos_gestionU/usuario-inactivo.png"
                  alt="DONAVIDA"
                />
              </div>
            </div>
          </section>

          {/* TARJETA PRINCIPAL: FILTROS Y TABLA DE USUARIOS*/}
          <section className="usuarios-table-card">
            <div className="usuarios-filters-toolbar">
              <div className="usuarios-search-input-wrapper">
                <span className="usuarios-search-icon">
                  <img
                    src="/src/assets/iconos_sidenavbar/busqueda.png"
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
                  <option value="Personal medico">Personal Médico</option>
                  <option value="Admin Institucional">
                    Admin Institucional
                  </option>
                  <option value="Administrador">Administrador</option>
                </select>

                {/* SELECT DE INSTITUCIONES DINÁMICO */}
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

  {usuariosList.length === 0 ? (
    <div className="usuarios-table-blank-notice">
      <span className="usuarios-table-blank-title">No hay usuarios registrados</span>
    </div>
  ) : (
    usuariosList.map((u) => (
      <div className="usuarios-table-row" key={u.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
        <span>{u.nombre}</span>
        <span>{u.email}</span>
        <span>{u.rol}</span>
        <span>{u.institucion}</span>
        <span>
          <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', backgroundColor: u.activo ? '#dcfce7' : '#f1f5f9', color: u.activo ? '#166534' : '#64748b' }}>
            {u.activo ? 'Activo' : 'Inactivo'}
          </span>
        </span>
        <span>{u.created_at ? u.created_at.substring(0, 10) : 'N/A'}</span>
        <span>
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
          console.log("[USUARIOS] Nuevo usuario registrado:", nuevoUsuario);
        }}
      />

      {/* MODAL DE REGISTRO DE INSTITUCIÓN */}
      <ModalRegistrarInstitucion
        isOpen={isModalInstOpen}
        onClose={() => setIsModalInstOpen(false)}
        onSaveSuccess={() => {
          // Opcional: puedes recargar datos o dejarlo listo para que aparezca en el select
        }}
      />
    </div>
  );
}
