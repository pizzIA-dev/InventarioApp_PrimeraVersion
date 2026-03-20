import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
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
  { path: '/transacciones', icon: <SwapOutlined />, label: 'Transacciones' },
  { path: '/reportes', icon: <BarChartOutlined />, label: 'Reportes' },
];

function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-header-title">Inventario y Balance</div>
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <MenuOutlined />
        </button>
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
        
        <button 
          className="btn btn-secondary"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
          }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          {!collapsed && ' Colapsar menú'}
        </button>
      </aside>

      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
