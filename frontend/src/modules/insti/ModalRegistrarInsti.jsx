import React, { useState, useEffect } from 'react';
import './ModalRegistrarInsti.css';
import { registrarInstitucion, obtenerTiposInstitucion, obtenerColonias } from '../../services/usuariosService';

// Fallback si el catálogo aún no tiene datos sembrados en la BD.
const TIPOS_FALLBACK = [
  { id: 1, nombre: 'Hospital General' },
  { id: 2, nombre: 'Banco de sangre' },
  { id: 3, nombre: 'Clínica' },
];

export default function ModalRegistrarInsti({ isOpen, onClose, onSaveSuccess }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [calleNumero, setCalleNumero] = useState('');
  const [tipos, setTipos] = useState(TIPOS_FALLBACK);
  const [tipoInstitucionId, setTipoInstitucionId] = useState(1);
  const [colonias, setColonias] = useState([]);
  const [coloniaId, setColoniaId] = useState('');
  const [activa, setActiva] = useState(true);
  const [cargando, setCargando] = useState(false);

  // Cargar catálogos al abrir el modal.
  useEffect(() => {
    if (!isOpen) return;
    const cargar = async () => {
      const [tiposData, coloniasData] = await Promise.all([
        obtenerTiposInstitucion(),
        obtenerColonias(),
      ]);
      if (tiposData.length > 0) {
        setTipos(tiposData);
        setTipoInstitucionId(tiposData[0].id);
      }
      setColonias(coloniasData);
      if (coloniasData.length > 0) setColoniaId(String(coloniasData[0].id));
    };
    cargar();
  }, [isOpen]);

  if (!isOpen) return null;

  const coloniaSeleccionada = colonias.find((c) => String(c.id) === String(coloniaId));
  const codigoPostal = coloniaSeleccionada?.codigo_postal || '';

  const limpiar = () => {
    setNombre('');
    setTelefono('');
    setCalleNumero('');
    setActiva(true);
    if (colonias.length > 0) setColoniaId(String(colonias[0].id));
    if (tipos.length > 0) setTipoInstitucionId(tipos[0].id);
  };

  const guardar = async (guardarOtra) => {
    if (!nombre.trim() || !telefono.trim() || !calleNumero.trim()) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }
    if (!coloniaId) {
      alert('No hay colonias en el catálogo. Pídele al administrador que registre colonias primero.');
      return;
    }
    setCargando(true);
    try {
      await registrarInstitucion({
        nombre: nombre.trim(),
        tipo_institucion_id: Number(tipoInstitucionId),
        colonia_id: Number(coloniaId),
        telefono: telefono.trim(),
        calle_numero: calleNumero.trim(),
        activo: activa,
      });
      if (onSaveSuccess) onSaveSuccess();
      if (guardarOtra) {
        limpiar();
      } else {
        limpiar();
        onClose();
      }
    } catch (err) {
      console.error("Error al registrar institución:", err);
      alert(err?.response?.data || "Hubo un error al registrar la institución en la base de datos.");
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    guardar(false);
  };

  return (
    <div className="mreg-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mreg-card" onClick={(e) => e.stopPropagation()}>
        <header className="mreg-header">
          <div className="mreg-title-group">
            <h2>Registrar institución</h2>
            <p>Añade un nuevo hospital o banco de sangre al sistema</p>
          </div>
          <button type="button" className="mreg-close-btn" onClick={onClose}>✕</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="mreg-body">
            <div className="form-group-modal">
              <label className="form-label-modal">Nombre de la institución</label>
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

            <div className="form-row-modal">
              <div className="form-group-modal">
                <label className="form-label-modal">Calle y número</label>
                <input
                  type="text"
                  className="input-field-modal"
                  placeholder="Ej. Av. Independencia #1200"
                  value={calleNumero}
                  onChange={(e) => setCalleNumero(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-modal">
                <label className="form-label-modal">Colonia</label>
                <select
                  className="select-field-modal"
                  value={coloniaId}
                  onChange={(e) => setColoniaId(e.target.value)}
                  required
                >
                  {colonias.length === 0 && <option value="">Sin colonias registradas</option>}
                  {colonias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.codigo_postal})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group-modal">
              <label className="form-label-modal">Tipo de institución</label>
              <div className="role-cards-grid">
                {tipos.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`role-card-btn ${Number(tipoInstitucionId) === Number(t.id) ? 'active' : ''}`}
                    onClick={() => setTipoInstitucionId(t.id)}
                  >
                    <span className="role-radio-circle">
                      {Number(tipoInstitucionId) === Number(t.id) && <span className="role-radio-dot" />}
                    </span>
                    {t.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row-modal">
              <div className="form-group-modal">
                <label className="form-label-modal">
                  Código postal <span className="badge-tag-modal">Según la colonia</span>
                </label>
                <input
                  type="text"
                  className="input-field-modal input-readonly-modal"
                  value={codigoPostal}
                  readOnly
                  placeholder="Se asigna según la colonia"
                />
              </div>

              <div className="form-group-modal">
                <label className="form-label-modal">Estado</label>
                <div className="toggle-switch-wrapper">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={activa}
                      onChange={(e) => setActiva(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span className="toggle-label-text">{activa ? 'Institución activa' : 'Institución inactiva'}</span>
                </div>
              </div>
            </div>

            <div className="form-group-modal">
              <label className="form-label-modal">
                Fecha de alta <span className="badge-tag-modal">Automático</span>
              </label>
              <input
                type="text"
                className="input-field-modal input-readonly-modal"
                value="Se asigna al guardar"
                readOnly
              />
            </div>
          </div>

          <footer className="mreg-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={cargando}>Cancelar</button>
            <button type="button" className="btn-modal-secondary" onClick={() => guardar(true)} disabled={cargando}>
              + Guardar y agregar otra
            </button>
            <button type="submit" className="btn-modal-primary" disabled={cargando}>
              ✓ {cargando ? 'Registrando...' : 'Registrar institución'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
