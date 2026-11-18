import React, { useState, useEffect } from 'react';
import './ModalRegistrarUsuario.css';
import ModalAviso from '../../components/common/ModalAviso';
import { registrarUsuario, obtenerInstituciones, obtenerRoles } from '../../services/usuariosService';

// Fallback si /catalogos/roles falla o la BD aún no tiene roles sembrados.
// Sin duplicados: un solo registro por id.
const ROLES_FALLBACK = [
  { id: 1, nombre: 'Administrador general' },
  { id: 2, nombre: 'Admin institucional' },
  { id: 3, nombre: 'Personal médico' },
];

// Contraseña segura: mínimo 8 caracteres, al menos una mayúscula,
// una minúscula y un dígito (misma regla que el backend).
const contrasenaSegura = (p) => {
  if (!p || p.length < 8) return false;
  return /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
};

export default function ModalRegistrarUsuario({ isOpen, onClose, onSaveSuccess, usuarioActual }) {
  // Sesión del usuario que registra (prop o localStorage): de ahí sale su
  // institución, que es la que se usa para el usuario nuevo.
  const usuarioSesionModal = usuarioActual || JSON.parse(localStorage.getItem('usuario') || '{}');
  const esAdminGen = usuarioSesionModal?.rol_id === 1;
  const institucionSesionId = usuarioSesionModal?.institucion_id ?? null;
  const [rolesBd, setRolesBd] = useState([]);
  // Roles reales de la BD; si no llegan, el fallback. Se filtra por id
  // para no duplicar: si la BD trae un id, manda su nombre.
  const rolesBase = rolesBd.length > 0 ? rolesBd : ROLES_FALLBACK;
  const rolesDisponibles = rolesBase
    .filter((r) => esAdminGen || r.id !== 1)
    .map((r) => ({ id: r.id, label: r.nombre }))
    .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rolId, setrolId] = useState(3);
  const [institucionId, setInstitucionId] = useState('');
  const [institucionesList, setInstitucionesList] = useState([]);
  const [cuentaActiva, setCuentaActiva] = useState(true);
  const [cargando, setCargando] = useState(false);

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  // Error de validación visible EN EL FORMULARIO (inline, no alert).
  const [errorForm, setErrorForm] = useState('');
  // Aviso sencillo (modal) en lugar de alert() del navegador.
  const [aviso, setAviso] = useState(null);

  // Cargar roles e instituciones reales al abrir el modal
  useEffect(() => {
    if (isOpen) {
      obtenerRoles()
        .then((data) => { if (Array.isArray(data) && data.length > 0) setRolesBd(data); })
        .catch((err) => console.error("Error al cargar roles:", err));
      obtenerInstituciones()
        .then(data => {
          const lista = Array.isArray(data) ? data : [];
         setInstitucionesList(lista);
         // La institución es la de la sesión: un admin_institucion solo
         // crea usuarios para su propia institución (el backend también
         // lo fuerza). Solo el admin general elige otra institución.
         if (institucionSesionId) {
           setInstitucionId(institucionSesionId);
         } else if (lista.length > 0) {
           setInstitucionId(lista[0].id);
         }
        })
        .catch(err => console.error("Error al cargar instituciones:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e, guardarOtro = false) => {
    e.preventDefault();
    setErrorForm('');

    // Nombre de usuario sin números (acentos, espacios y guiones sí).
    if (/\d/.test(nombre.trim())) {
      setErrorForm('El nombre de usuario no puede contener números.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorForm('Las contraseñas no coinciden. Por favor verifica.');
      return;
    }

    if (!contrasenaSegura(password)) {
      setErrorForm('La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas y números.');
      return;
    }

    setCargando(true);

    const nuevoUsuario = {
      nombre: nombre.trim(),
      email: correo.trim(),
      password: password,
      rol_id: Number(rolId),
      institucion_id: institucionId ? Number(institucionId) : null,
    };

    try {
      const resultado = await registrarUsuario(nuevoUsuario);
      if (onSaveSuccess) {
        onSaveSuccess(resultado);
      }

      if (guardarOtro) {
        setNombre('');
        setCorreo('');
        setPassword('');
        setConfirmPassword('');
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Error al registrar usuario:", err);
      // El backend devuelve su motivo (p. ej. la regla de contraseña o
      // de nombre) si el registro llegó hasta allá; si no, el genérico.
      setAviso({ titulo: 'Error', mensaje: String(err?.response?.data || 'Hubo un error al registrar el usuario en la base de datos.') });
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
    <div className="mreg-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mreg-card" onClick={(e) => e.stopPropagation()}>
        <header className="mreg-header">
          <div className="mreg-title-group">
            <h2>Registrar usuario</h2>
            <p>Crea una cuenta de acceso para el personal de una institución</p>
          </div>
          <button type="button" className="mreg-close-btn" onClick={onClose}>✕</button>
        </header>

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div className="mreg-body">
            {/* Error de validación inline (nombre, contraseña, coincidencia) */}
            {errorForm && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '0.9rem' }}>
                {errorForm}
              </div>
            )}
            <div className="form-group-modal">
              <label className="form-label-modal">Nombre completo</label>
              <input
                type="text"
                className="input-field-modal"
                placeholder="Sofía Vargas"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="form-group-modal">
              <label className="form-label-modal">Correo electrónico</label>
              <input
                type="email"
                className="input-field-modal"
                placeholder="s.vargas@hgeneral.gob.mx"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>

            <div className="form-row-modal">
              <div className="form-group-modal">
                <label className="form-label-modal">Contraseña</label>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  className="input-field-modal"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-modal">
                <label className="form-label-modal">Confirmar contraseña</label>
                <input
                  type={mostrarConfirm ? 'text' : 'password'}
                  className="input-field-modal"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-modal">
              <label className="form-label-modal">Rol</label>
              <div className="role-cards-grid">
                {rolesDisponibles.map((opcion) => (
                  <button
                    key={opcion.id}
                    type="button"
                    className={`role-card-btn ${rolId === opcion.id ? 'active' : ''}`}
                    onClick={() => setrolId(opcion.id)}
                  >
                    <span>{opcion.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row-modal">
              <div className="form-group-modal">
                <label className="form-label-modal">Institución</label>
                <select
                  className="select-field-modal"
                  value={institucionId}
                  onChange={(e) => setInstitucionId(e.target.value)}
                  disabled={!esAdminGen && Boolean(institucionSesionId)}
                  title={!esAdminGen && institucionSesionId ? 'Tu institución (de tu sesión)' : undefined}
                >
                  {institucionesList.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <footer className="mreg-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-modal-primary" disabled={cargando}>
              {cargando ? 'Registrando...' : 'Registrar usuario'}
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