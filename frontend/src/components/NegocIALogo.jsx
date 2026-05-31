import React from 'react';

/**
 * Logo oficial de NegocIA — SaaS de gestion empresarial.
 * Icono: letra "N" con nodo de IA (pulse ring).
 * Colores: cyan #00d2ff (brand), fondo oscuro semi-transparente.
 */
const NegocIALogo = ({ width = 40, height = 40, style = {} }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    style={{ overflow: 'visible', filter: 'drop-shadow(0 0 12px #00d2ff88)', ...style }}
  >
    <style>{`
      @keyframes negocia-pulse {
        0%   { transform: scale(1);    opacity: 0.9; }
        50%  { transform: scale(1.18); opacity: 0.5; }
        100% { transform: scale(1);    opacity: 0.9; }
      }
      @keyframes negocia-ring {
        0%   { transform: scale(1);   opacity: 0.6; }
        100% { transform: scale(2.4); opacity: 0;   }
      }
      .ng-pulse { transform-box: fill-box; transform-origin: center; animation: negocia-pulse 2s ease-in-out infinite; }
      .ng-ring  { transform-box: fill-box; transform-origin: center; animation: negocia-ring  2s ease-out  infinite; }
    `}</style>

    {/* Fondo redondeado */}
    <rect x="8" y="8" width="84" height="84" rx="18" ry="18"
      fill="rgba(0,20,35,0.9)" stroke="#00d2ff" strokeWidth="3" />

    {/* Letra N - trazo izquierdo */}
    <line x1="22" y1="74" x2="22" y2="26" stroke="#00d2ff" strokeWidth="9" strokeLinecap="round" />
    {/* Diagonal de la N */}
    <line x1="22" y1="26" x2="52" y2="74" stroke="#00d2ff" strokeWidth="9" strokeLinecap="round" />
    {/* Trazo derecho de la N */}
    <line x1="52" y1="74" x2="52" y2="26" stroke="#00a2ff" strokeWidth="9" strokeLinecap="round" />

    {/* Nodo IA - punto superior derecho con ping animado */}
    <circle cx="72" cy="26" r="9"  fill="#00d2ff" opacity="0.25" className="ng-ring" />
    <circle cx="72" cy="26" r="6"  fill="#00d2ff" className="ng-pulse" />
  </svg>
);

export default NegocIALogo;