import { useState } from 'react';
import { CreditCardOutlined, TeamOutlined } from '@ant-design/icons';
import FiadosOperaciones from '../components/fiados/FiadosOperaciones';
import FiadosClientes from '../components/fiados/FiadosClientes';

function Fiados() {
  const [activeTab, setActiveTab] = useState('operaciones');

  const tabs = [
    { key: 'operaciones', label: 'Operaciones / Deudas', icon: <CreditCardOutlined /> },
    { key: 'clientes',    label: 'Clientes Fiados',      icon: <TeamOutlined /> },
  ];

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '2px solid var(--border-color)',
        marginBottom: '24px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? '600' : '400',
              color: activeTab === tab.key ? 'var(--primary-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary-color)' : '2px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'operaciones' && <FiadosOperaciones />}
      {activeTab === 'clientes' && <FiadosClientes />}
    </div>
  );
}

export default Fiados;