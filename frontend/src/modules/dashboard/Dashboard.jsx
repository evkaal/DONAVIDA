import React from 'react';
import './Dashboard.css';

export default function Dashboard({ usuario, onLogout }) {
  return (
    <div className="dashboard-page">
      <header className="dashboard-navbar">
        <div className="dashboard-brand">
          
        </div>

        <div className="dashboard-user-bar">
          <span className="user-email-badge">
            {usuario || 'usuario@institucion.gob.mx'}
          </span>
          <button type="button" className="btn-logout" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-placeholder-card">
          <h2 className="dashboard-placeholder-title">Dashboard</h2>
          
        </div>
      </main>
    </div>
  );
}
