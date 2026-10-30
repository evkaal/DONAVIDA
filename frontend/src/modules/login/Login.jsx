import React, { useState } from 'react';
import './Login.css';

//Endpoint de autenticación sugerido (back):
//    POST /api/auth/login
//    Body: { correo, password, rolSeleccionado }
//    Response: { token, usuario: { nombre, rol, institucion } }
const ROLES_INGRESO = [
  { id: 'medico', label: 'Personal médico' },
  { id: 'admin_ins', label: 'Admin. institución' },
  { id: 'admin_gen', label: 'Admin. general' },
];

export default function Login({ onLoginSuccess }) {
  // Estados del formulario
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [recordarme, setRecordarme] = useState(false);

  // Estado del rol seleccionado
  // (back) Este valor debe enviarse al endpoint de autenticación para
  //    que el backend valide que el usuario tiene permisos para ese rol.
  const [rolSeleccionado, setRolSeleccionado] = useState('medico');

  // Estados de interfaz
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorLogin, setErrorLogin] = useState(false);
  const [loginExitoso, setLoginExitoso] = useState(false);

  // usuarios de prueba:
  // - Personal médico:     usuario@institucion.gob.mx  /  password123
  // - Admin. general:      admin@donavida.gob.mx        /  admin123
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorLogin(false);
    setLoginExitoso(false);
    setCargando(true);

    setTimeout(() => {
      setCargando(false);

      // Verificación temporal de credenciales (reemplazar con llamada real al backend)
      const correoNorm = correo.trim().toLowerCase();
      const esMedico = correoNorm === 'usuario@institucion.gob.mx' && password === 'password123';
      const esAdmin = correoNorm === 'admin@donavida.gob.mx' && password === 'admin123';
      const esValido = esMedico || esAdmin;

      if (esValido) {
        setLoginExitoso(true);
        setErrorLogin(false);

        // Datos del usuario autenticado que se pasan al resto de la app
        const datosUsuario = {
          correo: correo.trim(),
          rol: esAdmin ? 'admin' : 'medico',
          nombre: esAdmin ? 'Admin DONAVIDA' : 'Personal Médico',
          institucion: esAdmin ? 'Administrador · Sistema' : 'Hospital General',
        };

        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(datosUsuario);
        }, 700);
      } else {
        setErrorLogin(true);
      }
    }, 800);
  };

  return (
    <div className="login-page">
      {/*Panel izquierdo*/}
      <div className="login-left-panel col-12 col-lg-6">
        <div className="brand-header">
          <div className="brand-logo-placeholder">
            {
              <img src="/src/assets/donavida_logo.png" alt="Logo" className="brand-logo-img" />
            }
          </div>
        </div>

        {/* Contenido central del banner */}
        <div className="banner-center-content">
          <span className="institution-badge">RED INTERHOSPITALARIA · OAXACA</span>
          <h2 className="banner-main-title">
            Cada unidad<br />de sangre, a tiempo.
          </h2>
          <p className="banner-description">
            Gestiona inventario, entradas, salidas y solicitudes entre hospitales y bancos de sangre en una sola plataforma.
          </p>
        </div>

        {/* Pie del panel izquierdo */}
        <div className="banner-footer">
          <span>Sistema de gestión hospitalaria de hemoderivados</span>
        </div>
      </div>

      {/*Panel derecho: Inicio de Sesión*/}
      <div className="login-right-panel col-12 col-lg-6">
        <div className="top-support-bar">
          <span>¿Necesitas ayuda?</span>
          <a href="#soporte" className="support-link">
            Contactar soporte
          </a>
        </div>

        {/*Contenedor central*/}
        <div className="login-form-container">
          <h2 className="form-header-title">Bienvenido de nuevo</h2>
          <p className="form-header-subtitle">
            Ingresa con tu cuenta institucional para gestionar el inventario y las solicitudes de sangre.
          </p>

          {/* alarta de credenciales incorrectas aparece 
              Este mensaje debe activarse cuando el endpoint
              POST /api/auth/login devuelva un error 401 / credenciales inválidas*/}
          {errorLogin && (
            <div className="custom-alert-error" role="alert">
              <div className="alert-error-icon">
                <img src="/src/assets/iconos_login/exclamacion.png" alt="Error" />
              </div>
              <div>
                <p className="alert-error-title">Correo o contraseña incorrectos</p>
                <p className="alert-error-desc">Verifica tus datos e inténtalo de nuevo.</p>
              </div>
            </div>
          )}

          {loginExitoso && (
            <div className="custom-alert-success" role="alert">
              <span>¡Bienvenido(a)! Credenciales correctas. Redirigiendo al sistema...</span>
            </div>
          )}

          {/* Seleccionar rol: El rol seleccionado debe enviarse junto con las
              credenciales para que el backend valide que el usuario tiene
              permisos para ese rol específico.
              Endpoint: POST /api/auth/login
              Body:     { correo, password, rolSeleccionado }*/}
          <div className="login-role-selector">
            <span className="login-role-label">Ingresar como</span>
            <div className="login-role-buttons">
              {ROLES_INGRESO.map((rol) => (
                <button
                  key={rol.id}
                  type="button"
                  className={`login-role-btn ${rolSeleccionado === rol.id ? 'active' : ''}`}
                  onClick={() => setRolSeleccionado(rol.id)}
                >
                  {rol.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            {/* Campo 1: Correo institucional */}
            <div className="form-group-custom">
              <label htmlFor="correo" className="form-label-custom">
                Correo institucional
              </label>
              <div className="input-with-icon-wrapper">
                <span className="input-left-icon">
                  <img src="/src/assets/iconos_login/sobre.png" alt="Logo" className="brand-logo-img" />
                </span>
                <input
                  id="correo"
                  type="email"
                  className="form-control-custom"
                  placeholder="usuario@institucion.gob.mx"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Campo 2: Contraseña */}
            <div className="form-group-custom">
              <label htmlFor="password" className="form-label-custom">
                Contraseña
              </label>
              <div className="input-with-icon-wrapper">
                <span className="input-left-icon">
                  <img src="/src/assets/iconos_login/cerrar.png" alt="Logo" className="brand-logo-img" />
                </span>
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  className="form-control-custom input-password-field"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label="Alternar visibilidad de contraseña"
                >
                  {mostrarPassword ? (
                    <img src="/src/assets/iconos_login/ojo-cruzado.png" alt="Logo" className="brand-logo-img" />
                  ) : (
                    <img src="/src/assets/iconos_login/ojo.png" alt="Logo" className="brand-logo-img" />
                  )}
                </button>
              </div>
            </div>

            <div className="options-row">
              <label className="form-check-custom">
                <input
                  type="checkbox"
                  className="form-check-input-custom"
                  checked={recordarme}
                  onChange={(e) => setRecordarme(e.target.checked)}
                />
                <span>Mantener sesión iniciada</span>
              </label>
            </div>

            <button type="submit" className="btn-login-submit" disabled={cargando}>
              {cargando ? (
                <>
                  <span className="spinner-wrapper">
                    {/*ícono o spinner de carga */}
                    <svg className="spinner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </span>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Iniciar sesión</span>
              )}
            </button>
          </form>
        </div>

        {/* Pie inferior con derechos y aviso de privacidad */}
        <div className="login-right-footer">
          <span>© 2026 DONAVIDA · Oaxaca de Juárez, Oax. · </span>
          <a href="#privacidad" className="privacy-link">
            Aviso de privacidad
          </a>
        </div>
      </div>
    </div>
  );
}
