import { useState } from 'react';
import FiadosOperaciones from '../components/fiados/FiadosOperaciones';
import FiadosClientes from '../components/fiados/FiadosClientes';
import { CreditCardOutlined, TeamOutlined } from '@ant-design/icons';

function Fiados() {
  const [activeTab, setActiveTab] = useState('operaciones');

  return (
    <div>


      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'operaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('operaciones')}
        >
          <CreditCardOutlined style={{ marginRight: '8px' }} />
          Operaciones / Deudas
        </button>
        <button 
          className={`tab ${activeTab === 'clientes' ? 'active' : ''}`}
          onClick={() => setActiveTab('clientes')}
        >
          <TeamOutlined style={{ marginRight: '8px' }} />
          Clientes Fiados
        </button>
      </div>

      <div className="tab-content" style={{ marginTop: '20px' }}>
        {activeTab === 'operaciones' && <FiadosOperaciones />}
        {activeTab === 'clientes' && <FiadosClientes />}
      </div>
    </div>
  );
}

export default Fiados;
