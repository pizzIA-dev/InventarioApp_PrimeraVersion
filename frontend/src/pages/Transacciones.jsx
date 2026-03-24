import { useState, useEffect } from 'react';
import { transaccionesAPI } from '../services/api';
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';

function Transacciones() {
  const [loading, setLoading] = useState(true);
  const [transacciones, setTransacciones] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedTransaccion, setSelectedTransaccion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('ALL');
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, descripcion: '' });
  const [categorias, setCategorias] = useState([]);
  const [formData, setFormData] = useState({
    categoria: '',
    tipo: 'INGRESO',
    descripcion: '',
    monto: 0,
    metodo_pago: 'EFECTIVO',
    referencia: '',
    fecha: new Date().toISOString().slice(0, 16),
    notas: '',
  });

  // Pagination
  const TRANSACCIONES_PAGE_SIZE = 15;
  const [transaccionesPage, setTransaccionesPage] = useState(1);

  useEffect(() => {
    fetchTransacciones();
    fetchResumen();
    fetchCategorias();
  }, []);

  const fetchTransacciones = async () => {
    try {
      const response = await transaccionesAPI.getAll();
      setTransacciones(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching transacciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResumen = async () => {
    try {
      const response = await transaccionesAPI.getResumen();
      setResumen(response.data);
    } catch (error) {
      console.error('Error fetching resumen:', error);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await transaccionesAPI.getCategorias();
      setCategorias(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const openModal = (mode, transaccion = null) => {
    setModalMode(mode);
    if (transaccion) {
      setSelectedTransaccion(transaccion);
      setFormData({
        categoria: transaccion.categoria || '',
        tipo: transaccion.tipo || 'INGRESO',
        descripcion: transaccion.descripcion || '',
        monto: transaccion.monto || 0,
        metodo_pago: transaccion.metodo_pago || 'EFECTIVO',
        referencia: transaccion.referencia || '',
        fecha: new Date(transaccion.fecha).toISOString().slice(0, 16),
        notas: transaccion.notas || '',
      });
    } else {
      setFormData({
        categoria: '',
        tipo: 'INGRESO',
        descripcion: '',
        monto: 0,
        metodo_pago: 'EFECTIVO',
        referencia: '',
        fecha: new Date().toISOString().slice(0, 16),
        notas: '',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTransaccion(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones explícitas
    if (Number(formData.monto || 0) <= 0) {
      alert('El monto de la transacción debe ser mayor a S/. 0.00');
      return;
    }

    try {
      const submitData = {
        ...formData,
        categoria: formData.categoria || null,
        monto: Number(formData.monto || 0)
      };

      if (modalMode === 'create') {
        await transaccionesAPI.create(submitData);
      } else {
        await transaccionesAPI.update(selectedTransaccion.id, submitData);
      }
      closeModal();
      fetchTransacciones();
      fetchResumen();
    } catch (error) {
      console.error('Error saving transaccion:', error);
      const errData = error.response?.data;
      const msg = typeof errData === 'string' ? errData
        : errData?.detail || errData?.message
        || JSON.stringify(errData) || 'Error al guardar';
      alert(msg);
    }
  };

  const handleDeleteClick = (transaccion) => {
    setConfirmDialog({ visible: true, id: transaccion.id, descripcion: transaccion.descripcion });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDialog.id) return;
    try {
      await transaccionesAPI.delete(confirmDialog.id);
      fetchTransacciones();
      fetchResumen();
      setConfirmDialog({ visible: false, id: null, descripcion: '' });
    } catch (error) {
      console.error('Error deleting transaccion:', error);
      alert('Error al eliminar');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExportar = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await transaccionesAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transacciones_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar transacciones:', error);
      alert('Error al exportar datos.');
    }
  };

  const filteredTransacciones = transacciones.filter(t => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (t.descripcion || '').toLowerCase().includes(term);
    const tipoMatch = filterTipo === 'ALL' ? true : t.tipo === filterTipo;
    return searchMatch && tipoMatch;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredTransacciones.length / TRANSACCIONES_PAGE_SIZE));
  const safePage = Math.min(transaccionesPage, totalPages);
  const paginatedTransacciones = filteredTransacciones.slice(
    (safePage - 1) * TRANSACCIONES_PAGE_SIZE,
    safePage * TRANSACCIONES_PAGE_SIZE
  );

  const handleSearchChange = (val) => { setSearchTerm(val); setTransaccionesPage(1); };
  const handleFilterTipoChange = (val) => { setFilterTipo(val); setTransaccionesPage(1); };

  return (
    <div>
      <ConfirmDialog 
        visible={confirmDialog.visible}
        onCancel={() => setConfirmDialog({ visible: false, id: null, descripcion: '' })}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Transacción"
        message={`¿Estás seguro de que deseas eliminar la transacción "${confirmDialog.descripcion}"? Esta acción no se puede deshacer y afectará el balance.`}
        danger={true}
      />
      
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Transacciones</h1>
          <p className="page-subtitle">Registro de ingresos y egresos independientes</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportDropdown onExport={handleExportar} />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> Nueva Transacción
          </button>
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-3" style={{ marginBottom: '24px' }}>
          <div className="stat-card green">
            <div className="stat-label">
              <ArrowUpOutlined /> Ingresos Totales
            </div>
            <div className="stat-value">S/. {Number(resumen.total_ingresos || 0).toFixed(2)}</div>
            <div className="stat-label">Este mes: S/. {Number(resumen.ingresos_mes || 0).toFixed(2)}</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">
              <ArrowDownOutlined /> Egresos Totales
            </div>
            <div className="stat-value">S/. {Number(resumen.total_egresos || 0).toFixed(2)}</div>
            <div className="stat-label">Este mes: S/. {Number(resumen.egresos_mes || 0).toFixed(2)}</div>
          </div>
          <div className={`stat-card ${resumen.balance >= 0 ? '' : 'blue'}`}>
            <div className="stat-label">Balance</div>
            <div className="stat-value">S/. {Number(resumen.balance || 0).toFixed(2)}</div>
            <div className="stat-label">Este mes: S/. {Number(resumen.balance_mes || 0).toFixed(2)}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por descripción..." 
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
              <option value="INGRESO">Ingresos</option>
              <option value="EGRESO">Egresos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Método Pago</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransacciones.map((transaccion) => (
                <tr key={transaccion.id}>
                  <td>{new Date(transaccion.fecha).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${transaccion.tipo === 'INGRESO' ? 'badge-success' : 'badge-danger'}`}>
                      {transaccion.tipo === 'INGRESO' ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {transaccion.tipo}
                    </span>
                  </td>
                  <td>{transaccion.categoria_nombre || '-'}</td>
                  <td>{transaccion.descripcion}</td>
                  <td>{transaccion.metodo_pago}</td>
                  <td style={{ fontWeight: 'bold', color: transaccion.tipo === 'INGRESO' ? '#52c41a' : '#ff4d4f' }}>
                    {transaccion.tipo === 'INGRESO' ? '+' : '-'}S/. {Number(transaccion.monto || 0).toFixed(2)}
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', transaccion)}>
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(transaccion)}>
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransacciones.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay transacciones registradas que coincidan con los filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setTransaccionesPage}
          pageSize={TRANSACCIONES_PAGE_SIZE}
          totalItems={filteredTransacciones.length}
          itemName="transacciones"
        />
      </div>

      {modalVisible && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nueva Transacción' : 'Editar Transacción'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Tipo *</label>
                    <select
                      name="tipo"
                      className="form-input"
                      value={formData.tipo}
                      onChange={handleChange}
                    >
                      <option value="INGRESO">Ingreso</option>
                      <option value="EGRESO">Egreso</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select
                      name="categoria"
                      className="form-input"
                      value={formData.categoria}
                      onChange={handleChange}
                    >
                      <option value="">Sin categoría</option>
                      {categorias
                        .filter(c => c.tipo === formData.tipo)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción *</label>
                  <input
                    type="text"
                    name="descripcion"
                    className="form-input"
                    value={formData.descripcion}
                    onChange={handleChange}
                    onFocus={(e) => e.target.select()}
                    required
                  />
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Monto *</label>
                    <input
                      type="number"
                      name="monto"
                      className="form-input"
                      value={formData.monto}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método de Pago</label>
                    <select
                      name="metodo_pago"
                      className="form-input"
                      value={formData.metodo_pago}
                      onChange={handleChange}
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="YAPE">Yape/Plin</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Fecha *</label>
                    <input
                      type="datetime-local"
                      name="fecha"
                      className="form-input"
                      value={formData.fecha}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Referencia</label>
                    <input
                      type="text"
                      name="referencia"
                      className="form-input"
                      value={formData.referencia}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      placeholder="Nro de operación"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea
                    name="notas"
                    className="form-input"
                    value={formData.notas}
                    onChange={handleChange}
                    rows={2}
                  />
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

export default Transacciones;
