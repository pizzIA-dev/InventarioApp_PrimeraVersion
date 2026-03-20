import { useState, useEffect } from 'react';
import { productosAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';

function Productos() {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStock, setFilterStock] = useState('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    stock_actual: 0,
    stock_minimo: 0,
    unidad_medida: 'UN',
    precio_compra: 0,
    precio_venta: 0,
    activo: true,
  });

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const response = await productosAPI.getCategorias();
      setCategorias(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await productosAPI.getAll();
      setProductos(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode, producto = null) => {
    setModalMode(mode);
    if (producto) {
      setSelectedProducto(producto);
      setFormData({
        codigo: producto.codigo || '',
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        categoria: producto.categoria || '',
        stock_actual: producto.stock_actual || 0,
        stock_minimo: producto.stock_minimo || 0,
        unidad_medida: producto.unidad_medida || 'UN',
        precio_compra: producto.precio_compra || 0,
        precio_venta: producto.precio_venta || 0,
        activo: producto.activo !== undefined ? producto.activo : true,
      });
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: '',
        stock_actual: 0,
        stock_minimo: 0,
        unidad_medida: 'UN',
        precio_compra: 0,
        precio_venta: 0,
        activo: true,
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedProducto(null);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Inline validation
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.codigo.trim()) newErrors.codigo = 'El código es obligatorio';
    if (Number(formData.precio_venta) <= 0) newErrors.precio_venta = 'El precio de venta debe ser mayor a 0';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    try {
      const submitData = {
        ...formData,
        categoria: formData.categoria || null,
        precio_compra: Number(formData.precio_compra),
        precio_venta: Number(formData.precio_venta),
        stock_actual: Number(formData.stock_actual),
        stock_minimo: Number(formData.stock_minimo)
      };

      if (modalMode === 'create') {
        await productosAPI.create(submitData);
      } else {
        await productosAPI.update(selectedProducto.id, submitData);
      }
      closeModal();
      fetchProductos();
    } catch (error) {
      console.error('Error saving producto:', error);
      alert(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    try {
      await productosAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchProductos();
    } catch (error) {
      console.error('Error deleting producto:', error);
      alert('Error al eliminar el producto.');
    }
  };

  const handleDeleteClick = (producto) => {
    setConfirmDialog({ visible: true, id: producto.id, nombre: producto.nombre });
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
      const response = await productosAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `productos_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar productos:', error);
      alert('Error al exportar datos.');
    }
  };

  const filteredProductos = productos.filter(p => {
    const searchMatch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const stockMatch = filterStock === 'ALL' ? true : 
                       filterStock === 'LOW' ? p.stock_bajo : 
                       filterStock === 'OUT' ? p.stock_actual <= 0 : 
                       filterStock === 'IN_STOCK' ? p.stock_actual > 0 : true;
    return searchMatch && stockMatch;
  });

  return (
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${confirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        confirmText="Sí, eliminar"
        danger={true}
      />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Gestión de productos en stock</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportDropdown onExport={handleExportar} />
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> Nuevo Producto
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por código o nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="IN_STOCK">Con Stock</option>
              <option value="LOW">Stock Bajo</option>
              <option value="OUT">Agotados</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>P. Compra</th>
                <th>P. Venta</th>
                <th>Margen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.map((producto) => (
                <tr key={producto.id}>
                  <td>{producto.codigo}</td>
                  <td>{producto.nombre}</td>
                  <td>{producto.categoria_nombre || '-'}</td>
                  <td>
                    <span style={{ color: producto.stock_bajo ? '#ff4d4f' : 'inherit' }}>
                      {producto.stock_actual} {producto.unidad_medida}
                    </span>
                  </td>
                  <td>S/. {Number(producto.precio_compra || 0).toFixed(2)}</td>
                  <td>S/. {Number(producto.precio_venta || 0).toFixed(2)}</td>
                  <td>{Number(producto.margen_ganancia || 0).toFixed(2)}%</td>
                  <td>
                    <span className={`badge ${producto.activo ? 'badge-success' : 'badge-danger'}`}>
                      {producto.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => openModal('edit', producto)}>
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(producto)}>
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProductos.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                    No se encontraron productos que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalVisible && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Código *</label>
                    <input
                      type="text"
                      name="codigo"
                      className={`form-input${errors.codigo ? ' input-error' : ''}`}
                      value={formData.codigo}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                    />
                    {errors.codigo && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.codigo}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input
                      type="text"
                      name="nombre"
                      className={`form-input${errors.nombre ? ' input-error' : ''}`}
                      value={formData.nombre}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                    />
                    {errors.nombre && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    name="descripcion"
                    className="form-input"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="grid grid-3">
                  <div className="form-group">
                    <label className="form-label">Unidad de Medida</label>
                    <select
                      name="unidad_medida"
                      className="form-input"
                      value={formData.unidad_medida}
                      onChange={handleChange}
                    >
                      <option value="UN">Unidad</option>
                      <option value="KG">Kilogramo</option>
                      <option value="LB">Libra</option>
                      <option value="MT">Metro</option>
                      <option value="LT">Litro</option>
                      <option value="GL">Galón</option>
                      <option value="CJ">Caja</option>
                      <option value="PK">Pack</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock *</label>
                    <input
                      type="number"
                      name="stock_actual"
                      className="form-input"
                      value={formData.stock_actual}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Mínimo</label>
                    <input
                      type="number"
                      name="stock_minimo"
                      className="form-input"
                      value={formData.stock_minimo}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Precio de Compra (S/.) *</label>
                    <input
                      type="number"
                      name="precio_compra"
                      className="form-input"
                      value={formData.precio_compra}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio de Venta (S/.) *</label>
                    <input
                      type="number"
                      name="precio_venta"
                      className={`form-input${errors.precio_venta ? ' input-error' : ''}`}
                      value={formData.precio_venta}
                      onChange={handleChange}
                      onFocus={(e) => e.target.select()}
                      min="0"
                      step="0.01"
                    />
                    {errors.precio_venta && <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.precio_venta}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={formData.activo}
                      onChange={handleChange}
                      style={{ marginRight: '8px' }}
                    />
                    Producto Activo
                  </label>
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

export default Productos;
