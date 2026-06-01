import { useState, useEffect, useContext } from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
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
  CaretRightOutlined,
} from '@ant-design/icons';

/* ─── Sidebar group definitions ─────────────────────────────────────────── */
const GROUPS = [
  {
    key: 'general',
    label: 'General',
    alwaysOpen: false,
    items: [
      { path: '/',         icon: <DashboardOutlined />,  label: 'Dashboard', rolesOnly: ['GERENTE'] },
      { path: '/reportes', icon: <BarChartOutlined />,   label: 'Reportes',  rolesOnly: ['GERENTE'] },
    ],
  },
  {
    key: 'transacciones',
    label: 'Transacciones',
    alwaysOpen: true,
    items: [
      { path: '/ventas',  icon: <ShoppingCartOutlined />, label: 'Ventas' },
      { path: '/compras', icon: <ContainerOutlined />,    label: 'Compras',  rolesOnly: ['GERENTE'] },
      { path: '/fiados',  icon: <CreditCardOutlined />,   label: 'Fiados' },
    ],
  },
  {
    key: 'inventario',
    label: 'Inventario',
    alwaysOpen: false,
    items: [
      { path: '/productos',  icon: <ShoppingOutlined />, label: 'Productos' },
      { path: '/servicios',  icon: <ToolOutlined />,     label: 'Servicios' },
    ],
  },
  {
    key: 'contactos',
    label: 'Contactos',
    alwaysOpen: false,
    items: [
      { path: '/proveedores', icon: <TeamOutlined />,          label: 'Proveedores', rolesOnly: ['GERENTE'] },
      { path: '/clientes',    icon: <UsergroupAddOutlined />,  label: 'Clientes' },
    ],
  },
  {
    key: 'otros',
    label: 'Otros',
    alwaysOpen: false,
    items: [
      { path: '/capital',       icon: <WalletOutlined />, label: 'Capital',             rolesOnly: ['GERENTE'] },
      { path: '/transacciones', icon: <SwapOutlined />,   label: 'Otras Transacciones', rolesOnly: ['GERENTE'] },
    ],
  },
];

const ADMIN_ITEMS = [
  { path: '/usuarios', icon: <UserOutlined />,              label: 'Colaboradores' },
  { path: '/roles',    icon: <SafetyCertificateOutlined />, label: 'Roles Corporativos' },
  { path: '/backups',  icon: <CloudServerOutlined />,       label: 'Backups' },
];

/* ─── Collapsible group component ──────────────────────────────────────── */
function SidebarGroup({ groupKey, label, items, alwaysOpen, schema, location, collapsed, userRol }) {
  const [open, setOpen] = useState(alwaysOpen || groupKey === 'general' || groupKey === 'contactos');

  const isActive = items.some(item => {
    const fullPath = `/t/${schema}${item.path === '/' ? '' : item.path}`;
    return location.pathname === fullPath;
  });

  const filteredItems = items.filter(item => {
    if (item.rolesOnly) return item.rolesOnly.includes(userRol);
    return true;
  });

  if (filteredItems.length === 0) return null;

  const toggle = () => { if (!alwaysOpen) setOpen(o => !o); };

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Group header */}
      {!collapsed && (
        <button
          onClick={toggle}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: alwaysOpen ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 14px 4px', color: 'var(--text-muted)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            userSelect: 'none',
          }}
        >
          <span style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' }}>{label}</span>
          {!alwaysOpen && (
            <CaretRightOutlined style={{
              fontSize: 9,
              transition: 'transform 0.25s ease',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              color: 'var(--text-muted)',
            }} />
          )}
        </button>
      )}

      {/* Animated items container */}
      <div style={{
        overflow: 'hidden',
        maxHeight: (open || collapsed) ? '400px' : '0px',
        opacity: (open || collapsed) ? 1 : 0,
        transition: 'max-height 0.28s ease, opacity 0.2s ease',
      }}>
        {filteredItems.map(item => {
          const fullPath = `/t/${schema}${item.path === '/' ? '' : item.path}`;
          const active = location.pathname === fullPath;
          return (
            <Link
              key={item.path}
              to={fullPath}
              className={`menu-item ${active ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="menu-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      {!collapsed && <div style={{ height: 1, background: 'var(--bg-table-header)', margin: '4px 14px', opacity: 0.5 }} />}
    </div>
  );
}

/* ─── Main Layout ────────────────────────────────────────────────────────── */
function Layout() {
  const { schema } = useParams();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, isGerente } = useContext(AuthContext);

  const handleLogoutClick = () => {
    Modal.confirm({
      title: 'Cerrar sesion?',
      content: 'Estas seguro que deseas salir del sistema?',
      okText: 'Si, cerrar sesion',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: () => { logout(); }
    });
  };

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const empresaNombre = user?.empresa_nombre || 'NegocIA';
  const userRol = user?.rol || 'VENDEDOR';

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
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-title">
            {collapsed && !mobileMenuOpen ? 'N' : empresaNombre}
          </div>
        </div>

        {/* Scrollable nav area */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 8 }}>
          {GROUPS.map(group => (
            <SidebarGroup
              key={group.key}
              groupKey={group.key}
              label={group.label}
              items={group.items}
              alwaysOpen={group.alwaysOpen}
              schema={schema}
              location={location}
              collapsed={collapsed}
              userRol={userRol}
            />
          ))}

          {/* Admin section */}
          {isGerente && (
            <SidebarGroup
              groupKey="admin"
              label="Administracion"
              items={ADMIN_ITEMS}
              alwaysOpen={false}
              schema={schema}
              location={location}
              collapsed={collapsed}
              userRol={userRol}
            />
          )}
        </div>

        {/* Sidebar footer */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--bg-table-header)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="menu-item"
            style={{ border: 'none', cursor: 'pointer', background: 'none', width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            <span className="menu-icon">
              {isDark ? <BulbFilled style={{ color: '#1b9cfc' }} /> : <BulbOutlined />}
            </span>
            {!collapsed && <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="menu-item"
            style={{ border: 'none', cursor: 'pointer', background: 'none', width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
            title={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          >
            <span className="menu-icon">
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            {!collapsed && <span>Contraer</span>}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogoutClick}
            className="menu-item"
            style={{ border: 'none', cursor: 'pointer', background: 'none', width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: '#ef4444' }}
            title="Cerrar sesion"
          >
            <span className="menu-icon"><LogoutOutlined style={{ color: '#ef4444' }} /></span>
            {!collapsed && <span>Cerrar sesion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
