import { useState, useEffect, useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { Modal } from 'antd';
import { 
  DashboardOutlined, 
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

const menuItems = [
  { path: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { path: '/productos', icon: <ShoppingOutlined />, label: 'Productos' },
  { path: '/proveedores', icon: <TeamOutlined />, label: 'Proveedores' },
  { path: '/clientes', icon: <UsergroupAddOutlined />, label: 'Clientes' },
  { path: '/ventas', icon: <ShoppingCartOutlined />, label: 'Ventas' },
  { path: '/compras', icon: <ContainerOutlined />, label: 'Compras' },
  { path: '/capital', icon: <WalletOutlined />, label: 'Capital' },
  { path: '/servicios', icon: <ToolOutlined />, label: 'Servicios' },
  { path: '/transacciones', icon: <SwapOutlined />, label: 'Otros Movimientos' },
  { path: '/fiados', icon: <CreditCardOutlined />, label: 'Fiados' },
  { path: '/reportes', icon: <BarChartOutlined />, label: 'Reportes' },
];

function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { isVendedor, logout } = useContext(AuthContext);

  const handleLogoutClick = () => {
    Modal.confirm({
      title: '¿Cerrar sesión?',
      content: '¿Estás seguro que deseas salir del sistema?',
      okText: 'Sí, cerrar sesión',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: () => {
        logout();
      }
    });
  };

  // Filter menu items for vendors
  const allowedMenuItems = menuItems.filter(item => {
    if (isVendedor) {
      return ['/productos', '/clientes', '/ventas', '/servicios', '/fiados'].includes(item.path);
    }
    return true; // Gerente sees everything
  });

  // Menu extra solo para Gerente
  const gerenteMenuItems = [
    { path: '/usuarios', icon: <UserOutlined />, label: 'Gestión de Usuarios' },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MenuOutlined />
          </button>
          <div className="mobile-header-title" style={{ fontSize: '16px' }}>Inventario</div>
        </div>
        <button 
          className="mobile-menu-btn"
          onClick={toggleTheme}
          style={{ fontSize: '18px' }}
        >
          {isDark ? <BulbFilled style={{ color: '#1b9cfc' }} /> : <BulbOutlined />}
        </button>
      </div>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            {collapsed && !mobileMenuOpen ? 'I&B' : 'Inventario y Balance'}
          </div>
        </div>
        
        {/* Contenedor scrollable para los menús */}
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
          
          {/* Sección de Admin solo visible para Gerente */}
          {!isVendedor && (
            <>
              <div style={{ borderTop: '1px solid var(--bg-table-header)', margin: '8px 12px', opacity: 0.4 }} />
              <nav className="sidebar-menu" style={{ paddingBottom: 0 }}>
                {gerenteMenuItems.map((item) => (
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
        
        {/* Contenedor fijo en la parte inferior */}
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
            title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
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
            {!collapsed && ' Colapsar menú'}
          </button>
          
          <button 
            className="btn btn-danger"
            onClick={handleLogoutClick}
            style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', marginTop: 'auto' }}
          >
            <span style={{ display: 'inline-flex', width: '20px', justifyContent: 'center' }}>
              <LogoutOutlined />
            </span>
            {!collapsed && ' Cerrar Sesión'}
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
