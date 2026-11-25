import React, { useState } from "react";
import "./Login.css";
import { loginUser } from "../../services/authService";
import { guardarSesion } from "../../services/sesionService";
import ModalAviso from "../../components/common/ModalAviso";

export default function Login({ onLoginSuccess }) {
  // Estados del formulario
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [recordarme, setRecordarme] = useState(false);

  // Aviso de soporte / privacidad (ModalAviso, nunca alert()).
  const [avisoLogin, setAvisoLogin] = useState(null);

  // Estados de interfaz
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  // Mensaje de error del backend (null = sin error). Si es el genérico de
  // credenciales se muestra el aviso de siempre; si es el de contraseña
  // débil o cuenta dada de baja, se muestra el mensaje tal cual.
  const [errorLogin, setErrorLogin] = useState(null);
  const [loginExitoso, setLoginExitoso] = useState(false);
  const errorGenerico = errorLogin === 'Correo o contraseña incorrectos';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorLogin(null);
    setLoginExitoso(false);
    setCargando(true);

    try {
      // Llamada real al backend en Go enviando únicamente email y password
      const data = await loginUser({
        email: correo.trim(),
        password: password,
      });

      // Si el backend responde con éxito (200 OK)
      setCargando(false);
      setLoginExitoso(true);

      // Guardar la sesión: con "Mantener sesión iniciada" marcado, en
      // localStorage (sobrevive a recargar y a cerrar el navegador);
      // sin marcarla, en sessionStorage (sobrevive a recargar, se borra
      // al cerrar el navegador). Antes siempre iba a localStorage y la
      // casilla no se usaba.
      if (data) {
        guardarSesion(data, recordarme);
      }

      // Redirigir al dashboard únicamente si el login fue exitoso
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data);
        }
      }, 700);
    } catch (err) {
      // Si el backend rechaza las credenciales (401 Unauthorized u otro error).
      // loginUser lanza el mensaje del backend en texto plano.
      setCargando(false);
      const msg = typeof err === 'string' && err ? err : 'Correo o contraseña incorrectos';
      setErrorLogin(msg);
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
            <img
              src="/assets/donavida_logo.png"
              alt="Logo"
              className="brand-logo-img"
            />
          </div>
        </div>

        {/* Contenido central del banner */}
        <div className="banner-center-content">
          <span className="institution-badge">
            RED INTERHOSPITALARIA · OAXACA
          </span>
          <h2 className="banner-main-title">
            Cada unidad
            <br />
            de sangre, a tiempo.
          </h2>
          <p className="banner-description">
            Gestiona inventario, entradas, salidas y solicitudes entre
            hospitales y bancos de sangre en una sola plataforma.
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
          <a
            href="#soporte"
            className="support-link"
            onClick={(e) => {
              e.preventDefault();
              setAvisoLogin({
                titulo: "Contactar soporte",
                mensaje:
                  "Para reportar un problema o pedir ayuda con el sistema, contacta al administrador general de DONAVIDA o al administrador de tu institución. Ellos pueden revisar tu cuenta, tu institución y el estado del sistema.",
              });
            }}
          >
            Contactar soporte
          </a>
        </div>

        {/*Contenedor central*/}
        <div className="login-form-container">
          <h2 className="form-header-title">Bienvenido de nuevo</h2>
          <p className="form-header-subtitle">
            Ingresa con tu cuenta institucional para gestionar el inventario y
            las solicitudes de sangre.
          </p>

          {/* Aviso de inicio de sesión exitoso */}
          {loginExitoso && (
            <div className="custom-alert-success" role="status">
              <p style={{ margin: 0 }}>
                Inicio de sesión exitoso, redirigiendo…
              </p>
            </div>
          )}

          {/* Alerta de credenciales incorrectas (o del motivo que el
              backend devolvió: contraseña débil o cuenta dada de baja) */}
          {errorLogin && (
            <div className="custom-alert-error" role="alert">
              <div className="alert-error-icon">
                <img
                  src="/assets/iconos_login/exclamacion.png"
                  alt="Error"
                />
              </div>
              <div>
                <p className="alert-error-title">
                  {errorGenerico ? 'Correo o contraseña incorrectos' : 'No se pudo iniciar sesión'}
                </p>
                <p className="alert-error-desc">
                  {errorGenerico ? 'Verifica tus datos e inténtalo de nuevo.' : errorLogin}
                </p>
              </div>
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
                  <img
                    src="/assets/iconos_login/sobre.png"
                    alt="Logo"
                    className="brand-logo-img"
                  />
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
                  <img
                    src="/assets/iconos_login/cerrar.png"
                    alt="Logo"
                    className="brand-logo-img"
                  />
                </span>
                <input
                  id="password"
                  type={mostrarPassword ? "text" : "password"}
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
                  title={
                    mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"
                  }
                  aria-label="Alternar visibilidad de contraseña"
                >
                  {mostrarPassword ? (
                    <img
                      src="/assets/iconos_login/ojo-cruzado.png"
                      alt="Logo"
                      className="brand-logo-img"
                    />
                  ) : (
                    <img
                      src="/assets/iconos_login/ojo.png"
                      alt="Logo"
                      className="brand-logo-img"
                    />
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

            <button
              type="submit"
              className="btn-login-submit"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className="spinner-wrapper">
                    <svg
                      className="spinner-icon"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
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
          <a
            href="#privacidad"
            className="privacy-link"
            onClick={(e) => {
              e.preventDefault();
              setAvisoLogin({
                titulo: "Aviso de privacidad",
                mensaje:
                  "DONAVIDA recaba únicamente los datos necesarios para operar la red de donación de sangre: tu nombre, tu correo institucional, tu institución y los datos de las unidades y solicitudes que registras. Tus datos solo se usan para la gestión del inventario y de las solicitudes entre las instituciones participantes, y no se comparten con terceros fuera de esa red. Para ejercer tus derechos sobre tus datos, contacta al administrador general de DONAVIDA.",
              });
            }}
          >
            Aviso de privacidad
          </a>
        </div>
      </div>

      {/* Modal de soporte / aviso de privacidad */}
      <ModalAviso
        isOpen={Boolean(avisoLogin)}
        titulo={avisoLogin?.titulo || "Aviso"}
        mensaje={avisoLogin?.mensaje || ""}
        onClose={() => setAvisoLogin(null)}
      />
    </div>
  );
}
