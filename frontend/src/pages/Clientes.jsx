import { useState, useEffect } from 'react';
import { clientesAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';

function Clientes() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('ALL');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_cliente: 'PERSONA',
    tipo_documento: 'DNI',
    numero_documento: '',
    contacto: '',
    email: '',
    telefono: '',
    direccion: '',
    activo: true,
  });

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
    if (cliente) {
      setSelectedCliente(cliente);
      setFormData({
        nombre: cliente.nombre || '',
        tipo_cliente: cliente.tipo_cliente || 'PERSONA',
        tipo_documento: cliente.tipo_documento || 'DNI',
        numero_documento: cliente.numero_documento || '',
        contacto: cliente.contacto || '',
        email: cliente.email || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        activo: cliente.activo !== undefined ? cliente.activo : true,
      });
    } else {
      setFormData({
        nombre: '',
        tipo_cliente: 'PERSONA',
        tipo_documento: 'DNI',
        numero_documento: '',
        contacto: '',
        email: '',
        telefono: '',
        direccion: '',
        activo: true,
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCliente(null);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.numero_documento.trim()) newErrors.numero_documento = 'El número de documento es obligatorio';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    try {
      if (modalMode === 'create') {
        await clientesAPI.create(formData);
      } else {
        await clientesAPI.update(selectedCliente.id, formData);
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
      await clientesAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchClientes();
    } catch (error) {
      console.error('Error deleting cliente:', error);
      alert('Error al eliminar el cliente.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
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

  const filteredClientes = clientes.filter(c => {
    const term = searchTerm.toLowerCase();
    const searchMatch = c.nombre.toLowerCase().includes(term) || c.numero_documento.toLowerCase().includes(term);
    const tipoMatch = filterTipo === 'ALL' ? true : c.tipo_cliente === filterTipo;
    const estadoMatch = filterEstado === 'ALL' ? true : (filterEstado === 'ACTIVO' ? c.activo : !c.activo);
    return searchMatch && tipoMatch && estadoMatch;
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
          <ExportDropdown onExport={handleExportar} />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nombre o documento..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterTipo}
              onChange={(e) => handleFilterTipoChange(e.target.value)}
            >
              <option value="ALL">Todos los tipos</option>
              <option value="PERSONA">Persona Natural</option>
              <option value="NEGOCIO">Negocio</option>
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
                <th>Teléfono</th>
                <th>Email</th>
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
                    {cliente.tipo_documento}: {cliente.numero_documento}
                  </td>
                  <td>{cliente.contacto || '-'}</td>
                  <td>{cliente.telefono || '-'}</td>
                  <td>{cliente.email || '-'}</td>
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
                    <button className="btn btn-secondary" onClick={() => openModal('edit', cliente)}>
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(cliente)}>
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

      {modalVisible && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" name="nombre" className={`form-input${errors.nombre ? ' input-error' : ''}`} value={formData.nombre} onChange={handleChange} onFocus={(e) => e.target.select()} />
                  {errors.nombre && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Tipo de Cliente *</label>
                    <select
                      name="tipo_cliente"
                      className="form-input"
                      value={formData.tipo_cliente}
                      onChange={handleChange}
                    >
                      <option value="PERSONA">Persona Natural</option>
                      <option value="NEGOCIO">Negocio</option>
                      <option value="EMPRESA">Empresa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Documento *</label>
                    <select
                      name="tipo_documento"
                      className="form-input"
                      value={formData.tipo_documento}
                      onChange={handleChange}
                    >
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                      <option value="NIT">NIT</option>
                      <option value="CE">Carnet de Extranjería</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Número de Documento *</label>
                  <input type="text" name="numero_documento" className={`form-input${errors.numero_documento ? ' input-error' : ''}`} value={formData.numero_documento} onChange={handleChange} onFocus={(e) => e.target.select()} />
                  {errors.numero_documento && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.numero_documento}</div>}
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Contacto</label>
                    <input
                      type="text"
                      name="contacto"
                      className="form-input"
                      value={formData.contacto}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      name="telefono"
                      className="form-input"
                      value={formData.telefono}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <textarea
                    name="direccion"
                    className="form-input"
                    value={formData.direccion}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      name="activo"
                      checked={formData.activo}
                      onChange={handleChange}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ userSelect: 'none', color: 'inherit', fontSize: '14px', fontWeight: '500' }}>
                      Cliente Activo
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;
