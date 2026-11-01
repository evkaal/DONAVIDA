import React, { useState } from 'react';
import './Login.css';
import { loginUser } from '../../services/authService';

export default function Login({ onLoginSuccess }) {
  // 1. Estados del formulario (valores de los inputs)
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [recordarme, setRecordarme] = useState(false);

  // 2. Estados de interfaz (UI)
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorLogin, setErrorLogin] = useState(false);
  const [loginExitoso, setLoginExitoso] = useState(false);


  // Función manejadora del envío del formulario conectada al Backend en Go
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorLogin(false);
    setLoginExitoso(false);
    setCargando(true);

    try {
      // Llamada real al backend en Go usando la capa de servicios de Axios
      const data = await loginUser({ 
        email: correo.trim(), 
        password: password 
      });

      // Si el backend responde con éxito (200 OK)
      setCargando(false);
      setLoginExitoso(true);

      // Opcional: guardar el token JWT devuelto por Go en localStorage
      if (data && data.token) {
        localStorage.setItem('token', data.token);
      }

      // Redirigir al dashboard únicamente si el login fue exitoso
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(correo.trim());
        }
      }, 700);

    } catch (err) {
      // Si el backend rechaza las credenciales (401 Unauthorized u otro error)
      setCargando(false);
      setErrorLogin(true);
      setLoginExitoso(false);
      console.error("Error en el login:", err);
    }
  };

  return (
    <div className="login-page">
      {/*Panel izquierdo*/}
      <div className="login-left-panel col-12 col-lg-6">
        <div className="brand-header">
          <div className="brand-logo-placeholder">
            <img src="/src/assets/donavida_logo.png" alt="Logo" className="brand-logo-img" />
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

          {/* ALERTA DE ERROR */}
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

          {/* ALERTA DE ÉXITO */}
          {loginExitoso && (
            <div className="custom-alert-success" role="alert">
              <span>¡Bienvenido(a)! Credenciales correctas. Redirigiendo al sistema...</span>
            </div>
          )}

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
                {/* APARTADO PARA ÍCONO DE MOSTRAR / OCULTAR CONTRASEÑA */}
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

            {/* Fila de opciones: Mantener sesión y ¿Olvidaste tu contraseña? */}
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

              <a href="#recuperar" className="forgot-password-link">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Botón de Enviar (Estado normal o Iniciando sesión...) */}
            <button type="submit" className="btn-login-submit" disabled={cargando}>
              {cargando ? (
                <>
                  <span className="spinner-wrapper">
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