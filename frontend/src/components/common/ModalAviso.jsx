import React from 'react';
import './ModalAviso.css';

// Modal sencillo que sustituye a los alert() y confirm() del navegador.
// Mismo look que el resto de modales del proyecto (overlay oscuro,
// tarjeta blanca, botón primario vino #9e1329).
//
// Uso como aviso (un solo botón "Aceptar"):
//   <ModalAviso isOpen={!!aviso} titulo="Aviso" mensaje={aviso?.mensaje}
//     onClose={() => setAviso(null)} />
//
// Uso como confirmación (botones "Cancelar" / "Aceptar"):
//   <ModalAviso isOpen={!!confirmacion} tipo="confirmacion"
//     titulo="Eliminar usuario"
//     mensaje="¿Estás seguro de eliminar este usuario del sistema?"
//     textoAceptar="Eliminar"
//     onAceptar={() => hacerEliminacion()}
//     onClose={() => setConfirmacion(null)} />
export default function ModalAviso({
  isOpen,
  tipo = 'aviso',
  titulo = 'Aviso',
  mensaje,
  textoAceptar = 'Aceptar',
  textoCancelar = 'Cancelar',
  onAceptar,
  onClose,
}) {
  if (!isOpen) return null;

  const esConfirmacion = tipo === 'confirmacion';

  const handleAceptar = () => {
    if (onAceptar) {
      onAceptar();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="aviso-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="aviso-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="aviso-titulo">{titulo}</h2>
        <p className="aviso-mensaje">{mensaje}</p>
        <footer className="aviso-footer">
          {esConfirmacion && (
            <button type="button" className="aviso-btn-cancelar" onClick={onClose}>
              {textoCancelar}
            </button>
          )}
          <button type="button" className="aviso-btn-aceptar" onClick={handleAceptar}>
            {textoAceptar}
          </button>
        </footer>
      </div>
    </div>
  );
}
