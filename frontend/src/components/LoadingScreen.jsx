import React from 'react';
import neonLogo from '../ImagenCarga/124473830.png';
import '../styles/LoadingScreen.css'; // Will create this

const LoadingScreen = ({ message = "PROCESANDO DATOS..." }) => {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="neon-pizza-wrapper">
          <img src={neonLogo} alt="Cargando..." className="neon-pizza-logo" />
        </div>
        <div className="loading-text">{message}</div>
      </div>
    </div>
  );
};

export default LoadingScreen;
