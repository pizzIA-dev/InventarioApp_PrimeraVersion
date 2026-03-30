import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
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

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-header-title">Inventario y Balance</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="mobile-menu-btn"
            onClick={toggleTheme}
            style={{ fontSize: '18px' }}
          >
            {isDark ? <BulbFilled style={{ color: '#1b9cfc' }} /> : <BulbOutlined />}
          </button>
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MenuOutlined />
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            {collapsed && !mobileMenuOpen ? 'I&B' : 'Inventario y Balance'}
          </div>
        </div>
        
        <nav className="sidebar-menu">
          {menuItems.map((item) => (
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
        
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
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
            className="btn btn-secondary"
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <span style={{ display: 'inline-flex', width: '20px', justifyContent: 'center' }}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            {!collapsed && ' Colapsar menú'}
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
