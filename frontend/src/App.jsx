import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { ThemeProvider, useTheme } from './ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Proveedores from './pages/Proveedores';
import Clientes from './pages/Clientes';
import Ventas from './pages/Ventas';
import Compras from './pages/Compras';
import Capital from './pages/Capital';
import Servicios from './pages/Servicios';
import Transacciones from './pages/Transacciones';
import Reportes from './pages/Reportes';

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
          </Route>
        </Routes>
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
