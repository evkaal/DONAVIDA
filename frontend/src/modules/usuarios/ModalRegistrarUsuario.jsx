import React, { useState, useEffect } from 'react';
import './ModalRegistrarUsuario.css';
import { registrarUsuario, obtenerInstituciones } from '../../services/usuariosService';

export default function ModalRegistrarUsuario({ isOpen, onClose, onSaveSuccess, usuarioActual }) {
  const esAdminGen = usuarioActual?.rol_id === 1;
  const rolesDisponibles = esAdminGen
    ? [
        { id: 3, label: 'Personal médico' },
        { id: 2, label: 'Admin institucional' },
        { id: 1, label: 'Administrador general' },
      ]
    : [
        { id: 3, label: 'Personal médico' },
        { id: 2, label: 'Admin institucional' },
      ];

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

  // Cargar instituciones reales al abrir el modal
  useEffect(() => {
    if (isOpen) {
      obtenerInstituciones()
        .then(data => {
          const lista = Array.isArray(data) ? data : [];
         setInstitucionesList(lista);
         if(lista.length > 0){
         setInstitucionId(lista[0].id);
         }
        


        }) 
        .catch(err => console.error("Error al cargar instituciones:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e, guardarOtro = false) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden. Por favor verifica.');
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
      alert("Hubo un error al registrar el usuario en la base de datos.");
    } finally {
      setCargando(false);
    }
  };

  return (
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
  );
}