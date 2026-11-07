import React, { useState } from 'react';
import './StockInventario.css';
import { Sidebar, Navbar } from '../../components/layout';

export default function StockInventario({ usuario, onCambiarModulo, onLogout }) {
  // Hospital seleccionado en el filtro
  const [hospitalSeleccionado, setHospitalSeleccionado] = useState('Hospital General');

  // KPIs Superiores (Conectar con endpoint)
  const [kpis, setKpis] = useState({
    unidadesDisponibles: 0,
    tiposConExistencia: 0,
    bajoMinimo: 0,
    totalCombinaciones: 0,
    sinExistencias: 0,
    detalleSinExistencias: 'Sin incidencias',
    porCaducar: 0,
    diasCaducidad: 7
  });

  // Matriz de existencias (Conectar con back)
  const [matrizStock, setMatrizStock] = useState([]);

  // Totales de las columnas de la matriz (0 en blanco)
  const [totalesColumnas, setTotalesColumnas] = useState({
    sangreTotal: 0,
    concEritrocitario: 0,
    plasmaFresco: 0,
    plaquetas: 0,
    granTotal: 0
  });

  // Alertas de Stock (Conectar con GET /api/stock/alertas)
  const [alertasStock, setAlertasStock] = useState([]);

  // Unidades Próximas a Caducar (GET /api/stock/proximas-caducar)
  const [unidadesCaducidad, setUnidadesCaducidad] = useState([]);

  // Renderizador de cada celda de la matriz según su estado
  const renderCeldaStock = (celda) => {
    if (!celda) return null;

    if (celda.estado === 'sin_existencia') {
      return (
        <div className="stock-cell-box cell-sin-existencia">
          <span className="stock-cell-cant">0</span>
          <span className="stock-cell-tag-danger">Sin existencias</span>
        </div>
      );
    }
    if (celda.estado === 'bajo') {
      return (
        <div className="stock-cell-box cell-bajo-minimo">
          <span className="stock-cell-cant">{celda.cant}</span>
          <span className="stock-cell-sub">mín. {celda.min}</span>
        </div>
      );
    }
    return (
      <div className="stock-cell-box cell-normal">
        <span className="stock-cell-cant">{celda.cant}</span>
        <span className="stock-cell-sub">mín. {celda.min}</span>
      </div>
    );
  };

  return (
    <div className="dona-page-wrapper">
      <Sidebar
        usuario={usuario}
        moduloActivo="stock"
        onCambiarModulo={onCambiarModulo}
        onLogout={onLogout}
      />

      <div className="dona-main-area">
        <Navbar
          usuario={usuario}
          placeholder="Buscar unidad, folio o solicitud..."
        />

        {/* CONTENIDO DEL MÓDULO */}
        <main className="dona-content-body stock-content-body">
          <section className="stock-page-header">
            <div className="stock-title-group">
              <h1>Stock de inventario</h1>
              <p>Existencias por tipo de sangre y hemocomponente frente al mínimo configurado</p>
            </div>

            <div className="stock-header-actions">
              <div className="stock-hospital-selector-wrapper">
                <span className="stock-hospital-icon">
                  <img src="/src/assets/iconos_registroU/edificio.png" alt="Icono de hospital" />
                </span>
                <select
                  className="stock-hospital-select"
                  value={hospitalSeleccionado}
                  onChange={(e) => setHospitalSeleccionado(e.target.value)}
                >
                  <option value="Hospital General">Hospital General</option>
                  <option value="Hospital Civil Aurelio Valdivieso">Hospital Civil Aurelio Valdivieso</option>
                  <option value="Hospital de Especialidades">Hospital de Especialidades</option>
                </select>
              </div>

              <button
                type="button"
                className="stock-btn-config"
                onClick={() => {
                  /* Conectar con modal (FALTA POR HACER)*/
                  alert('Configuración de umbrales mínimos (Modal en desarrollo / Conexión backend)');
                }}
              >
                <span className="stock-action-icon">
                  <img src="/src/assets/iconos_stockU/ajustes.png" alt="Icono de configuración" />
                </span>
                <span>Configurar mínimos</span>
              </button>
            </div>
          </section>

          {/* Conectar con endpoint para el resumen*/}
          <section className="stock-kpi-grid">
            {/* KPI 1: Unidades Disponibles */}
            <div className="stock-kpi-card">
              <div className="stock-kpi-header">
                <span className="stock-kpi-label">Unidades disponibles</span>
                <span className="stock-kpi-badge badge-blood">
                  <img src="/src/assets/iconos_dash/sangre.png" alt="Sangre" className="stock-kpi-icon-img" />
                </span>
              </div>
              <div className="stock-kpi-value">{kpis.unidadesDisponibles}</div>
              <span className="stock-kpi-subtext">En {kpis.tiposConExistencia} tipos de sangre</span>
            </div>

            {/* KPI 2: Bajo el mínimo */}
            <div className="stock-kpi-card">
              <div className="stock-kpi-header">
                <span className="stock-kpi-label">Bajo el mínimo</span>
                <span className="stock-kpi-badge badge-warning">
                  <img src="/src/assets/iconos_dash/advertencia.png" alt="Alerta" className="stock-kpi-icon-img" />
                </span>
              </div>
              <div className="stock-kpi-value">{kpis.bajoMinimo}</div>
              <span className="stock-kpi-subtext text-warning-strong">
                De {kpis.totalCombinaciones} combinaciones
              </span>
            </div>

            {/* KPI 3: Sin existencias */}
            <div className="stock-kpi-card">
              <div className="stock-kpi-header">
                <span className="stock-kpi-label">Sin existencias</span>
                <span className="stock-kpi-badge badge-danger">
                  <img src="/src/assets/iconos_stockU/prohibido.png" alt="Prohibido" className="stock-kpi-icon-img" />
                </span>
              </div>
              <div className="stock-kpi-value">{kpis.sinExistencias}</div>
              <span className="stock-kpi-subtext text-danger-strong">{kpis.detalleSinExistencias}</span>
            </div>

            {/* KPI 4: Por caducar */}
            <div className="stock-kpi-card">
              <div className="stock-kpi-header">
                <span className="stock-kpi-label">Por caducar</span>
                <span className="stock-kpi-badge badge-clock">
                  <img src="/src/assets/iconos_dash/reloj.png" alt="Reloj" className="stock-kpi-icon-img" />
                </span>
              </div>
              <div className="stock-kpi-value">{kpis.porCaducar}</div>
              <span className="stock-kpi-subtext text-amber-strong">
                En los próximos {kpis.diasCaducidad} días
              </span>
            </div>
          </section>

          {/* SECCIÓN INTERMEDIA: MATRIZ DE STOCK + ALERTAS*/}
          <section className="stock-middle-grid">
            {/* TARJETA IZQUIERDA: MATRIZ POR TIPO Y HEMOCOMPONENTE */}
            <div className="stock-card stock-matrix-card">
              <div className="stock-card-header">
                <div className="stock-card-title-group">
                  <h2 className="stock-card-title">Existencias por tipo de sangre</h2>
                  <p className="stock-card-subtitle">Unidades disponibles y mínimo configurado por celda</p>
                </div>

                {/* Leyenda de colores */}
                <div className="stock-matrix-legend">
                  <div className="legend-item">
                    <span className="legend-indicator indicator-normal"></span>
                    <span>Normal</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-indicator indicator-bajo"></span>
                    <span>Bajo mínimo</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-indicator indicator-sin-existencia"></span>
                    <span>Sin existencias</span>
                  </div>
                </div>
              </div>

              {/* TABLA MATRIZ */}
              <div className="stock-matrix-table-container">
                <table className="stock-matrix-table">
                  <thead>
                    <tr>
                      <th className="th-tipo">TIPO</th>
                      <th>
                        <div className="th-hemo-header">
                          <span className="th-hemo-name">Sangre total</span>
                          <span className="th-hemo-sub">450 ml · 35 d</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-hemo-header">
                          <span className="th-hemo-name">Conc. eritrocitario</span>
                          <span className="th-hemo-sub">300 ml · 42 d</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-hemo-header">
                          <span className="th-hemo-name">Plasma fresco</span>
                          <span className="th-hemo-sub">250 ml · 365 d</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-hemo-header">
                          <span className="th-hemo-name">Plaquetas</span>
                          <span className="th-hemo-sub">250 ml · 5 d</span>
                        </div>
                      </th>
                      <th className="th-total">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrizStock.length > 0 ? (
                      matrizStock.map((row) => (
                        <tr key={row.tipo} className="stock-matrix-row">
                          <td className="cell-tipo-sangre">
                            <span className={`blood-badge blood-${row.tipo.replace('+', 'pos').replace('-', 'neg')}`}>
                              {row.tipo}
                            </span>
                          </td>
                          <td className="cell-stock-val">{renderCeldaStock(row.sangreTotal)}</td>
                          <td className="cell-stock-val">{renderCeldaStock(row.concEritrocitario)}</td>
                          <td className="cell-stock-val">{renderCeldaStock(row.plasmaFresco)}</td>
                          <td className="cell-stock-val">{renderCeldaStock(row.plaquetas)}</td>
                          <td className="cell-row-total">{row.total}</td>
                        </tr>
                      ))
                    ) : (
                      /* [BACKEND]: Estado vacío inicial señalizado */
                      <tr>
                        <td colSpan="6" className="stock-empty-cell">
                          <div className="stock-empty-placeholder">
                            <p className="stock-empty-title">Sin existencias registradas en el inventario (0)</p>
                            <span className="stock-empty-sub">
                              Aquí se mapeará la matriz de existencias y mínimos devuelta con GET
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {matrizStock.length > 0 && (
                    <tfoot>
                      <tr className="stock-matrix-tfoot-row">
                        <td className="tfoot-label">Total</td>
                        <td className="tfoot-col-total">{totalesColumnas.sangreTotal}</td>
                        <td className="tfoot-col-total">{totalesColumnas.concEritrocitario}</td>
                        <td className="tfoot-col-total">{totalesColumnas.plasmaFresco}</td>
                        <td className="tfoot-col-total">{totalesColumnas.plaquetas}</td>
                        <td className="tfoot-gran-total">{totalesColumnas.granTotal}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* TARJETA DERECHA: ALERTAS DE STOCK */}
            <div className="stock-card stock-alerts-card">
              <div className="stock-card-header">
                <div className="stock-card-title-group">
                  <div className="stock-alerts-title-row">
                    <h2 className="stock-card-title">Alertas de stock</h2>
                    <span className="stock-alerts-counter-badge">{alertasStock.length}</span>
                  </div>
                  <p className="stock-card-subtitle">Requieren atención</p>
                </div>
              </div>

              {/* LISTA DE ALERTAS */}
              {alertasStock.length > 0 ? (
                <div className="stock-alerts-list">
                  {alertasStock.map((alerta) => (
                    <div key={alerta.id} className="stock-alert-item">
                      <div className="stock-alert-icon-col">
                        {alerta.tipoAlerta === 'critica' && (
                          <div className="stock-alert-icon-badge alert-critica">
                            <img src="/src/assets/iconos_stockU/prohibido.png" alt="Prohibido" className="stock-kpi-icon-img" />
                          </div>
                        )}
                        {alerta.tipoAlerta === 'advertencia' && (
                          <div className="stock-alert-icon-badge alert-advertencia">
                            <img src="/src/assets/iconos_dash/advertencia.png" alt="Advertencia" className="stock-kpi-icon-img" />
                          </div>
                        )}
                        {alerta.tipoAlerta === 'caducidad' && (
                          <div className="stock-alert-icon-badge alert-caducidad">
                            <img src="/src/assets/iconos_dash/reloj.png" alt="Reloj" className="stock-kpi-icon-img" />
                          </div>
                        )}
                      </div>

                      <div className="stock-alert-info">
                        <span className="stock-alert-title">{alerta.titulo}</span>
                        <span className="stock-alert-desc">{alerta.descripcion}</span>
                      </div>

                      <div className="stock-alert-time">{alerta.tiempo}</div>
                    </div>
                  ))}
                </div>
              ) : (
                /* [BACKEND]: Estado vacío inicial de alertas */
                <div className="stock-alerts-empty">
                  <p className="stock-empty-title">Sin alertas de stock pendientes (0)</p>
                  <span className="stock-empty-sub">
                    Aquí se listarán las alertas generadas al ocupar GET cuando existan niveles por debajo del mínimo o unidades por caducar.
                  </span>
                </div>
              )}

              {/* Botón ver todas las alertas */}
              <button
                type="button"
                className="stock-btn-see-all-alerts"
                onClick={() => {
                  /* Navegación a histórico */
                  onCambiarModulo && onCambiarModulo('historico');
                }}
              >
                Ver todas las alertas
              </button>
            </div>
          </section>

          {/* SECCIÓN INFERIOR: PRÓXIMAS A CADUCAR
              Conectar con GET (endpoint)*/}
          <section className="stock-card stock-expiring-card">
            <div className="stock-card-header">
              <div className="stock-card-title-group">
                <h2 className="stock-card-title">Próximas a caducar</h2>
                <p className="stock-card-subtitle">
                  Unidades con caducidad en los próximos 7 días · {unidadesCaducidad.length} en total
                </p>
              </div>

              <button
                type="button"
                className="stock-link-see-all"
                onClick={() => onCambiarModulo && onCambiarModulo('historico')}
              >
                Ver todas
              </button>
            </div>

            {/* TABLA DE UNIDADES POR CADUCAR */}
            <div className="stock-expiring-table-container">
              <table className="stock-expiring-table">
                <thead>
                  <tr>
                    <th>CÓDIGO DE UNIDAD</th>
                    <th>TIPO</th>
                    <th>HEMOCOMPONENTE</th>
                    <th>FECHA DE EXTRACCIÓN</th>
                    <th>FECHA DE CADUCIDAD</th>
                    <th>VIGENCIA RESTANTE</th>
                  </tr>
                </thead>
                <tbody>
                  {unidadesCaducidad.length > 0 ? (
                    unidadesCaducidad.map((u) => (
                      <tr key={u.codigo} className="stock-expiring-row">
                        <td className="cell-unit-code">{u.codigo}</td>
                        <td>
                          <span className={`blood-badge blood-${u.tipo.replace('+', 'pos').replace('-', 'neg')}`}>
                            {u.tipo}
                          </span>
                        </td>
                        <td className="cell-unit-hemo">{u.hemocomponente}</td>
                        <td className="cell-unit-date">{u.fechaExtraccion}</td>
                        <td className="cell-unit-date">{u.fechaCaducidad}</td>
                        <td>
                          <span className="stock-vigencia-badge">
                            <span className="vigencia-dot"></span>
                            {u.vigenciaRestante}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    /* Estado vacío inicial */
                    <tr>
                      <td colSpan="6" className="stock-empty-cell">
                        <div className="stock-empty-placeholder">
                          <p className="stock-empty-title">Sin unidades próximas a caducar (0)</p>
                          <span className="stock-empty-sub">
                            Aquí se listarán las unidades devueltas por el GET con caducidad cercana.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
