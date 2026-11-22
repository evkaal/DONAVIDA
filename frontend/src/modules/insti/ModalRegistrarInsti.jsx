import React, { useState, useEffect } from 'react';
import './ModalRegistrarInsti.css';
import ModalAviso from '../../components/common/ModalAviso';
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
  // 'nueva' = el usuario escribe la colonia manualmente.
  const [coloniaNuevaNombre, setColoniaNuevaNombre] = useState('');
  // Código postal EDITABLE: prellenado con el CP de la colonia elegida.
  const [codigoPostal, setCodigoPostal] = useState('');
  const [activa, setActiva] = useState(true);
  const [cargando, setCargando] = useState(false);
  // Aviso sencillo (modal) en lugar de alert() del navegador.
  const [aviso, setAviso] = useState(null);

  // Cargar catálogos al abrir el modal. Se extrae a función para poder
  // recargar la lista de colonias tras guardar una nueva (si no se
  // recarga, el siguiente hospital no puede elegir la colonia recién
  // creada y "no la reconoce").
  const cargarCatalogos = async () => {
    const [tiposData, coloniasData] = await Promise.all([
      obtenerTiposInstitucion(),
      obtenerColonias(),
    ]);
    if (tiposData.length > 0) {
      setTipos(tiposData);
      setTipoInstitucionId(tiposData[0].id);
    }
    setColonias(coloniasData);
    if (coloniasData.length > 0) {
      setColoniaId(String(coloniasData[0].id));
      setCodigoPostal(coloniasData[0].codigo_postal || '');
    } else {
      setColoniaId('nueva');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    cargarCatalogos().catch((err) => console.error("Error al cargar catálogos:", err));
  }, [isOpen]);

  if (!isOpen) return null;

  const coloniaSeleccionada = coloniaId === 'nueva' ? null : colonias.find((c) => String(c.id) === String(coloniaId));

  const elegirColonia = (valor) => {
    setColoniaId(valor);
    if (valor === 'nueva') {
      setCodigoPostal('');
    } else {
      const sel = colonias.find((c) => String(c.id) === String(valor));
      setCodigoPostal(sel?.codigo_postal || '');
    }
  };

  const limpiar = (listaColonias = colonias, seleccionarId = null) => {
    setNombre('');
    setTelefono('');
    setCalleNumero('');
    setActiva(true);
    setColoniaNuevaNombre('');
    if (seleccionarId) {
      setColoniaId(String(seleccionarId));
      const sel = listaColonias.find((c) => String(c.id) === String(seleccionarId));
      setCodigoPostal(sel?.codigo_postal || '');
    } else if (listaColonias.length > 0) {
      setColoniaId(String(listaColonias[0].id));
      setCodigoPostal(listaColonias[0].codigo_postal || '');
    } else {
      setColoniaId('nueva');
      setCodigoPostal('');
    }
    if (tipos.length > 0) setTipoInstitucionId(tipos[0].id);
  };

  const guardar = async (guardarOtra) => {
    if (!nombre.trim() || !telefono.trim() || !calleNumero.trim()) {
      setAviso({ titulo: 'Campos requeridos', mensaje: 'Por favor completa todos los campos requeridos.' });
      return;
    }
    // La colonia se puede elegir de la lista o escribirse manualmente.
    // El código postal siempre es editable (5 dígitos).
    if (!/^[0-9]{5}$/.test(codigoPostal.trim())) {
      setAviso({ titulo: 'Código postal', mensaje: 'El código postal debe tener 5 dígitos.' });
      return;
    }
    if (coloniaId === 'nueva' && !coloniaNuevaNombre.trim()) {
      setAviso({ titulo: 'Colonia nueva', mensaje: 'Escribe el nombre de la colonia nueva.' });
      return;
    }
    if (!coloniaId) {
      setAviso({ titulo: 'Colonia', mensaje: 'Elige una colonia o agrega una nueva.' });
      return;
    }
    setCargando(true);
    try {
      // Si la colonia es nueva: se crea en la BD (nombre + CP).
      // Si se cambió el CP de una colonia existente: el backend NO la
      // sobrescribe, crea una colonia nueva con ese nombre + el nuevo CP.
      const payload = {
        nombre: nombre.trim(),
        tipo_institucion_id: Number(tipoInstitucionId),
        telefono: telefono.trim(),
        calle_numero: calleNumero.trim(),
        codigo_postal: codigoPostal.trim(),
        activo: activa,
      };
      if (coloniaId === 'nueva') {
        payload.colonia_nombre = coloniaNuevaNombre.trim();
      } else {
        payload.colonia_id = Number(coloniaId);
      }
      const resultado = await registrarInstitucion(payload);
      // La colonia recién creada (o resuelta) ya viene en la respuesta.
      // Se añade a la lista local para que el siguiente hospital pueda
      // elegirla sin cerrar y reabrir el modal.
      const coloniaResuelta = resultado?.colonia || null;
      if (guardarOtra) {
        // "Guardar y agregar otra" mantiene el modal abierto (antes el
        // onSaveSuccess del padre lo cerraba): se recarga el catálogo y
        // se deja seleccionada la colonia recién creada.
        let lista = colonias;
        try {
          const frescas = await obtenerColonias();
          if (Array.isArray(frescas) && frescas.length > 0) {
            lista = frescas;
            setColonias(frescas);
          }
        } catch (e) {
          console.error("Error al recargar colonias:", e);
        }
        if (coloniaResuelta?.id && !lista.some((c) => String(c.id) === String(coloniaResuelta.id))) {
          lista = [...lista, { id: coloniaResuelta.id, nombre: coloniaResuelta.nombre, codigo_postal: coloniaResuelta.codigo_postal }];
          setColonias(lista);
        }
        limpiar(lista, coloniaResuelta?.id || null);
      } else {
        if (onSaveSuccess) onSaveSuccess();
        limpiar();
        onClose();
      }
    } catch (err) {
      console.error("Error al registrar institución:", err);
      setAviso({ titulo: 'Error', mensaje: String(err?.response?.data || "Hubo un error al registrar la institución en la base de datos.") });
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    guardar(false);
  };

  return (
    <>
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
                  onChange={(e) => elegirColonia(e.target.value)}
                  required
                >
                  {colonias.length === 0 && <option value="nueva">+ Agregar nueva colonia…</option>}
                  {colonias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.codigo_postal})
                    </option>
                  ))}
                  <option value="nueva">+ Agregar nueva colonia…</option>
                </select>
              </div>
            </div>

            {coloniaId === 'nueva' && (
              <div className="form-group-modal">
                <label className="form-label-modal">Nombre de la colonia nueva</label>
                <input
                  type="text"
                  className="input-field-modal"
                  placeholder="Ej. Centro"
                  value={coloniaNuevaNombre}
                  onChange={(e) => setColoniaNuevaNombre(e.target.value)}
                  required
                />
              </div>
            )}

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
                  Código postal <span className="badge-tag-modal">Editable</span>
                </label>
                <input
                  type="text"
                  className="input-field-modal"
                  value={codigoPostal}
                  onChange={(e) => setCodigoPostal(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                  placeholder="Ej. 68000"
                  maxLength={5}
                  inputMode="numeric"
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

      {/* Aviso sencillo (modal) en lugar de alert() */}
      <ModalAviso
        isOpen={!!aviso}
        titulo={aviso?.titulo || 'Aviso'}
        mensaje={aviso?.mensaje}
        onClose={() => setAviso(null)}
      />
    </>
  );
}
