import React from 'react';

/**
 * Logo de PizzIA — copia exacta del logo del mapa central del portafolio (App.jsx).
 * Usa `transform: scale` + transform-box: fill-box para replicar el Tailwind animate-ping.
 */
const PizzIALogo = ({ width = 40, height = 40, style = {} }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    style={{ overflow: 'visible', filter: 'drop-shadow(0 0 15px #00d2ff)', ...style }}
  >
    <style>{`
      @keyframes pizzia-ping {
        75%, 100% {
          transform: scale(2.5);
          opacity: 0;
        }
      }
      .pizzia-ping-ring {
        transform-box: fill-box;
        transform-origin: center;
        animation: pizzia-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
    `}</style>

    {/* Cuerpo del cono */}
    <path
      d="M50 15 L15 85 A50 15 0 0 0 85 85 Z"
      fill="rgba(10,10,10,0.8)"
      stroke="#00a2ff"
      strokeWidth="4"
      strokeLinejoin="round"
    />

    {/* Corteza cian */}
    <path
      d="M15 85 A50 15 0 0 0 85 85"
      fill="transparent"
      stroke="#00d2ff"
      strokeWidth="6"
      strokeLinecap="round"
    />

    {/* Ping ring — se escala hacia afuera y desvanece (igual que Tailwind animate-ping) */}
    <circle cx="50" cy="45" r="5" fill="#00d2ff" className="pizzia-ping-ring" />
    {/* Círculo sólido debajo (siempre visible) */}
    <circle cx="50" cy="45" r="5" fill="#00d2ff" />

    {/* Ojos / dots */}
    <circle cx="35" cy="70" r="4" fill="#00d2ff" />
    <circle cx="65" cy="65" r="4" fill="#00d2ff" />
  </svg>
);

export default PizzIALogo;
