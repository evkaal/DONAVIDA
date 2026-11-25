import React, { useState } from 'react';
import Login from './modules/login';
import Dashboard from './modules/dashboard';
import GestionUsuarios from './modules/usuarios';
import RegistroUnidades from './modules/registroUnidades';
import StockInventario from './modules/stockInventario/StockInventario';
import Historico from './modules/historico';
import SolicitudUnidades from './modules/solicitudUnidades';
import SolicitudesEntrantes from './modules/solicitudesEntrantes';
import { obtenerUsuarioSesion, limpiarSesion } from './services/sesionService';


function App() {
  // Estado para el usuario autenticado. Se inicializa desde la sesión
  // guardada (localStorage si se marcó "Mantener sesión iniciada",
  // sessionStorage si no), así la sesión sobrevive a recargar la página.
  // Antes siempre arrancaba en null y al recargar aparecía el Login
  // aunque hubiera token guardado.
  const [usuario, setUsuario] = useState(() => {
    const sesion = obtenerUsuarioSesion();
    return sesion && sesion.email ? sesion : null;
  });

  // Estado para el módulo activo a nivel de aplicación
  const [moduloApp, setModuloApp] = useState('dashboard');

  const handleLogout = () => {
    limpiarSesion();
    setUsuario(null);
    setModuloApp('dashboard');
  };

  // Sin sesión: pantalla de Login
  if (!usuario) {
    return <Login onLoginSuccess={(datosUsuario) => setUsuario(datosUsuario)} />;
  }

  // Módulo: Gestión de Usuarios (Admin). El personal médico (rol_id 3)
  // no puede crear ni gestionar usuarios: si llega aquí por estado viejo,
  // se le muestra el Dashboard en vez del módulo.
  if (moduloApp === 'usuarios') {
    if (Number(usuario?.rol_id) === 3) {
      return (
        <Dashboard
          usuario={usuario}
          onLogout={handleLogout}
          onCambiarModulo={setModuloApp}
        />
      );
    }
    return (
      <GestionUsuarios
        usuario={usuario}
        onCambiarModulo={setModuloApp}
        onLogout={handleLogout}
      />
    );
  }

  // Módulo: Registro de Unidades (Médico)
  if (moduloApp === 'registro') {
    return (
      <RegistroUnidades
        usuario={usuario}
        onCambiarModulo={setModuloApp}
        onLogout={handleLogout}
      />
    );
  }

  // Módulo: Stock de Inventario (Médico y Admin)
  if (moduloApp === 'stock') {
    return (
      <StockInventario
        usuario={usuario}
        onCambiarModulo={setModuloApp}
        onLogout={handleLogout}
      />
    );
  }

  // Módulo: Histórico (Médico y Admin)
  if (moduloApp === 'historico') {
    return (
      <Historico
        usuario={usuario}
        onCambiarModulo={setModuloApp}
        onLogout={handleLogout}
      />
    );
  }

  // Módulo: Solicitud de Unidades (Médico)
  if (moduloApp === 'solicitud') {
    return (
      <SolicitudUnidades
        usuario={usuario}
        onCambiarModulo={setModuloApp}
        onLogout={handleLogout}
      />
    );
  }

  // Módulo: Solicitudes Entrantes (Médico)
  if (moduloApp === 'entrantes') {
    return (
      <SolicitudesEntrantes
        usuario={usuario}
        onCambiarModulo={setModuloApp}
        onLogout={handleLogout}
      />
    );
  }

  // Módulo por defecto: Dashboard
  return (
    <Dashboard
      usuario={usuario}
      onLogout={handleLogout}
      onCambiarModulo={setModuloApp}
    />
  );
}

export default App;
