import { useState, useEffect, useContext } from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import NegocIALogo from './NegocIALogo';
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
  AppstoreOutlined,
} from '@ant-design/icons';

/* ================================================================
   NAV DATA
   ================================================================ */
const GROUPS = [
  {
    key: 'general',
    label: 'General',
    alwaysOpen: true,
    items: [
      { path: '/',         icon: <DashboardOutlined />,   label: 'Dashboard', rolesOnly: ['GERENTE'] },
      { path: '/reportes', icon: <BarChartOutlined />,    label: 'Reportes',  rolesOnly: ['GERENTE'] },
    ],
  },
  {
    key: 'transacciones',
    label: 'Transacciones',
    items: [
      { path: '/ventas',  icon: <ShoppingCartOutlined />, label: 'Ventas' },
      { path: '/compras', icon: <ContainerOutlined />,    label: 'Compras',  rolesOnly: ['GERENTE'] },
      { path: '/fiados',  icon: <CreditCardOutlined />,   label: 'Fiados' },
    ],
  },
  {
    key: 'inventario',
    label: 'Inventario',
    items: [
      { path: '/productos',  icon: <ShoppingOutlined />,  label: 'Productos' },
      { path: '/servicios',  icon: <AppstoreOutlined />,  label: 'Servicios' },
    ],
  },
  {
    key: 'contactos',
    label: 'Contactos',
    alwaysOpen: true,
    items: [
      { path: '/proveedores', icon: <TeamOutlined />,          label: 'Proveedores', rolesOnly: ['GERENTE'] },
      { path: '/clientes',    icon: <UsergroupAddOutlined />,  label: 'Clientes' },
    ],
  },
  {
    key: 'otros',
    label: 'Otros',
    items: [
      { path: '/capital',       icon: <WalletOutlined />, label: 'Capital',             rolesOnly: ['GERENTE'] },
      { path: '/transacciones', icon: <SwapOutlined />,   label: 'Otras Transacciones', rolesOnly: ['GERENTE'] },
    ],
  },
];

const ADMIN_ITEMS = [
  { path: '/usuarios', icon: <UserOutlined />, label: 'Colaboradores' },
];

const ROL_LABELS = {
  GERENTE:      'Gerente',
  VENDEDOR:     'Vendedor',
  COLABORADOR:  'Colaborador',
};
const ROL_COLORS = {
  GERENTE:      '#10b981',
  VENDEDOR:     '#3b82f6',
  COLABORADOR:  '#8b5cf6',
};

/* ================================================================
   Collapsible group component
   ================================================================ */
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
      {/* Group header — fades out when collapsed */}
      <div
        className={`sidebar-group-header ${collapsed ? 'sidebar-group-header--hidden' : ''}`}
      >
        <button
          onClick={toggle}
          style={{
            width: '100%', background: 'none', border: 'none',
            cursor: alwaysOpen ? 'default' : 'pointer',
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
      </div>

      {/* Items */}
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
              title={item.label}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div className={`sidebar-divider ${collapsed ? 'sidebar-divider--hidden' : ''}`} />
    </div>
  );
}

/* ================================================================
   Main Layout
   ================================================================ */
function Layout() {
  const { schema } = useParams();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, isGerente } = useContext(AuthContext);

  const handleLogoutClick = () => {
    Modal.confirm({
      title: 'Cerrar sesion',
      content: 'Estas seguro que deseas salir del sistema?',
      okText: 'Si, cerrar sesion',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: () => { logout(); }
    });
  };

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const empresaNombre = user?.empresa_nombre || 'Mi Empresa';
  const userRol = user?.rol || 'VENDEDOR';
  const userEmail = user?.email || user?.username || '';
  const rolLabel = ROL_LABELS[userRol] || userRol;
  const rolColor = ROL_COLORS[userRol] || '#6b7280';

  return (
    <div className="layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <MenuOutlined />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>NegocIA</span>
            <span className="mobile-header-title" style={{ fontSize: 12 }}>{empresaNombre}</span>
          </div>
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

        {/* Sidebar Header — NegocIA + business name */}
        <div className="sidebar-header">
          {collapsed && !mobileMenuOpen ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #1677ff, #00f0ff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}>N</div>
            </div>
          ) : (
            <div>
              <div style={{
                fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #1677ff, #00b4d8)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1.1, marginBottom: 4,
              }}>NegocIA</div>
              <div style={{
                fontSize: 12, fontWeight: 500,
                color: 'var(--text-muted)', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{empresaNombre}</div>
            </div>
          )}
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

          {/* Admin section — only Colaboradores (Roles and Backups hidden for now) */}
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
        <div className="sidebar-footer" style={{
          borderTop: '1px solid var(--bg-table-header)',
          padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>

          {/* User info */}
          <div className={`sidebar-user-info ${collapsed ? 'sidebar-user-info--collapsed' : ''}`}>
            <div className="sidebar-user-avatar">
              <UserOutlined />
            </div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-email" title={userEmail}>{userEmail}</div>
              <div className="sidebar-user-role" style={{
                display: 'inline-block', marginTop: 2,
                background: `${rolColor}22`,
                color: rolColor,
                border: `1px solid ${rolColor}44`,
                borderRadius: 99, padding: '1px 8px',
                fontSize: 10, fontWeight: 700,
              }}>{rolLabel}</div>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="menu-item"
            style={{ border: 'none', cursor: 'pointer', background: 'none', width: '100%' }}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            <span className="menu-icon">
              {isDark ? <BulbFilled style={{ color: '#1b9cfc' }} /> : <BulbOutlined />}
            </span>
            <span className="menu-label">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="menu-item"
            style={{ border: 'none', cursor: 'pointer', background: 'none', width: '100%' }}
            title={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          >
            <span className="menu-icon">
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <span className="menu-label">Contraer</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogoutClick}
            className="menu-item"
            style={{ border: 'none', cursor: 'pointer', background: 'none', width: '100%', color: '#ef4444' }}
            title="Cerrar sesion"
          >
            <span className="menu-icon"><LogoutOutlined style={{ color: '#ef4444' }} /></span>
            <span className="menu-label" style={{ color: '#ef4444' }}>Cerrar sesion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
