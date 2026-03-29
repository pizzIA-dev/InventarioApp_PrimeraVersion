import { useState, useEffect } from 'react';
import { clientesAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import { message } from 'antd';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import ClienteFormModal from '../components/ClienteFormModal';
import ClienteHistoryModal from '../components/ClienteHistoryModal';

function Clientes() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchContacto, setSearchContacto] = useState('');
  const [filterTipo, setFilterTipo] = useState('ALL');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [historyVisible, setHistoryVisible] = useState(false);
  const [clienteForHistory, setClienteForHistory] = useState(null);

  // Pagination
  const CLIENTES_PAGE_SIZE = 15;
  const [clientesPage, setClientesPage] = useState(1);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const response = await clientesAPI.getAll();
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
        await clientesAPI.create(clientData);
      } else {
        await clientesAPI.update(selectedCliente.id, clientData);
      }
      closeModal();
      fetchClientes();
    } catch (error) {
      console.error('Error saving cliente:', error);
      alert(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDeleteClick = (cliente) => {
    setConfirmDialog({ visible: true, id: cliente.id, nombre: cliente.nombre });
  };

  const handleDelete = async () => {
    try {
      if (!confirmDialog.id) return;
      await clientesAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchClientes();
    } catch (error) {
      console.error('Error deleting cliente:', error);
      alert('Error al eliminar el cliente.');
    }
  };

  const openHistory = (cliente) => {
    setClienteForHistory(cliente);
    setHistoryVisible(true);
  };

  const handleExportar = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await clientesAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clientes_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar clientes:', error);
      alert('Error al exportar datos.');
    }
  };

  const handleExportHistorialGlobal = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await clientesAPI.exportarHistorialGlobal(params);
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_global_clientes_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar historial global:', error);
    }
  };

  const filteredClientes = clientes.filter(c => {
    const term = searchTerm.toLowerCase();
    const nombre = (c.nombre || '').toLowerCase();
    const doc = (c.numero_documento || '').toLowerCase();
    
    const searchMatch = nombre.includes(term) || doc.includes(term);
    const contactoMatch = (c.contacto || '').toLowerCase().includes(searchContacto.toLowerCase()) || !searchContacto;
    const tipoMatch = filterTipo === 'ALL' ? true : c.tipo_cliente === filterTipo;
    const estadoMatch = filterEstado === 'ALL' ? true : (filterEstado === 'ACTIVO' ? c.activo : !c.activo);
    return searchMatch && contactoMatch && tipoMatch && estadoMatch;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredClientes.length / CLIENTES_PAGE_SIZE));
  const safePage = Math.min(clientesPage, totalPages);
  const paginatedClientes = filteredClientes.slice(
    (safePage - 1) * CLIENTES_PAGE_SIZE,
    safePage * CLIENTES_PAGE_SIZE
  );

  const handleSearchChange = (val) => { setSearchTerm(val); setClientesPage(1); };
  const handleFilterTipoChange = (val) => { setFilterTipo(val); setClientesPage(1); };
  const handleSearchContactoChange = (val) => { setSearchContacto(val); setClientesPage(1); };
  const handleFilterEstadoChange = (val) => { setFilterEstado(val); setClientesPage(1); };

  return (
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que deseas eliminar al cliente "${confirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        confirmText="Sí, eliminar"
        danger={true}
      />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Gestión de clientes y recurrencia de compras</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportDropdown onExport={handleExportHistorialGlobal} label="Exportar Historial Global" />
          <ExportDropdown onExport={handleExportar} label="Exportar Clientes" />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nombre o documento..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Nombre del contacto..." 
              value={searchContacto}
              onChange={(e) => handleSearchContactoChange(e.target.value)}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterTipo}
              onChange={(e) => handleFilterTipoChange(e.target.value)}
            >
              <option value="ALL">Todos los tipos</option>
              <option value="PERSONA_NATURAL">Persona Natural</option>
              <option value="EMPRESA">Empresa</option>
            </select>
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterEstado}
              onChange={(e) => handleFilterEstadoChange(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>
          <button
            className="btn btn-secondary"
            style={{ height: '38px', alignSelf: 'flex-end' }}
            onClick={() => {
              setSearchTerm('');
              setSearchContacto('');
              setFilterTipo('ALL');
              setFilterEstado('ALL');
              setClientesPage(1);
            }}
            title="Limpiar filtros"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Contacto</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Recurrencia</th>
                <th>Total Comprado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.nombre}</td>
                  <td>
                    <span className="badge badge-info">{cliente.tipo_cliente}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
                        {cliente.numero_documento}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '500' }}>
                        {cliente.tipo_documento}
                      </span>
                    </div>
                  </td>
                  <td>{cliente.contacto || '-'}</td>
                  <td>{cliente.email || '-'}</td>
                  <td>{cliente.telefono || '-'}</td>
                  <td>
                    <span className="badge badge-success">
                      {cliente.recurrencia || 0} compras
                    </span>
                  </td>
                  <td>S/. {Number(cliente.total_comprado || 0).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${cliente.activo ? 'badge-success' : 'badge-danger'}`}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', cliente)} title="Editar">
                      <EditOutlined />
                    </button>
                    <button className="btn btn-secondary" onClick={() => openHistory(cliente)} title="Historial / Kardex">
                      <HistoryOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(cliente)} title="Eliminar">
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClientes.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                    No se encontraron clientes que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setClientesPage}
          pageSize={CLIENTES_PAGE_SIZE}
          totalItems={filteredClientes.length}
          itemName="clientes"
        />
      </div>

      <ClienteFormModal 
        visible={modalVisible}
        mode={modalMode}
        initialData={selectedCliente}
        onClose={closeModal}
        onSave={handleSubmit}
      />

      <ClienteHistoryModal
        visible={historyVisible}
        cliente={clienteForHistory}
        onClose={() => setHistoryVisible(false)}
      />
    </div>
  );
}

export default Clientes;
