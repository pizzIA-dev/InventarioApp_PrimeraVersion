import { useState } from 'react';
import { Tabs } from 'antd';
import { ContainerOutlined, ToolOutlined } from '@ant-design/icons';
import { lazy, Suspense } from 'react';

const ComprasProductos = lazy(() => import('./Compras'));
const ComprasServicios = lazy(() => import('./ComprasServicios'));

const Loader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
    <div className="spinner" />
  </div>
);

function ComprasMain() {
  const [activeTab, setActiveTab] = useState('productos');

  const tabItems = [
    {
      key: 'productos',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <ContainerOutlined />
          Compra de Productos
        </span>
      ),
      children: (
        <Suspense fallback={<Loader />}>
          <ComprasProductos />
        </Suspense>
      ),
    },
    {
      key: 'servicios',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <ToolOutlined />
          Compra de Servicios
        </span>
      ),
      children: (
        <Suspense fallback={<Loader />}>
          <ComprasServicios />
        </Suspense>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 20 }}
        destroyInactiveTabPane={false}
      />
    </div>
  );
}

export default ComprasMain;
