import { useState, useEffect, useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import NegocIALogo from './NegocIALogo';
import { AuthContext } from '../context/AuthContext';
import { Modal } from 'antd';
import {
  DashboardOutlined,
  SafetyCertificateOutlined,
  CloudServerOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  ShoppingCartOutlined,
  ContainerOutlined,
  WalletOutlined,
  ToolOutlined,
  SwapOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  BulbOutlined,
  BulbFilled,
  CreditCardOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';

// Items visibles para COLABORADOR / VENDEDOR
const COLABORADOR_PATHS = ['/productos', '/clientes', '/ventas', '/servicios', '/fiados'];

// Menu principal (todos los roles que pasan el filtro de ruta)
const menuItems = [
  { path: '/',              icon: <DashboardOutlined />,    label: 'Dashboard',         rolesOnly: ['GERENTE'] },
  { path: '/productos',     icon: <ShoppingOutlined />,     label: 'Productos' },
  { path: '/proveedores',   icon: <TeamOutlined />,         label: 'Proveedores',        rolesOnly: ['GERENTE'] },
  { path: '/clientes',      icon: <UsergroupAddOutlined />, label: 'Clientes' },
  { path: '/ventas',        icon: <ShoppingCartOutlined />, label: 'Ventas' },
  { path: '/compras',       icon: <ContainerOutlined />,    label: 'Compras',            rolesOnly: ['GERENTE'] },
  { path: '/capital',       icon: <WalletOutlined />,       label: 'Capital',            rolesOnly: ['GERENTE'] },
  { path: '/servicios',     icon: <ToolOutlined />,         label: 'Servicios' },
  { path: '/transacciones', icon: <SwapOutlined />,         label: 'Transacciones Generales',       rolesOnly: ['GERENTE'] },
  { path: '/fiados',        icon: <CreditCardOutlined />,   label: 'Fiados' },
  { path: '/reportes',      icon: <BarChartOutlined />,     label: 'Reportes',           rolesOnly: ['GERENTE'] },
];

// Seccion admin — solo Gerente
const adminItems = [
  { path: '/usuarios',  icon: <UserOutlined />,               label: 'Colaboradores' },
  { path: '/roles',     icon: <SafetyCertificateOutlined />,  label: 'Roles Corporativos' },
  { path: '/backups',   icon: <CloudServerOutlined />,         label: 'Backups' },
];

function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, isVendedor, isGerente } = useContext(AuthContext);

  const handleLogoutClick = () => {
    Modal.confirm({
      title: '¿Cerrar sesion?',
      content: '¿Estas seguro que deseas salir del sistema?',
      okText: 'Si, cerrar sesion',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: () => { logout(); }
    });
  };

  // Filtrar menu segun rol
  const isColaborador = user?.rol === 'COLABORADOR' || user?.rol === 'VENDEDOR';
  const allowedMenuItems = menuItems.filter(item => {
    if (item.rolesOnly) return item.rolesOnly.includes(user?.rol);
    return true; // Sin restriccion = visible para todos
  });

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const empresaNombre = user?.empresa_nombre || 'NegocIA';

  return (
    <div className="layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <MenuOutlined />
          </button>
          <div className="mobile-header-title" style={{ fontSize: '16px' }}>{empresaNombre}</div>
        </div>
        <button className="mobile-menu-btn" onClick={toggleTheme} style={{ fontSize: '18px' }}>
          {isDark ? <BulbFilled style={{ color: '#1b9cfc' }} /> : <BulbOutlined />}
        </button>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            {collapsed && !mobileMenuOpen ? 'N' : empresaNombre}
          </div>
        </div>

        {/* Contenedor scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <nav className="sidebar-menu">
            {allowedMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="menu-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Seccion Admin - solo Gerente */}
          {isGerente && (
            <>
              <div style={{ borderTop: '1px solid var(--bg-table-header)', margin: '8px 12px', opacity: 0.4 }} />
              <div style={{ padding: '0 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {!collapsed && 'Administracion'}
              </div>
              <nav className="sidebar-menu" style={{ paddingTop: 0 }}>
                {adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    {!collapsed && <span style={{ fontSize: '12px' }}>{item.label}</span>}
                  </Link>
                ))}
              </nav>
            </>
          )}
        </div>

        {/* Botones inferiores */}
        <div style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-sidebar)',
          zIndex: 2
        }}>
          <button
            className="btn btn-secondary"
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <span style={{ display: 'inline-flex', width: '20px', justifyContent: 'center' }}>
              {isDark ? <BulbFilled style={{ color: '#1b9cfc' }} /> : <BulbOutlined />}
            </span>
            {!collapsed && (isDark ? ' Modo Claro' : ' Modo Oscuro')}
          </button>

          <button
            className="btn btn-secondary collapse-btn-desktop"
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <span style={{ display: 'inline-flex', width: '20px', justifyContent: 'center' }}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            {!collapsed && ' Colapsar menu'}
          </button>

          <button
            className="btn btn-danger"
            onClick={handleLogoutClick}
            style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', marginTop: 'auto' }}
          >
            <span style={{ display: 'inline-flex', width: '20px', justifyContent: 'center' }}>
              <LogoutOutlined />
            </span>
            {!collapsed && ' Cerrar Sesion'}
          </button>
        </div>
      </aside>

      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;

