import { useState, useEffect } from 'react';
import { fiadosAPI } from '../../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import ConfirmDialog from '../ConfirmDialog';
import FiadoClienteFormModal from './FiadoClienteFormModal';
import ClienteFiadoHistorialModal from './ClienteFiadoHistorialModal';
import ExportDropdown from '../ExportDropdown';
import { message } from 'antd';

function FiadosClientes() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  
  // Kardex Global de Cliente
  const [kardexVisible, setKardexVisible] = useState(false);
  const [clienteToKardex, setClienteToKardex] = useState(null);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const response = await fiadosAPI.getClientes();
      setClientes(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode, cliente = null) => {
    setModalMode(mode);
    setSelectedCliente(cliente);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCliente(null);
  };

  const handleSubmit = async (clientData) => {
    try {
      if (modalMode === 'create') {
        await fiadosAPI.createCliente(clientData);
      } else {
        await fiadosAPI.updateCliente(selectedCliente.id, clientData);
      }
      closeModal();
      fetchClientes();
    } catch (error) {
      console.error('Error saving cliente:', error);
      alert(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDeleteClick = (cliente) => {
    setConfirmDialog({ visible: true, id: cliente.id, nombre: cliente.nombre });
  };

  const handleDelete = async () => {
    try {
      if (!confirmDialog.id) return;
      await fiadosAPI.deleteCliente(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchClientes();
    } catch (error) {
      console.error('Error deleting cliente:', error);
      alert(error.response?.data?.error || 'No se pudo eliminar el cliente (puede tener fiados pendientes). Se desactivó si corresponde.');
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchClientes();
    }
  };
  
  const handleExportClientes = async (periodo, anio) => {
    try {
      const response = await fiadosAPI.exportarClientes({ periodo, anio });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_clientes_fiados_${periodo}_${anio || 'todo'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exportando clientes:', error);
      message.error('No se pudo generar el reporte de clientes.');
    }
  };

  const handleExportHistorialGlobal = async (periodo, anio) => {
    try {
      const response = await fiadosAPI.exportarHistorialGlobal({ periodo, anio });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kardex_global_fiados_${periodo}_${anio || 'todo'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exportando historial global:', error);
      message.error('No se pudo generar el historial global.');
    }
  };

  const filteredClientes = clientes.filter(c => {
    const term = searchTerm.toLowerCase();
    const nombreMatch = (c.nombre || '').toLowerCase().includes(term);
    const docMatch = (c.documento || '').toLowerCase().includes(term);
    return nombreMatch || docMatch;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary, #f8fafc)' }}>Módulo de Fiados</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #94a3b8)' }}>Gestión interna de cuentas por cobrar y cliente fiados</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ExportDropdown 
            label="Exportar Historial Global"
            onExport={handleExportHistorialGlobal}
          />
          <ExportDropdown 
            label="Exportar Clientes Fiados"
            onExport={handleExportClientes}
          />
          <button className="btn btn-primary" onClick={() => openModal('create')} style={{ borderRadius: '8px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusOutlined /> Nuevo Cliente
          </button>
        </div>
      </div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Eliminar Cliente de Fiados"
        message={`¿Estás seguro de que deseas eliminar a "${confirmDialog.nombre}"? Si tiene operaciones solo se desactivará.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        confirmText="Sí, procesar"
        danger={true}
      />

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nombre o documento..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Tel/Celular</th>
                <th>Dirección</th>
                <th>Próxima Fecha Límite</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr key={cliente.id} style={{ opacity: cliente.activo ? 1 : 0.6 }}>
                  <td style={{ fontWeight: '500' }}>{cliente.nombre}</td>
                  <td>{cliente.documento || '-'}</td>
                  <td>{cliente.telefono || '-'}</td>
                  <td>{cliente.direccion || '-'}</td>
                  <td style={{ 
                    color: cliente.proxima_fecha_limite && new Date(cliente.proxima_fecha_limite) < new Date() ? 'var(--danger-color)' : 'inherit',
                    fontWeight: '600'
                  }}>
                    {cliente.proxima_fecha_limite ? new Date(cliente.proxima_fecha_limite + 'T12:00:00').toLocaleDateString() : '-'}
                  </td>
                  <td>
                    <span className={`badge ${cliente.activo ? 'badge-success' : 'badge-danger'}`}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => { setClienteToKardex(cliente); setKardexVisible(true); }} title="Ver Kardex Global">
                      <HistoryOutlined />
                    </button>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', cliente)} title="Editar">
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(cliente)} title="Eliminar/Desactivar">
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClientes.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                    No se encontraron clientes fiados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClienteFiadoHistorialModal 
        visible={kardexVisible}
        onClose={() => { setKardexVisible(false); setClienteToKardex(null); }}
        cliente={clienteToKardex}
      />

      <FiadoClienteFormModal 
        visible={modalVisible}
        mode={modalMode}
        initialData={selectedCliente}
        onClose={closeModal}
        onSave={handleSubmit}
      />
    </div>
  );
}

export default FiadosClientes;
