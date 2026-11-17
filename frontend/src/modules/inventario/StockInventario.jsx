import React, { useState, useEffect } from 'react';
import './StockInventario.css';
import { obtenerStockInstitucion } from '../../services/stockService';

export default function StockInventario() {
  const [stockData, setStockData] = useState({
    kpis: { disponibles: 0, bajoMinimo: 0, sinExistencias: 0, porCaducar: 0 },
    matriz: [],
    alertas: []
  });

  useEffect(() => {
    // 1. Obtener la institución y rol del usuario logueado desde localStorage
    const institucionId = localStorage.getItem('institucion_id');
    const rolId = localStorage.getItem('rol_id');

    // 2. Cargar el stock exclusivamente para su institución
    const cargarStockPropio = async () => {
      const data = await obtenerStockInstitucion(institucionId);
      if (data) {
        setStockData(data);
      }
    };

    cargarStockPropio();
  }, []);

  return (
    <div className="stock-inventario-container">
      {/* Encabezado limpio sin selector abierto, o con el nombre de su propia institución */}
      <div className="stock-header">
        <div>
          <h1>Stock de inventario</h1>
          <p>Existencias y hemocomponentes de tu institución asignada</p>
        </div>
      </div>

      {/* Resto de tus tarjetas KPI y tablas que ya armamos... */}
    </div>
  );
}