import React from 'react';
import './ModalRegistrarSalida.css';

// Modal para registrar la salida de una unidad del inventario
// (usada o caducada). Es presentacional: el padre confirma la salida
// con el servicio y muestra el resultado con ModalAviso.
export default function ModalRegistrarSalida({
  isOpen,
  unidad,
  motivo,
  onMotivoChange,
  onConfirmar,
  onClose,
  cargando,
}) {
  if (!isOpen || !unidad) return null;

  return (
    <div className="msal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="msal-card" onClick={(e) => e.stopPropagation()}>
        <header className="msal-header">
          <div className="msal-title-group">
            <h2>Registrar salida</h2>
            <p>La unidad dejará de estar disponible en el inventario</p>
          </div>
          <button type="button" className="msal-close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="msal-body">
          <div className="msal-unidad-resumen">
            <span className="msal-unidad-folio">{unidad.folio}</span>
            <span className="msal-unidad-detalle">{unidad.tipo} · {unidad.hemocomponente}</span>
            <span className="msal-unidad-detalle">Caducidad: {unidad.caducidad || 'N/D'}</span>
          </div>

          <label className="msal-label">Motivo de la salida</label>
          <div className="msal-opciones">
            <button
              type="button"
              className={`msal-opcion ${motivo === 'usada' ? 'active' : ''}`}
              onClick={() => onMotivoChange('usada')}
            >
              <strong>Usada</strong>
              <span>La unidad fue utilizada (transfusión)</span>
            </button>
            <button
              type="button"
              className={`msal-opcion ${motivo === 'caducada' ? 'active' : ''}`}
              onClick={() => onMotivoChange('caducada')}
            >
              <strong>Caducada</strong>
              <span>La unidad caducó sin utilizarse</span>
            </button>
          </div>
        </div>

        <footer className="msal-footer">
          <button type="button" className="msal-btn-cancelar" onClick={onClose} disabled={cargando}>
            Cancelar
          </button>
          <button type="button" className="msal-btn-aceptar" onClick={onConfirmar} disabled={cargando}>
            {cargando ? 'Registrando...' : 'Registrar salida'}
          </button>
        </footer>
      </div>
    </div>
  );
}
