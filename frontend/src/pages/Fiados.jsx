import { useState } from 'react';
import { Tabs } from 'antd';
import { CreditCardOutlined, TeamOutlined } from '@ant-design/icons';
import FiadosOperaciones from '../components/fiados/FiadosOperaciones';
import FiadosClientes from '../components/fiados/FiadosClientes';

const TAB_ITEMS = [
  {
    key: 'operaciones',
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <CreditCardOutlined />
        Operaciones / Deudas
      </span>
    ),
    children: <FiadosOperaciones />,
  },
  {
    key: 'clientes',
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <TeamOutlined />
        Clientes Fiados
      </span>
    ),
    children: <FiadosClientes />,
  },
];

function Fiados() {
  const [activeTab, setActiveTab] = useState('operaciones');

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={TAB_ITEMS}
        size="large"
        style={{ marginBottom: 0 }}
        tabBarStyle={{ marginBottom: 20 }}
      />
    </div>
  );
}

export default Fiados;
