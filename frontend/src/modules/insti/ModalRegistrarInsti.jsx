import React, { useState } from 'react';
import './ModalRegistrarInsti.css';
import { registrarInstitucion } from '../../services/usuariosService';

export default function ModalRegistrarInsti({ isOpen, onClose, onSaveSuccess }) {
  const [nombre, setNombre] = useState('');
  const [tipoInstitucionId, setTipoInstitucionId] = useState(1);
  const [coloniaId, setColoniaId] = useState(1); // ID temporal de colonia (ej. 1)
  const [telefono, setTelefono] = useState('');
  const [calleNumero, setCalleNumero] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim() || !calleNumero.trim()) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }

    setCargando(true);
    try {
      await registrarInstitucion({
        nombre: nombre.trim(),
        tipo_institucion_id: Number(tipoInstitucionId),
        colonia_id: Number(coloniaId),
        telefono: telefono.trim(),
        calle_numero: calleNumero.trim()
      });

      alert('¡Institución registrada con éxito!');
      if (onSaveSuccess) onSaveSuccess();
      
      // Limpiar
      setNombre('');
      setTelefono('');
      setCalleNumero('');
      onClose();
    } catch (err) {
      console.error("Error al registrar institución:", err);
      alert("Hubo un error al registrar la institución en la base de datos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mreg-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mreg-card" onClick={(e) => e.stopPropagation()}>
        <header className="mreg-header">
          <div className="mreg-title-group">
            <h2>Registrar nueva institución</h2>
            <p>Añade un nuevo hospital o banco de sangre al sistema</p>
          </div>
          <button type="button" className="mreg-close-btn" onClick={onClose}>✕</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="mreg-body">
            <div className="form-group-modal">
              <label className="form-label-modal">Nombre de la Institución</label>
              <input
                type="text"
                className="input-field-modal"
                placeholder="Ej. Hospital General de Oaxaca"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="form-group-modal">
              <label className="form-label-modal">Tipo de Institución</label>
              <select
                className="input-field-modal"
                value={tipoInstitucionId}
                onChange={(e) => setTipoInstitucionId(e.target.value)}
              >
                <option value={1}>Hospital General</option>
                <option value={2}>Banco de Sangre</option>
                <option value={3}>Clínica / Centro de Salud</option>
              </select>
            </div>

            <div className="form-group-modal">
              <label className="form-label-modal">ID de Colonia (Temporal)</label>
              <input
                type="number"
                className="input-field-modal"
                value={coloniaId}
                onChange={(e) => setColoniaId(e.target.value)}
                required
              />
            </div>

            <div className="form-group-modal">
              <label className="form-label-modal">Teléfono de contacto</label>
              <input
                type="text"
                className="input-field-modal"
                placeholder="Ej. 9511234567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
              />
            </div>

            <div className="form-group-modal">
              <label className="form-label-modal">Calle y Número</label>
              <input
                type="text"
                className="input-field-modal"
                placeholder="Ej. Av. Independencia #1200"
                value={calleNumero}
                onChange={(e) => setCalleNumero(e.target.value)}
                required
              />
            </div>
          </div>

          <footer className="mreg-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-modal-primary" disabled={cargando}>
              {cargando ? 'Registrando...' : 'Guardar institución'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}