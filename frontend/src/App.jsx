import React, { useState } from 'react';
import Login from './modules/login';
import Dashboard from './modules/dashboard';
import GestionUsuarios from './modules/usuarios';
import RegistroUnidades from './modules/registroUnidades';
import StockInventario from './modules/stockInventario';
import Historico from './modules/historico';
import SolicitudUnidades from './modules/solicitudUnidades';

function App() {
  // Estado para el usuario autenticado
  const [usuario, setUsuario] = useState(null);

  // Estado para el módulo activo a nivel de aplicación
  const [moduloApp, setModuloApp] = useState('dashboard');

  const handleLogout = () => {
    setUsuario(null);
    setModuloApp('dashboard');
  };

  // Sin sesión: pantalla de Login
  if (!usuario) {
    return <Login onLoginSuccess={(datosUsuario) => setUsuario(datosUsuario)} />;
  }

  // Módulo: Gestión de Usuarios (Admin)
  if (moduloApp === 'usuarios') {
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
