/**
 * Panel de Control (back-office de los dueños de NegocIA).
 * Se carga en un chunk aparte desde App.jsx (/panel/*): la app de los negocios
 * no importa nada de esta carpeta.
 */
import { lazy, Suspense } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import {
  DashboardOutlined, ShopOutlined, DollarOutlined, ReconciliationOutlined, AuditOutlined,
} from '@ant-design/icons';
import { PanelAuthProvider, usePanelAuth } from './PanelAuthContext';
import PanelLogin from './pages/PanelLogin';
import './panel.css';

const PanelDashboard = lazy(() => import('./pages/PanelDashboard'));
const PanelEmpresas = lazy(() => import('./pages/PanelEmpresas'));
const PanelEmpresaDetalle = lazy(() => import('./pages/PanelEmpresaDetalle'));
const PanelPagos = lazy(() => import('./pages/PanelPagos'));
const PanelGastos = lazy(() => import('./pages/PanelGastos'));
const PanelMovimientos = lazy(() => import('./pages/PanelMovimientos'));

const PANEL_THEME = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#b4532a',
    colorInfo: '#0f766e',
    colorSuccess: '#0f766e',
    colorError: '#b42318',
    colorWarning: '#b7791f',
    borderRadius: 8,
    fontFamily: "'Outfit', system-ui, sans-serif",
    colorBgContainer: '#fffefb',
    colorBorderSecondary: '#ebe7dd',
  },
  components: {
    Table: { headerBg: '#faf8f3', rowHoverBg: '#f7f3ea' },
  },
};

const NAV = [
  { to: '/panel', end: true, icon: <DashboardOutlined />, label: 'Resumen' },
  { to: '/panel/empresas', icon: <ShopOutlined />, label: 'Empresas' },
  { to: '/panel/pagos', icon: <DollarOutlined />, label: 'Ingresos' },
  { to: '/panel/gastos', icon: <ReconciliationOutlined />, label: 'Gastos' },
  { to: '/panel/movimientos', icon: <AuditOutlined />, label: 'Auditoría' },
];

function PanelLayout() {
  const { admin, logout } = usePanelAuth();
  return (
    <div className="pnl">
      <aside className="pnl-side">
        <div className="pnl-brand">
          <div className="pnl-brand-name">Negoc<em>IA</em></div>
          <div className="pnl-brand-sub">Panel de control</div>
        </div>
        <nav className="pnl-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>{n.icon}<span>{n.label}</span></NavLink>
          ))}
        </nav>
        <div className="pnl-side-foot">
          <div className="who">{admin?.nombre}</div>
          <div className="role">{admin?.is_superuser ? 'SUPERUSUARIO' : 'STAFF'}</div>
          <button type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="pnl-main">
        <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}><Spin /></div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function RequirePanelAdmin({ children }) {
  const { admin } = usePanelAuth();
  const location = useLocation();
  if (!admin) return <Navigate to="/panel/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function PanelApp() {
  return (
    <ConfigProvider theme={PANEL_THEME}>
      <PanelAuthProvider>
        <Routes>
          <Route path="login" element={<PanelLogin />} />
          <Route element={<RequirePanelAdmin><PanelLayout /></RequirePanelAdmin>}>
            <Route index element={<PanelDashboard />} />
            <Route path="empresas" element={<PanelEmpresas />} />
            <Route path="empresas/:id" element={<PanelEmpresaDetalle />} />
            <Route path="pagos" element={<PanelPagos />} />
            <Route path="gastos" element={<PanelGastos />} />
            <Route path="movimientos" element={<PanelMovimientos />} />
            <Route path="*" element={<Navigate to="/panel" replace />} />
          </Route>
        </Routes>
      </PanelAuthProvider>
    </ConfigProvider>
  );
}
