import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { ThemeProvider, useTheme } from './ThemeContext';
import Layout from './components/Layout';

// Lazy loading de páginas (bundle-dynamic-imports / code-splitting)
// Cada página se cargará solo cuando el usuario navegue a esa ruta
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Productos = lazy(() => import('./pages/Productos'));
const Proveedores = lazy(() => import('./pages/Proveedores'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Ventas = lazy(() => import('./pages/Ventas'));
const Compras = lazy(() => import('./pages/Compras'));
const Capital = lazy(() => import('./pages/Capital'));
const Servicios = lazy(() => import('./pages/Servicios'));
const Transacciones = lazy(() => import('./pages/Transacciones'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Fiados = lazy(() => import('./pages/Fiados'));

// Fallback de carga para Suspense — usa el spinner ya definido en index.css
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <div className="spinner" />
  </div>
);

const AppContent = () => {
  const { isDark } = useTheme();
  
  return (
    <ConfigProvider 
      locale={esES}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Router>
        {/* Suspense envuelve las rutas para mostrar el PageLoader mientras
            se descarga el chunk de la página correspondiente */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="productos" element={<Productos />} />
              <Route path="proveedores" element={<Proveedores />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="ventas" element={<Ventas />} />
              <Route path="compras" element={<Compras />} />
              <Route path="capital" element={<Capital />} />
              <Route path="servicios" element={<Servicios />} />
              <Route path="transacciones" element={<Transacciones />} />
              <Route path="reportes" element={<Reportes />} />
              <Route path="fiados" element={<Fiados />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </ConfigProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;

