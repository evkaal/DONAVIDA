import React, { useState } from 'react';
import Login from './modules/login';
import Dashboard from './modules/dashboard';

function App() {
  // Estado para el usuario autenticado
  const [usuario, setUsuario] = useState(null);

  return (
    <main>
      {usuario ? (
        // Si inició sesión correctamente, muestra el Dashboard
        <Dashboard usuario={usuario} onLogout={() => setUsuario(null)} />
      ) : (
        // De lo contrario, muestra la pantalla de Login
        <Login onLoginSuccess={(email) => setUsuario(email)} />
      )}
    </main>
  );
}

export default App;
