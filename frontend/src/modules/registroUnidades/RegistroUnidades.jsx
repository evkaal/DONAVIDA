import React, { useState, useEffect } from 'react';
import { obtenerUsuarioSesion } from '../../services/sesionService';
import './RegistroUnidades.css';
import ModalRegistroUnidad from './ModalRegistroUnidad';
import ModalRegistrarSalida from './ModalRegistrarSalida';
import ModalAviso from '../../components/common/ModalAviso';
import { Sidebar, Navbar } from '../../components/layout';
import { getUnidades, registrarSalida } from '../../services/unidadesService';
import { obtenerHemocomponentes, obtenerTiposSangre, normalizarHemocomponente } from '../../services/catalogosService';

export default function RegistroUnidades({ usuario, onCambiarModulo, onLogout }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Salida de unidad (usada / caducada): la unidad seleccionada, el
  // motivo elegido y el aviso de resultado (modal, nunca alert).
  const [salidaUnidad, setSalidaUnidad] = useState(null);
  const [motivoSalida, setMotivoSalida] = useState('usada');
  const [salidaCargando, setSalidaCargando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const [busquedaFolio, setBusquedaFolio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroHemo, setFiltroHemo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // LISTA DE UNIDADES REGISTRADAS
  const [unidades, setUnidades] = useState([]);

  // Opciones de los filtros: del catálogo real de la BD, no hardcodeadas.
  // Si el catálogo falla, los filtros solo muestran la opción "todos".
  const [hemos, setHemos] = useState([]);
  const [tiposSangre, setTiposSangre] = useState([]);

  useEffect(() => {
    let cancelado = false;
    Promise.all([obtenerHemocomponentes(), obtenerTiposSangre()])
      .then(([h, t]) => {
        if (cancelado) return;
        setHemos(h.map((x) => x.nombre).filter(Boolean));
        setTiposSangre(t.map((x) => x.nombre).filter(Boolean));
      })
      .catch((err) => console.error("Error al cargar catálogos:", err));
    return () => { cancelado = true; };
  }, []);

  const usuarioSesion = usuario || obtenerUsuarioSesion();
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
        id: u.id,
        folio: u.folio || u.codigo || 'N/D',
        tipo: u.tipo || u.tipoSangre || '',
        // "Paquete globular" se muestra como "Concentrado eritrocitario":
        // es el mismo producto (ver catalogosService).
        hemocomponente: normalizarHemocomponente(u.hemocomponente || ''),
        // La columna real de la BD es fecha_extraccion: el término
        // correcto es "Fecha de extracción" (el formulario ya lo dice
        // así; la tabla decía "FECHA DE INGRESO").
        fechaExtraccion: u.fechaExtraccion || u.fechaIngreso || '',
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

  // Registrar la salida de la unidad seleccionada (usada o caducada).
  // Solo se puede dar salida a una unidad Disponible: el botón solo se
  // muestra en ese caso y el backend también lo valida.
  const confirmarSalida = async () => {
    if (!salidaUnidad) return;
    setSalidaCargando(true);
    try {
      await registrarSalida(salidaUnidad.id || salidaUnidad.folio, motivoSalida);
      setSalidaUnidad(null);
      setAviso({ titulo: 'Salida registrada', mensaje: 'Salida registrada con éxito.' });
      cargarUnidades();
    } catch (err) {
      setAviso({ titulo: 'Error', mensaje: String(err?.response?.data || err?.message || 'No se pudo registrar la salida.') });
    } finally {
      setSalidaCargando(false);
    }
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
        {/* Barra superior (buscador, campana, perfil): es el mismo Navbar
            que usan los demás módulos; antes esta vista era la única sin él. */}
        <Navbar usuario={usuario} />
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
                    {tiposSangre.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="reg-custom-select-wrapper">
                  <select className="reg-filter-select" value={filtroHemo} onChange={(e) => setFiltroHemo(e.target.value)}>
                    <option value="todos">Hemocomponente</option>
                    {hemos.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div className="reg-custom-select-wrapper">
                  <select className="reg-filter-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="todos">Estado</option>
                    <option value="disponible">Disponible</option>
                    <option value="entregada">Entregada</option>
                    <option value="por caducar">Por caducar</option>
                    <option value="reservada">Reservada</option>
                    <option value="caducada">Caducada</option>
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
                    <th>FECHA DE EXTRACCIÓN</th>
                    <th>CADUCIDAD</th>
                    <th>ESTADO</th>
                    <th style={{ width: '120px' }}></th>
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
                        <td className="cell-date">{u.fechaExtraccion}</td>
                        <td className="cell-date">{u.caducidad}</td>
                        <td>
                          <span className={`status-badge status-${u.estado?.toLowerCase().replace(/\s+/g, '-')}`}>
                            <span className="status-dot"></span>
                            {u.estado}
                          </span>
                        </td>
                        <td className="cell-actions">
                          {/* Solo una unidad Disponible puede tener salida:
                              es la única acción por fila (el botón ••• sin
                              función se eliminó). */}
                          {String(u.estado || '').toLowerCase() === 'disponible' && (
                            <button
                              type="button"
                              title="Registrar salida (usada o caducada)"
                              onClick={() => { setSalidaUnidad(u); setMotivoSalida('usada'); }}
                              style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                            >
                              Salida
                            </button>
                          )}
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

      {/* MODAL DE REGISTRO DE SALIDA (usada / caducada) */}
      <ModalRegistrarSalida
        isOpen={!!salidaUnidad}
        unidad={salidaUnidad}
        motivo={motivoSalida}
        onMotivoChange={setMotivoSalida}
        onConfirmar={confirmarSalida}
        onClose={() => setSalidaUnidad(null)}
        cargando={salidaCargando}
      />

      {/* Aviso sencillo (modal) en lugar de alert() */}
      <ModalAviso
        isOpen={!!aviso}
        titulo={aviso?.titulo || 'Aviso'}
        mensaje={aviso?.mensaje}
        onClose={() => setAviso(null)}
      />
    </div>
  );
}