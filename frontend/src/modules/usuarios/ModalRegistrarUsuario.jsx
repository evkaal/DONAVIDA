import React, { useState } from 'react';
import './ModalRegistrarUsuario.css';

export default function ModalRegistrarUsuario({ isOpen, onClose, onSaveSuccess }) {
  // Estados de los campos del formulario
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rol, setRol] = useState('Hospital'); // 'Administrador' | 'Banco de sangre' | 'Hospital'
  const [institucion, setInstitucion] = useState('Hospital General');
  const [cuentaActiva, setCuentaActiva] = useState(true);

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);

  if (!isOpen) return null;

  // =========================================================================
  //  MANEJADOR DE REGISTRO (PROPUESTA PARA EL BACKEND):
  //
  // Endpoint esperado: POST /api/usuarios
  // Payload enviado:
  // {
  //   nombre: string,
  //   correo: string,
  //   password: string,
  //   rol: string,           // 'Administrador' | 'Banco de sangre' | 'Hospital'
  //   institucion: string,
  //   activo: boolean
  // }
  // =========================================================================
  const handleSubmit = (e, guardarOtro = false) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden. Por favor verifica.');
      return;
    }

    const nuevoUsuario = {
      nombre,
      correo,
      rol,
      institucion,
      activo: cuentaActiva,
    };

    console.log('[BACKEND] Enviar datos a POST /api/usuarios:', nuevoUsuario);

    if (onSaveSuccess) {
      onSaveSuccess(nuevoUsuario);
    }

    if (guardarOtro) {
      setNombre('');
      setCorreo('');
      setPassword('');
      setConfirmPassword('');
    } else {
      onClose();
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

          <button
            type="button"
            className="mreg-close-btn"
            onClick={onClose}
            title="Cerrar ventana"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        {/* Formulario */}
        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div className="mreg-body">
            <div className="form-group-modal">
              <label htmlFor="modal-nombre" className="form-label-modal">
                Nombre completo
              </label>
              <div className="input-icon-wrapper-modal">
                <span className="input-left-icon-modal">
                  <img src="/src/assets/iconos_gestionU/usuario.png" alt="Usuario" />
                </span>
                <input
                  id="modal-nombre"
                  type="text"
                  className="input-field-modal"
                  placeholder="Sofía Vargas"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-modal">
              <label htmlFor="modal-correo" className="form-label-modal">
                Correo electrónico
              </label>
              <div className="input-icon-wrapper-modal">
                <span className="input-left-icon-modal">
                  <img src="/src/assets/iconos_gestionU/sobre.png" alt="Correo" />
                </span>
                <input
                  id="modal-correo"
                  type="email"
                  className="input-field-modal"
                  placeholder="s.vargas@hgeneral.gob.mx"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>
              <span className="input-helper-text">Será su usuario para iniciar sesión</span>
            </div>

            <div className="form-row-modal">
              <div className="form-group-modal">
                <label htmlFor="modal-password" className="form-label-modal">
                  Contraseña
                </label>
                <div className="input-icon-wrapper-modal">
                  <span className="input-left-icon-modal">
                    <img src="/src/assets/iconos_gestionU/cerrar.png" alt="Contraseña" />
                  </span>
                  <input
                    id="modal-password"
                    type={mostrarPassword ? 'text' : 'password'}
                    className="input-field-modal input-password-modal"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />                  <button
                    type="button"
                    className="password-eye-btn-modal"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {mostrarPassword ? (
                      <img src="/src/assets/iconos_gestionU/ojo-cruzado.png" alt="Contraseña" />
                    ) : (
                      <img src="/src/assets/iconos_gestionU/ojo.png" alt="Contraseña" />
                    )}
                  </button>
                </div>
                <span className="input-helper-text">Mínimo 8 caracteres · se guarda cifrada</span>
              </div>

              <div className="form-group-modal">
                <label htmlFor="modal-confirm" className="form-label-modal">
                  Confirmar contraseña
                </label>
                <div className="input-icon-wrapper-modal">
                  <span className="input-left-icon-modal">
                    <img src="/src/assets/iconos_gestionU/cerrar.png" alt="Contraseña" />
                  </span>
                  <input
                    id="modal-confirm"
                    type={mostrarConfirm ? 'text' : 'password'}
                    className="input-field-modal input-password-modal"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-eye-btn-modal"
                    onClick={() => setMostrarConfirm(!mostrarConfirm)}
                    title={mostrarConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {mostrarConfirm ? (
                      <img src="/src/assets/iconos_gestionU/ojo-cruzado.png" alt="Contraseña" />
                    ) : (
                      <img src="/src/assets/iconos_gestionU/ojo.png" alt="Contraseña" />
                    )}
                  </button>
                </div>
                <span className="input-helper-text">Debe coincidir con la contraseña</span>
              </div>
            </div>

            <div className="form-group-modal">
              <label className="form-label-modal">Rol</label>
              <div className="role-cards-grid">
                {/* Opción 1: Administrador */}
                <button
                  type="button"
                  className={`role-card-btn ${rol === 'Administrador' ? 'active' : ''}`}
                  onClick={() => setRol('Administrador')}
                >
                  <span className="role-radio-circle">
                    {rol === 'Administrador' && <span className="role-radio-dot"></span>}
                  </span>
                  <span>Administrador</span>
                </button>

                {/* Opción 2: Banco de sangre */}
                <button
                  type="button"
                  className={`role-card-btn ${rol === 'Banco de sangre' ? 'active' : ''}`}
                  onClick={() => setRol('Banco de sangre')}
                >
                  <span className="role-radio-circle">
                    {rol === 'Banco de sangre' && <span className="role-radio-dot"></span>}
                  </span>
                  <span>Banco de sangre</span>
                </button>

                {/* Opción 3: Hospital */}
                <button
                  type="button"
                  className={`role-card-btn ${rol === 'Hospital' ? 'active' : ''}`}
                  onClick={() => setRol('Hospital')}
                >
                  <span className="role-radio-circle">
                    {rol === 'Hospital' && <span className="role-radio-dot"></span>}
                  </span>
                  <span>Hospital</span>
                </button>
              </div>
            </div>

            {/* Institución y Estado de la cuenta */}
            <div className="form-row-modal">
              {/* Institución */}
              <div className="form-group-modal">
                <label htmlFor="modal-institucion" className="form-label-modal">
                  <span>Institución</span>
                  <span className="badge-tag-modal">Según el rol</span>
                </label>
                <select
                  id="modal-institucion"
                  className="select-field-modal"
                  value={institucion}
                  onChange={(e) => setInstitucion(e.target.value)}
                >
                  <option value="Hospital General">Hospital General</option>
                  <option value="Hospital Regional">Hospital Regional</option>
                  <option value="Clínica Reforma">Clínica Reforma</option>
                  <option value="Banco de Sangre Central">Banco de Sangre Central</option>
                  <option value="Banco de Sangre Norte">Banco de Sangre Norte</option>
                  <option value="Sin institución">Sin institución (Admin)</option>
                </select>
              </div>

              {/* Estado de la cuenta */}
              <div className="form-group-modal">
                <label className="form-label-modal">Estado de la cuenta</label>
                <div className="toggle-switch-wrapper">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={cuentaActiva}
                      onChange={(e) => setCuentaActiva(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-label-text">
                    {cuentaActiva ? 'Cuenta activa' : 'Cuenta inactiva'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fecha de alta */}
            <div className="form-group-modal">
              <label className="form-label-modal">
                <span>Fecha de alta</span>
                <span className="badge-tag-modal">Automático</span>
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
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Cancelar
            </button>

            <button
              type="button"
              className="btn-modal-secondary"
              onClick={(e) => handleSubmit(e, true)}
            >
              <span className="mreg-action-icon">
                <img src="/src/assets/iconos_gestionU/agregar.png" alt="Agregar" />
              </span>
              <span>Guardar y agregar otro</span>
            </button>

            <button type="submit" className="btn-modal-primary">
              <span className="mreg-action-icon">
                <img src="/src/assets/iconos_gestionU/aceptar.png" alt="Registrar" />
              </span>
              <span>Registrar usuario</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

