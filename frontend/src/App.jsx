import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { ThemeProvider, useTheme } from './ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import ResetPassword from './pages/ResetPassword';

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
const GestionUsuarios = lazy(() => import('./pages/GestionUsuarios'));
const GestionRoles    = lazy(() => import('./pages/GestionRoles'));
const GestionAlmacenes = lazy(() => import('./pages/GestionAlmacenes'));
const Backups          = lazy(() => import('./pages/Backups'));

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
                        {/* Routing: dominio principal (landing) vs subdominio de tenant (app) */}
            {/* VITE_ROOT_DOMAIN en .env de producción: 'tudominio.com' */}
            {(() => {
              const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || 'localhost';
              const h = window.location.hostname;
              const isMain = h === rootDomain || h === `www.${rootDomain}` || h === 'localhost';
              return isMain;
            })() ? (
              <>
                <Route path="/" element={<Landing view="planes" />} />
                <Route path="/planes" element={<Landing view="planes" />} />
                <Route path="/registro/:planId" element={<Landing view="registro" />} />
                {/* Fallback para la landing si ponen cualquier cosa */}
                <Route path="*" element={<Landing view="planes" />} />
              </>
            ) : (
              /* Si estamos en un subdominio de un cliente (ej. mitienda.localhost), mostramos app privada */
              <>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<ProtectedRoute allowedRoles={['GERENTE']}><Dashboard /></ProtectedRoute>} />
                  <Route path="productos"     element={<ProtectedRoute allowedRoles={['GERENTE','VENDEDOR','COLABORADOR']}><Productos /></ProtectedRoute>} />
                  <Route path="proveedores"   element={<ProtectedRoute allowedRoles={['GERENTE']}><Proveedores /></ProtectedRoute>} />
                  <Route path="clientes"      element={<ProtectedRoute allowedRoles={['GERENTE','VENDEDOR','COLABORADOR']}><Clientes /></ProtectedRoute>} />
                  <Route path="ventas"        element={<ProtectedRoute allowedRoles={['GERENTE','VENDEDOR','COLABORADOR']}><Ventas /></ProtectedRoute>} />
                  <Route path="compras"       element={<ProtectedRoute allowedRoles={['GERENTE']}><Compras /></ProtectedRoute>} />
                  <Route path="capital"       element={<ProtectedRoute allowedRoles={['GERENTE']}><Capital /></ProtectedRoute>} />
                  <Route path="servicios"     element={<ProtectedRoute allowedRoles={['GERENTE','VENDEDOR','COLABORADOR']}><Servicios /></ProtectedRoute>} />
                  <Route path="transacciones" element={<ProtectedRoute allowedRoles={['GERENTE']}><Transacciones /></ProtectedRoute>} />
                  <Route path="reportes"      element={<ProtectedRoute allowedRoles={['GERENTE']}><Reportes /></ProtectedRoute>} />
                  <Route path="fiados"        element={<ProtectedRoute allowedRoles={['GERENTE','VENDEDOR','COLABORADOR']}><Fiados /></ProtectedRoute>} />
                  <Route path="usuarios"      element={<ProtectedRoute allowedRoles={['GERENTE']}><GestionUsuarios /></ProtectedRoute>} />
                  <Route path="roles"         element={<ProtectedRoute allowedRoles={['GERENTE']}><GestionRoles /></ProtectedRoute>} />
                  <Route path="almacenes"     element={<ProtectedRoute allowedRoles={['GERENTE']}><GestionAlmacenes /></ProtectedRoute>} />
                  <Route path="backups"       element={<ProtectedRoute allowedRoles={['GERENTE']}><Backups /></ProtectedRoute>} />
                </Route>
              </>
            )}
          </Routes>
        </Suspense>
      </Router>
    </ConfigProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

