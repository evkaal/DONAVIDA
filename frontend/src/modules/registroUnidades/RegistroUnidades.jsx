import React, { useState, useEffect } from 'react';
import './RegistroUnidades.css';
import ModalRegistroUnidad from './ModalRegistroUnidad';
import { Sidebar } from '../../components/layout';
import { getUnidades } from '../../services/unidadesService';

export default function RegistroUnidades({ usuario, onCambiarModulo, onLogout }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [busquedaFolio, setBusquedaFolio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroHemo, setFiltroHemo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // LISTA DE UNIDADES REGISTRADAS
  const [unidades, setUnidades] = useState([]);

  const usuarioSesion = usuario || JSON.parse(localStorage.getItem('usuario') || '{}');
  // La institución es solo la de la sesión (del JWT/login). Sin fallback a
  // localStorage ni a otra institución: un usuario sin institución no ve
  // unidades de nadie, ve el aviso de "Sin institución asignada".
  const institucionIdSesion = usuarioSesion?.institucion_id ?? null;
  const esAdminGeneral = usuarioSesion?.rol_id === 1;
  const sinInstitucion = !esAdminGeneral && !institucionIdSesion;

  const cargarUnidades = async () => {
    if (sinInstitucion) {
      setUnidades([]);
      return;
    }
    try {
      const data = await getUnidades(institucionIdSesion);
      const lista = Array.isArray(data) ? data : [];
      setUnidades(lista.map((u) => ({
        folio: u.folio || u.codigo || 'N/D',
        tipo: u.tipo || u.tipoSangre || 'O+',
        hemocomponente: u.hemocomponente || 'Concentrado eritrocitario',
        fechaIngreso: u.fechaExtraccion || u.fechaIngreso || '',
        caducidad: u.fechaCaducidad || u.caducidad || '',
        estado: u.estado || 'Disponible',
      })));
    } catch (err) {
      console.error("Error al cargar unidades:", err);
    }
  };

  useEffect(() => { cargarUnidades(); }, []);

  const handleGuardarUnidad = () => {
    // El modal ya registró la unidad en la API; recargamos la tabla real.
    cargarUnidades();
  };

  const unidadesFiltradas = unidades.filter((u) => {
    const folioTexto = u.folio || u.codigo || '';
    const coincideFolio = folioTexto.toLowerCase().includes(busquedaFolio.toLowerCase());
    
    const coincideTipo = filtroTipo === 'todos' || u.tipo === filtroTipo;
    const coincideHemo = filtroHemo === 'todos' || u.hemocomponente === filtroHemo;
    const coincideEstado = filtroEstado === 'todos' || (u.estado && u.estado.toLowerCase() === filtroEstado.toLowerCase());
    
    return coincideFolio && coincideTipo && coincideHemo && coincideEstado;
  });

  return (
    <div className="dona-page-wrapper" style={{ width: '100%' }}>
      <Sidebar
        usuario={usuario}
        moduloActivo="registro"
        onCambiarModulo={onCambiarModulo}
        onLogout={onLogout}
      />
      {/* ÁREA PRINCIPAL */}
      <div className="dona-main-area" style={{ width: '100%', margin: 0 }}>
        <main className="dona-content-body">
          <section className="reg-page-header">
            <div className="reg-title-wrapper">
              <div className="reg-title-row">
                <h1>Registro de unidades</h1>
              </div>
              <p>Unidades de hemocomponentes ingresadas al inventario</p>
            </div>

            <button
              type="button"
              className="btn-open-modal-reg"
              onClick={() => setIsModalOpen(true)}
              disabled={sinInstitucion}
              title={sinInstitucion ? 'Tu usuario no tiene institución asignada' : undefined}
            >
              <span className="reg-action-icon">
                <img src="/assets/iconos_registroU/agregar.png" alt="" />
              </span>
              <span>Registrar unidad</span>
            </button>
          </section>

          {/* Aviso cuando el usuario no tiene institución asignada */}
          {sinInstitucion && (
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.95rem' }}>
              <strong>Sin institución asignada.</strong> Pide al administrador general que te asigne una institución.
            </div>
          )}

          {/* Tarjeta de Tabla y Filtros */}
          <section className="reg-table-card">
            {/* Barra de filtros */}
            <div className="reg-filters-toolbar">
              <div className="reg-search-input-wrapper">
                <span className="reg-search-icon">
                  <img src="/assets/iconos_sidenavbar/busqueda.png" alt="" />
                </span>
                <input
                  type="text"
                  className="reg-search-input"
                  placeholder="Buscar por folio..."
                  value={busquedaFolio}
                  onChange={(e) => setBusquedaFolio(e.target.value)}
                />
              </div>

              <div className="reg-selects-group">
                <div className="reg-custom-select-wrapper">
                  <select className="reg-filter-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                    <option value="todos">Tipo sanguíneo</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="reg-custom-select-wrapper">
                  <select className="reg-filter-select" value={filtroHemo} onChange={(e) => setFiltroHemo(e.target.value)}>
                    <option value="todos">Hemocomponente</option>
                    <option value="Concentrado eritrocitario">Concentrado eritrocitario</option>
                    <option value="Sangre total">Sangre total</option>
                    <option value="Plaquetas">Plaquetas</option>
                    <option value="Plasma fresco">Plasma fresco</option>
                    <option value="Crioprecipitado">Crioprecipitado</option>
                  </select>
                </div>

                <div className="reg-custom-select-wrapper">
                  <select className="reg-filter-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="todos">Estado</option>
                    <option value="disponible">Disponible</option>
                    <option value="entregada">Entregada</option>
                    <option value="por caducar">Por caducar</option>
                    <option value="reservada">Reservada</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TABLA DE REGISTRO DE UNIDADES */}
            <div className="reg-table-container">
              <table className="reg-table">
                <thead>
                  <tr>
                    <th>FOLIO</th>
                    <th>TIPO</th>
                    <th>HEMOCOMPONENTE</th>
                    <th>FECHA DE INGRESO</th>
                    <th>CADUCIDAD</th>
                    <th>ESTADO</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {unidadesFiltradas.length > 0 ? (
                    unidadesFiltradas.map((u, idx) => (
                      <tr key={u.folio || idx} className="reg-table-row">
                        <td className="cell-folio">{u.folio}</td>
                        <td>
                          <span className={`blood-badge blood-${u.tipo?.replace('+', 'pos').replace('-', 'neg')}`}>
                            {u.tipo}
                          </span>
                        </td>
                        <td className="cell-hemo">{u.hemocomponente}</td>
                        <td className="cell-date">{u.fechaIngreso}</td>
                        <td className="cell-date">{u.caducidad}</td>
                        <td>
                          <span className={`status-badge status-${u.estado?.toLowerCase().replace(/\s+/g, '-')}`}>
                            <span className="status-dot"></span>
                            {u.estado}
                          </span>
                        </td>
                        <td className="cell-actions">
                          <button type="button" className="btn-row-menu" title="Acciones">
                            •••
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="reg-table-empty-cell">
                        <div className="reg-empty-placeholder">
                          <p className="reg-empty-title">Sin unidades registradas hoy (0)</p>
                          <span className="reg-empty-sub">
                            Haz clic en <strong>"+ Registrar unidad"</strong> para ingresar un registro.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie de tabla / Paginación */}
            <div className="reg-pagination-footer">
              <span>Mostrando {unidadesFiltradas.length} de {unidades.length} unidades</span>
              <div className="reg-pagination-controls">
                <button type="button" className="reg-pagination-btn" disabled>‹</button>
                <button type="button" className="reg-pagination-btn active">1</button>
                <button type="button" className="reg-pagination-btn" disabled>›</button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* MODAL DE REGISTRO DE UNIDAD */}
      <ModalRegistroUnidad
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={handleGuardarUnidad}
        usuario={usuario}
      />
    </div>
  );
}