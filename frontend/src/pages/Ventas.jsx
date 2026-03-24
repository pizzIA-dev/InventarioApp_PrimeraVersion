import { useState, useEffect } from 'react';
import { ventasAPI, productosAPI, clientesAPI, serviciosAPI } from '../services/api';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, PlayCircleOutlined } from '@ant-design/icons';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import ProductFormModal from '../components/ProductFormModal';
import SearchableSelect from '../components/SearchableSelect';

function Ventas() {
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [ventasServicios, setVentasServicios] = useState([]);
  const [activeTab, setActiveTab] = useState('PRODUCTOS');
  
  // Pagination
  const VENTAS_PAGE_SIZE = 15;
  const [ventasPage, setVentasPage] = useState(1);
  const [ventasServiciosPage, setVentasServiciosPage] = useState(1);
  const [servicios, setServicios] = useState([]);
  const [ventaConfirmDialog, setVentaConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [ventaErrors, setVentaErrors] = useState({});
  const [ventaData, setVentaData] = useState({
    servicio: '',
    servicio_nombre: '',
    cliente: '',
    cliente_nombre: '',
    precio: 0,
    descuento: 0,
    fecha_programada: '',
    estado: 'PENDIENTE',
    notas: '',
  });
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [formData, setFormData] = useState({
    cliente: '',
    cliente_nombre: '',
    numero_comprobante: '',
    tipo_comprobante: '',
    estado: 'CONFIRMADA',
    descuento: 0,
    impuesto: 0,
    notas: '',
    detalle: [],
  });

  const [nestedModal, setNestedModal] = useState(null);
  const [nestedFormData, setNestedFormData] = useState({});
  const [nestedModalIndex, setNestedModalIndex] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);

  useEffect(() => {
    if (!pendingSelection) return;

    if (pendingSelection.type === 'cliente') {
      const found = clientes.find(c => String(c.id) === String(pendingSelection.id));
      if (found) {
        if (modalMode === 'venta' || modalMode === 'editVenta') {
          setVentaData(prev => ({ ...prev, cliente: String(found.id), cliente_nombre: found.nombre }));
        } else {
          setFormData(prev => ({ ...prev, cliente: String(found.id), cliente_nombre: found.nombre }));
        }
        setPendingSelection(null);
      }
    } else if (pendingSelection.type === 'servicio') {
      const found = servicios.find(s => String(s.id) === String(pendingSelection.id));
      if (found) {
        setVentaData(prev => ({
          ...prev, 
          servicio: String(found.id), 
          servicio_nombre: found.nombre,
          precio: found.precio_base
        }));
        setPendingSelection(null);
      }
    } else if (pendingSelection.type === 'producto') {
      const found = productos.find(p => String(p.id) === String(pendingSelection.id));
      if (found) {
        if (nestedModalIndex !== null) {
          setFormData(prev => {
            const newDetalle = [...prev.detalle];
            newDetalle[nestedModalIndex] = {
              ...newDetalle[nestedModalIndex],
              producto: String(found.id),
              precio_venta: Number(found.precio_venta || 0)
            };
            return { ...prev, detalle: newDetalle };
          });
          setNestedModalIndex(null);
        }
        setPendingSelection(null);
      }
    }
  }, [clientes, servicios, productos, pendingSelection, modalMode, nestedModalIndex]);

  const openNestedModal = (type) => {
    setNestedModal(type);
    if (type === 'cliente') {
      setNestedFormData({ nombre: '', tipo_documento: 'DNI', numero_documento: '', email: '', telefono: '', direccion: '' });
    } else if (type === 'servicio') {
      setNestedFormData({ nombre: '', precio_base: 0, duracion_minutos: 60 });
    }
  };

  const handleNestedSubmit = async (e) => {
    e.preventDefault();
    try {
      if (nestedModal === 'cliente') {
        const res = await clientesAPI.create(nestedFormData);
        setPendingSelection({ type: 'cliente', id: res.data.id, nombre: res.data.nombre });
        setClientes(prev => {
          if (prev.find(c => c.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        fetchClientes();
      } else if (nestedModal === 'servicio') {
        const res = await serviciosAPI.create(nestedFormData);
        setPendingSelection({ type: 'servicio', id: res.data.id, nombre: res.data.nombre });
        setServicios(prev => {
          if (prev.find(s => s.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        fetchServicios();
      }
      setNestedModal(null);
      setNestedModalIndex(null);
    } catch (err) {
      alert('Error creando registro: ' + (err.response?.data?.message || typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data) || err.message));
    }
  };

  useEffect(() => {
    fetchVentas();
    fetchProductos();
    fetchClientes();
    fetchVentasServicios();
    fetchServicios();
  }, []);

  const fetchVentas = async () => {
    try {
      const response = await ventasAPI.getAll();
      setVentas(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await productosAPI.getAll();
      setProductos(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching productos:', error);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await clientesAPI.getAll();
      setClientes(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const fetchVentasServicios = async () => {
    try {
      const response = await serviciosAPI.getVentas();
      setVentasServicios(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching ventas servicios:', error);
    }
  };

  const fetchServicios = async () => {
    try {
      const response = await serviciosAPI.getAll();
      setServicios(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching servicios:', error);
    }
  };

  const openModal = async (mode, venta = null) => {
    setModalMode(mode);
    setErrors({});
    if (venta) {
      setSelectedVenta(venta);
      // Load full venta detail from API to get the detalle
      try {
        const res = await ventasAPI.getById(venta.id);
        const full = res.data;
        setFormData({
          cliente: full.cliente || '',
          cliente_nombre: full.cliente_nombre || '',
          numero_comprobante: full.numero_comprobante || '',
          tipo_comprobante: full.tipo_comprobante || '',
          estado: full.estado || 'CONFIRMADA',
          descuento: Number(full.descuento || 0),
          impuesto: Number(full.impuesto || 0),
          notas: full.notas || '',
          detalle: (full.detalle || []).map(d => ({
            producto: d.producto,
            cantidad: Number(d.cantidad || 1),
            precio_venta: Number(d.precio_venta || 0),
            descuento: Number(d.descuento || 0),
          })),
        });
      } catch {
        setFormData({
          cliente: venta.cliente || '',
          cliente_nombre: venta.cliente_nombre || '',
          numero_comprobante: venta.numero_comprobante || '',
          tipo_comprobante: venta.tipo_comprobante || '',
          estado: venta.estado || 'CONFIRMADA',
          descuento: Number(venta.descuento || 0),
          impuesto: Number(venta.impuesto || 0),
          notas: venta.notas || '',
          detalle: [],
        });
      }
    } else {
      setSelectedVenta(null);
      setFormData({
        cliente: '',
        cliente_nombre: '',
        numero_comprobante: '',
        tipo_comprobante: '',
        estado: 'BORRADOR',
        descuento: 0,
        impuesto: 0,
        notas: '',
        detalle: [],
      });
    }
    setModalVisible(true);
  };

    const closeModal = () => {
    setModalVisible(false);
    setSelectedVenta(null);
    setErrors({});
    setVentaErrors({});
  };

  const addProducto = () => {
    setFormData(prev => ({
      ...prev,
      detalle: [...prev.detalle, { producto: '', cantidad: 1, precio_venta: 0, descuento: 0 }]
    }));
  };

  const updateDetalle = (index, field, value) => {
    const newDetalle = [...formData.detalle];
    newDetalle[index] = { ...newDetalle[index], [field]: value };
    if (field === 'producto') {
      const prod = productos.find(p => p.id === parseInt(value));
      if (prod) {
        newDetalle[index].precio_venta = Number(prod.precio_venta || 0);
      }
    }
    setFormData(prev => ({ ...prev, detalle: newDetalle }));
  };

  const removeDetalle = (index) => {
    setFormData(prev => ({
      ...prev,
      detalle: prev.detalle.filter((_, i) => i !== index)
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (formData.detalle.length === 0) {
      newErrors.detalle = 'Debes agregar al menos un producto a la venta.';
    } else {
      formData.detalle.forEach((item, i) => {
        if (!item.producto) newErrors[`detalle_${i}`] = 'Selecciona un producto';
        if (Number(item.cantidad) <= 0) newErrors[`cantidad_${i}`] = 'La cantidad debe ser mayor a 0';
        if (Number(item.precio_venta) <= 0) newErrors[`precio_${i}`] = 'El precio debe ser mayor a 0';
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Stock validation only for new ventas
    if (modalMode === 'create') {
      for (const item of formData.detalle) {
        const prod = productos.find(p => p.id === parseInt(item.producto));
        const cantidadSolicitada = Number(item.cantidad || 0);
        if (prod && cantidadSolicitada > Number(prod.stock_actual || 0)) {
          const newErrors = {};
          newErrors[`cantidad_${formData.detalle.indexOf(item)}`] =
            `Stock insuficiente. Disponible: ${prod.stock_actual}`;
          setErrors(newErrors);
          return;
        }
      }
    }

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'detalle') {
          submitData.append(key, JSON.stringify(formData.detalle.map(d => ({
            producto: parseInt(d.producto),
            cantidad: Number(d.cantidad || 0),
            precio_venta: Number(d.precio_venta || 0),
            descuento: Number(d.descuento || 0),
          }))));
        } else if (key === 'cliente') {
            if (formData[key]) {
                submitData.append(key, parseInt(formData[key]));
            }
        } else if (key === 'comprobante_archivo') {
          if (formData[key] instanceof File) {
            submitData.append(key, formData[key]);
          }
        } else if (key === 'impuesto') {
            submitData.append(key, Number(formData.impuesto || 0));
        } else if (key === 'descuento') {
            submitData.append(key, Number(formData.descuento || 0));
        } else {
            if (formData[key] !== null && formData[key] !== '') {
                submitData.append(key, formData[key]);
            }
        }
      });

      if (modalMode === 'create') {
        await ventasAPI.create(submitData);
      } else {
        await ventasAPI.update(selectedVenta.id, submitData);
      }
      closeModal();
      fetchVentas();
    } catch (error) {
      console.error('Error saving venta:', error);
      const errData = error.response?.data;
      const msg = typeof errData === 'string' ? errData
        : errData?.detail || errData?.message || JSON.stringify(errData) || 'Error al guardar';
      alert(msg);
    }
  };

  const handleConfirmar = async (id) => {
    try {
      await ventasAPI.confirmar(id);
      fetchVentas();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al confirmar');
    }
  };

  const handleCancelar = async (id) => {
    try {
      await ventasAPI.cancelar(id);
      fetchVentas();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cancelar');
    }
  };

  const handleDeleteClick = (venta) => {
    setConfirmDialog({ visible: true, id: venta.id, nombre: venta.numero_comprobante || `Venta #${venta.id}` });
  };

  const handleDeleteConfirm = async () => {
    try {
      await ventasAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchVentas();
    } catch (error) {
      console.error('Error deleting venta:', error);
      alert('Error al eliminar la venta.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['descuento', 'impuesto'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (parseFloat(value) || 0) : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleChangeVenta = (e) => {
    const { name, value } = e.target;
    setVentaData(prev => ({ ...prev, [name]: value }));
  };

  const calcularTotal = () => {
    const subtotal = formData.detalle.reduce((sum, d) => {
      const cantidad = Number(d.cantidad || 0);
      const precio = Number(d.precio_venta || 0);
      const desc = Number(d.descuento || 0);
      return sum + (cantidad * precio - desc);
    }, 0);
    return subtotal - Number(formData.descuento || 0) + Number(formData.impuesto || 0);
  };

  
  const openVentaModal = () => {
    setVentaErrors({});
    setVentaData({
      servicio: '',
      servicio_nombre: '',
      cliente: '',
      cliente_nombre: '',
      precio: 0,
      descuento: 0,
      fecha_programada: '',
      estado: 'PENDIENTE',
      notas: '',
    });
    setModalMode('venta');
    setModalVisible(true);
  };

  const openVentaEditModal = (venta) => {
    setSelectedVenta(venta);
    setVentaData({
      servicio: venta.servicio || '',
      servicio_nombre: venta.servicio_nombre || '',
      cliente: venta.cliente || '',
      cliente_nombre: venta.cliente_nombre || '',
      precio: venta.precio || 0,
      descuento: venta.descuento || 0,
      fecha_programada: venta.fecha_programada ? venta.fecha_programada.substring(0, 16) : '',
      estado: venta.estado || 'PENDIENTE',
      notas: venta.notas || '',
    });
    setModalMode('editVenta');
    setVentaErrors({});
    setModalVisible(true);
  };

  const handleCompletarServicio = async (id) => {
    try {
      await serviciosAPI.completarVenta(id);
      fetchVentasServicios();
    } catch (error) {
      console.error('Error completing servicio:', error);
    }
  };

  const handleIniciarServicio = async (id) => {
    try {
      await serviciosAPI.iniciarVenta(id);
      fetchVentasServicios();
    } catch (error) {
      console.error('Error initiating servicio:', error);
    }
  };

  const handleCancelarServicio = async (id) => {
    try {
      await serviciosAPI.cancelarVenta(id);
      fetchVentasServicios();
    } catch (error) {
      console.error('Error canceling servicio:', error);
    }
  };

  const handleDeleteVentaClick = (venta) => {
    setVentaConfirmDialog({ visible: true, id: venta.id, nombre: venta.servicio_nombre || 'Venta de Servicio' });
  };

  const handleDeleteVentaConfirm = async () => {
    try {
      await serviciosAPI.deleteVenta(ventaConfirmDialog.id);
      setVentaConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchVentasServicios();
    } catch (error) {
      console.error('Error deleting venta de servicio:', error);
      alert('Error al eliminar');
    }
  };

  const handleExportarServicios = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await serviciosAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ventas_servicios_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar ventas de servicios:', error);
      alert('Error al exportar datos.');
    }
  };

  const handleVentaSubmit = async (e) => {
    e.preventDefault();
    const newVentaErrors = {};
    if (!ventaData.servicio) newVentaErrors.servicio = 'Debes seleccionar un servicio';
    if (!ventaData.precio || Number(ventaData.precio) <= 0) newVentaErrors.precio = 'El precio debe ser mayor a 0';
    if (!ventaData.fecha_programada) newVentaErrors.fecha_programada = 'La fecha programada es obligatoria';
    
    if (Object.keys(newVentaErrors).length > 0) {
      setVentaErrors(newVentaErrors);
      return;
    }

    const ventaSubmitData = new FormData();
    Object.keys(ventaData).forEach(key => {
        if (key === 'precio') {
            ventaSubmitData.append(key, Number(ventaData.precio || 0));
        } else if (key === 'descuento') {
            ventaSubmitData.append(key, Number(ventaData.descuento || 0));
        } else if (key === 'comprobante_archivo') {
            if (ventaData[key] instanceof File) {
                ventaSubmitData.append(key, ventaData[key]);
            }
        } else {
            if (ventaData[key] !== null && ventaData[key] !== '') {
                ventaSubmitData.append(key, ventaData[key]);
            }
        }
    });

    try {
      if (modalMode === 'venta') {
        await serviciosAPI.createVenta(ventaSubmitData);
      } else {
        await serviciosAPI.updateVenta(selectedVenta.id, ventaSubmitData);
      }
      closeModal();
      fetchVentasServicios();
    } catch (error) {
      console.error('Error saving venta servicio:', error);
      alert('Error al guardar la venta de servicio');
    }
  };

  const handleExportar = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await ventasAPI.exportar(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ventas_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar ventas:', error);
      alert('Error al exportar datos.');
    }
  };

  const filteredVentas = ventas.filter(v => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (v.cliente_nombre || 'Cliente General').toLowerCase().includes(term) || 
                        (v.numero_comprobante || `#${v.id}`).toLowerCase().includes(term);
    if (filterEstado !== 'ALL' && v.estado !== filterEstado) return false;
    return searchMatch;
  });

  // Pagination logic for ventas de productos
  const ventasTotalPages = Math.max(1, Math.ceil(filteredVentas.length / VENTAS_PAGE_SIZE));
  const safeVentasPage = Math.min(ventasPage, ventasTotalPages);
  const paginatedVentas = filteredVentas.slice(
    (safeVentasPage - 1) * VENTAS_PAGE_SIZE,
    safeVentasPage * VENTAS_PAGE_SIZE
  );

  const filteredVentasServicios = ventasServicios.filter(v => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (v.cliente_nombre || 'Cliente').toLowerCase().includes(term) || 
                                      (v.servicio_nombre || v.servicio).toString().toLowerCase().includes(term);
    if (filterEstado !== 'ALL' && v.estado !== filterEstado) return false;
    return searchMatch;
  });

  // Pagination logic for ventas de servicios
  const ventasServiciosTotalPages = Math.max(1, Math.ceil(filteredVentasServicios.length / VENTAS_PAGE_SIZE));
  const safeVentasServiciosPage = Math.min(ventasServiciosPage, ventasServiciosTotalPages);
  const paginatedVentasServicios = filteredVentasServicios.slice(
    (safeVentasServiciosPage - 1) * VENTAS_PAGE_SIZE,
    safeVentasServiciosPage * VENTAS_PAGE_SIZE
  );

  const handleSearchChange = (val) => { setSearchTerm(val); setVentasPage(1); setVentasServiciosPage(1); };
  const handleFilterEstadoChange = (val) => { setFilterEstado(val); setVentasPage(1); setVentasServiciosPage(1); };

  return (
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title="Eliminar Venta"
        message={`¿Estás seguro de que deseas eliminar "${confirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        confirmText="Sí, eliminar"
        danger={true}
      />

            <ConfirmDialog
        visible={ventaConfirmDialog.visible}
        title="Eliminar Venta de Servicio"
        message={`¿Estás seguro de que deseas eliminar la venta del servicio "${ventaConfirmDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteVentaConfirm}
        onCancel={() => setVentaConfirmDialog({ visible: false, id: null, nombre: '' })}
        danger={true}
      />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Registro de ventas a clientes</p>
        </div>
                <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'PRODUCTOS' ? (
            <>
              <ExportDropdown onExport={handleExportar} label="Exportar Ventas" />
              <button className="btn btn-primary" onClick={() => openModal('create')}>
                <PlusOutlined /> Nueva Venta
              </button>
            </>
          ) : (
            <>
              <ExportDropdown onExport={handleExportarServicios} label="Exportar Servicios" />
              <button className="btn btn-primary" onClick={openVentaModal}>
                <PlusOutlined /> Nueva Venta de Servicio
              </button>
            </>
          )}
        </div>
      </div>

      
      <div className="card" style={{ marginBottom: '24px', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          <button 
            style={{ flex: 1, padding: '16px', fontSize: '16px', background: activeTab === 'PRODUCTOS' ? '#ffffff' : '#fafafa', border: 'none', borderBottom: activeTab === 'PRODUCTOS' ? '2px solid #1890ff' : '2px solid transparent', fontWeight: activeTab === 'PRODUCTOS' ? 'bold' : 'normal', color: activeTab === 'PRODUCTOS' ? '#1890ff' : '#666', cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => setActiveTab('PRODUCTOS')}
          >
            Venta de Productos
          </button>
          <button 
            style={{ flex: 1, padding: '16px', fontSize: '16px', background: activeTab === 'SERVICIOS' ? '#ffffff' : '#fafafa', border: 'none', borderBottom: activeTab === 'SERVICIOS' ? '2px solid #1890ff' : '2px solid transparent', fontWeight: activeTab === 'SERVICIOS' ? 'bold' : 'normal', color: activeTab === 'SERVICIOS' ? '#1890ff' : '#666', cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => setActiveTab('SERVICIOS')}
          >
            Venta de Servicios
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por cliente o comprobante..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="form-input" 
              value={filterEstado}
              onChange={(e) => handleFilterEstadoChange(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      
      {activeTab === 'PRODUCTOS' ? (
        <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nro</th>
                <th>Detalle</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVentas.map((venta) => (
                <tr key={venta.id}>
                                    <td>{venta.numero_comprobante || `#${venta.id}`}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={venta.detalle?.map(d => productos.find(p => p.id === d.producto)?.nombre || 'Producto').join(', ')}>
                    {venta.detalle?.map(d => productos.find(p => p.id === d.producto)?.nombre || 'Producto').join(', ') || '-'}
                  </td>
                  <td>{venta.cliente_nombre || 'Cliente General'}</td>
                  <td>{new Date(venta.creado_en).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${
                      venta.estado === 'CONFIRMADA' ? 'badge-success' :
                      venta.estado === 'CANCELADA' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {venta.estado}
                    </span>
                  </td>
                  <td>S/. {Number(venta.total || 0).toFixed(2)}</td>
                  <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {venta.estado === 'BORRADOR' && (
                      <button className="btn btn-success" onClick={() => handleConfirmar(venta.id)} title="Confirmar venta">
                        <CheckOutlined />
                      </button>
                    )}
                    {venta.estado === 'BORRADOR' && (
                      <button className="btn btn-warning" onClick={() => handleCancelar(venta.id)} title="Cancelar venta">
                        <CloseOutlined />
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => openModal('edit', venta)} title="Editar">
                      <EditOutlined />
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteClick(venta)} title="Eliminar">
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVentas.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay ventas registradas que coincidan con los filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={safeVentasPage}
          totalPages={ventasTotalPages}
          onPageChange={setVentasPage}
          pageSize={VENTAS_PAGE_SIZE}
          totalItems={filteredVentas.length}
          itemName="ventas de productos"
        />
      </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Cliente</th>
                  <th>Fecha Programada</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVentasServicios.map((venta) => (
                  <tr key={venta.id}>
                    <td>{venta.servicio_nombre || venta.servicio}</td>
                    <td>{venta.cliente_nombre || 'Cliente General'}</td>
                    <td>{venta.fecha_programada ? new Date(venta.fecha_programada).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`badge ${
                        venta.estado === 'TERMINADO' ? 'badge-success' :
                        venta.estado === 'CANCELADO' ? 'badge-danger' :
                        venta.estado === 'EN_PROGRESO' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {venta.estado}
                      </span>
                    </td>
                    <td>S/. {Number(venta.total || 0).toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-secondary" onClick={() => openVentaEditModal(venta)} title="Editar"><EditOutlined /></button>
                        {venta.estado === 'PENDIENTE' && (
                          <button className="btn btn-primary" onClick={() => handleIniciarServicio(venta.id)} title="Iniciar"><PlayCircleOutlined /></button>
                        )}
                        {venta.estado === 'EN_PROGRESO' && (
                          <button className="btn btn-success" onClick={() => handleCompletarServicio(venta.id)} title="Terminar"><CheckOutlined /></button>
                        )}
                        {(venta.estado === 'PENDIENTE' || venta.estado === 'EN_PROGRESO') && (
                          <button className="btn btn-warning" onClick={() => handleCancelarServicio(venta.id)} title="Cancelar" style={{ color: 'white' }}><CloseOutlined /></button>
                        )}
                        <button className="btn btn-danger" onClick={() => handleDeleteVentaClick(venta)} title="Eliminar"><DeleteOutlined /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVentasServicios.length === 0 && (
                   <tr><td colSpan="6" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay servicios registrados que coincidan con los filtros</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination 
            currentPage={safeVentasServiciosPage}
            totalPages={ventasServiciosTotalPages}
            onPageChange={setVentasServiciosPage}
            pageSize={VENTAS_PAGE_SIZE}
            totalItems={filteredVentasServicios.length}
            itemName="ventas de servicios"
          />
        </div>
      )}


      {modalVisible && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nueva Venta' : modalMode === 'edit' ? 'Editar Venta' : modalMode === 'venta' ? 'Nueva Venta de Servicio' : 'Editar Venta de Servicio'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={modalMode === 'venta' || modalMode === 'editVenta' ? handleVentaSubmit : handleSubmit}>
              
              <div className="modal-body">
                {(modalMode === 'venta' || modalMode === 'editVenta') ? (
                  <>
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Servicio</label>
                        <SearchableSelect
                          options={servicios.map(s => ({
                            id: String(s.id),
                            nombre: s.nombre,
                            subtitle: `S/. ${Number(s.precio_base || 0).toFixed(2)}`
                          }))}
                          value={ventaData.servicio}
                          onChange={(val) => {
                            const serv = servicios.find(s => String(s.id) === String(val));
                            setVentaData(prev => ({
                              ...prev,
                              servicio: val,
                              servicio_nombre: serv ? serv.nombre : '',
                              precio: serv ? Number(serv.precio_base || 0) : 0
                            }));
                            if (ventaErrors.servicio) setVentaErrors(prev => ({ ...prev, servicio: null }));
                          }}
                          placeholder="Buscar servicio..."
                          onActionClick={() => openNestedModal('servicio')}
                          actionLabel="➕ Crear Nuevo Servicio"
                          error={ventaErrors.servicio}
                        />
                        {ventaErrors.servicio && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{ventaErrors.servicio}</div>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cliente</label>
                        <SearchableSelect
                          options={clientes.map(c => ({
                            id: String(c.id),
                            nombre: c.nombre,
                            subtitle: c.numero_documento
                          }))}
                          value={ventaData.cliente}
                          onChange={(val) => {
                            const cli = clientes.find(c => String(c.id) === String(val));
                            setVentaData(prev => ({
                              ...prev,
                              cliente: val,
                              cliente_nombre: cli ? cli.nombre : ''
                            }));
                          }}
                          placeholder="Buscar cliente..."
                          onActionClick={() => openNestedModal('cliente')}
                          actionLabel="➕ Crear Nuevo Cliente"
                        />
                      </div>
                    </div>
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Precio (S/.)</label>
                        <input
                          type="number"
                          name="precio"
                          className={`form-input${ventaErrors.precio ? ' input-error' : ''}`}
                          value={ventaData.precio}
                          onChange={handleChangeVenta}
                          onFocus={(e) => e.target.select()}
                          min="0"
                          step="0.01"
                        />
                        {ventaErrors.precio && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{ventaErrors.precio}</div>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Descuento (S/.)</label>
                        <input
                          type="number"
                          name="descuento"
                          className="form-input"
                          value={ventaData.descuento}
                          onChange={handleChangeVenta}
                          onFocus={(e) => e.target.select()}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha Programada</label>
                      <input
                        type="datetime-local"
                        name="fecha_programada"
                        className={`form-input${ventaErrors.fecha_programada ? ' input-error' : ''}`}
                        value={ventaData.fecha_programada}
                        onChange={(e) => {
                          handleChangeVenta(e);
                          if (ventaErrors.fecha_programada) setVentaErrors(prev => ({ ...prev, fecha_programada: null }));
                        }}
                      />
                      {ventaErrors.fecha_programada && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{ventaErrors.fecha_programada}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado</label>
                        <select
                          name="estado"
                          className="form-input"
                          value={ventaData.estado}
                          onChange={handleChangeVenta}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_PROGRESO">En Progreso</option>
                          <option value="TERMINADO">Terminado</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Comprobante (Archivo)</label>
                        <input type="file" className="form-input" accept="image/*,.pdf" onChange={(e) => {
                            if (e.target.files.length > 0) {
                                setVentaData(prev => ({ ...prev, comprobante_archivo: e.target.files[0] }));
                            }
                        }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Cliente</label>
                    <SearchableSelect
                      options={clientes.map(c => ({
                        id: String(c.id),
                        nombre: c.nombre,
                        subtitle: c.numero_documento
                      }))}
                      value={formData.cliente}
                      onChange={(val) => {
                        const cliente = clientes.find(c => String(c.id) === String(val));
                        setFormData(prev => ({
                          ...prev,
                          cliente: val,
                          cliente_nombre: cliente ? cliente.nombre : ''
                        }));
                      }}
                      placeholder="Buscar cliente..."
                      onActionClick={() => openNestedModal('cliente')}
                      actionLabel="➕ Crear Nuevo Cliente"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo Comprobante</label>
                    <select name="tipo_comprobante" className="form-input" value={formData.tipo_comprobante} onChange={handleChange}>
                      <option value="">Ninguno</option>
                      <option value="BOLETA">Boleta</option>
                      <option value="FACTURA">Factura</option>
                      <option value="TICKET">Ticket</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Nro Comprobante</label>
                    <input type="text" name="numero_comprobante" className="form-input" value={formData.numero_comprobante} onChange={handleChange} onFocus={(e) => e.target.select()} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select name="estado" className="form-input" value={formData.estado} onChange={handleChange}>
                      <option value="BORRADOR">Borrador</option>
                      <option value="CONFIRMADA">Confirmada</option>
                      <option value="CANCELADA">Cancelada</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Comprobante (Archivo)</label>
                    <input type="file" className="form-input" accept="image/*,.pdf" onChange={(e) => {
                      if (e.target.files.length > 0) {
                        setFormData(prev => ({ ...prev, comprobante_archivo: e.target.files[0] }));
                      }
                    }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Productos {errors.detalle && <span style={{ color: '#ff4d4f', fontWeight: 400, marginLeft: 8 }}>{errors.detalle}</span>}
                  </label>

                  {/* Header labels for rows */}
                  {formData.detalle.length > 0 && (
                     <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', padding: '0 2px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                      <div style={{ flex: 2, minWidth: 0 }}>Producto</div>
                      <div style={{ width: '90px' }}>Cantidad</div>
                      <div style={{ width: '110px' }}>P. Unitario</div>
                      <div style={{ width: '100px' }}>Descuento</div>
                      <div style={{ width: '90px' }}>Subtotal</div>
                      <div style={{ width: '36px' }}></div>
                    </div>
                  )}

                  {formData.detalle.map((item, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 2, minWidth: 0 }}>
                          <SearchableSelect
                            options={productos.map(p => ({
                              id: String(p.id),
                              nombre: p.nombre,
                              subtitle: `Stock: ${p.stock_actual}`,
                              disabled: !p.activo
                            }))}
                            value={item.producto}
                            onChange={(val) => updateDetalle(index, 'producto', val)}
                            placeholder="Buscar producto..."
                            onActionClick={() => {
                              setNestedModalIndex(index);
                              setProductModalVisible(true);
                            }}
                            actionLabel="➕ Crear Nuevo Producto"
                            error={errors[`detalle_${index}`]}
                          />
                        </div>
                        <input
                          type="number"
                          className={`form-input${errors[`cantidad_${index}`] ? ' input-error' : ''}`}
                          placeholder="Cant."
                          value={item.cantidad}
                          onChange={(e) => updateDetalle(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '90px' }}
                          min="0.01"
                          step="0.01"
                        />
                        <input
                          type="number"
                          className={`form-input${errors[`precio_${index}`] ? ' input-error' : ''}`}
                          placeholder="Precio"
                          value={item.precio_venta}
                          onChange={(e) => updateDetalle(index, 'precio_venta', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '110px' }}
                          min="0"
                          step="0.01"
                        />
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Desc."
                          value={item.descuento}
                          onChange={(e) => updateDetalle(index, 'descuento', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '100px' }}
                          min="0"
                          step="0.01"
                        />
                        <input
                          type="text"
                          className="form-input"
                          readOnly
                          value={`S/. ${((Number(item.cantidad || 0) * Number(item.precio_venta || 0)) - Number(item.descuento || 0)).toFixed(2)}`}
                          style={{ 
                            width: '90px', 
                            fontSize: '12px', 
                            background: 'var(--bg-input)', 
                            color: 'var(--text-primary)', 
                            fontWeight: 'bold',
                            border: '1px solid var(--border-input)'
                          }} 
                        />
                        <button type="button" className="btn btn-danger" onClick={() => removeDetalle(index)} style={{ flexShrink: 0 }}>
                          <DeleteOutlined />
                        </button>
                      </div>
                      {(errors[`detalle_${index}`] || errors[`cantidad_${index}`] || errors[`precio_${index}`]) && (
                        <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                          {errors[`detalle_${index}`] || errors[`cantidad_${index}`] || errors[`precio_${index}`]}
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary" onClick={addProducto} style={{ marginTop: '4px' }}>
                    <PlusOutlined /> Agregar Producto
                  </button>
                </div>

                <div className="grid grid-3">
                  <div className="form-group">
                    <label className="form-label">Descuento Global (S/.)</label>
                    <input type="number" name="descuento" className="form-input" value={formData.descuento} onChange={handleChange} onFocus={(e) => e.target.select()} min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Impuesto (S/.)</label>
                    <input type="number" name="impuesto" className="form-input" value={formData.impuesto} onChange={handleChange} onFocus={(e) => e.target.select()} min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Estimado</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={`S/. ${calcularTotal().toFixed(2)}`} 
                      readOnly 
                      style={{ 
                        fontWeight: 'bold', 
                        background: 'var(--bg-input)',
                        color: 'var(--accent, #1677ff)',
                        border: '2px solid var(--accent, #1677ff)'
                      }} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea name="notas" className="form-input" value={formData.notas} onChange={handleChange} rows={2} />
                </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' || modalMode === 'venta' ? 'Crear Venta' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Nested Create Forms */}
      {nestedModal && (
        <div className="modal-overlay" onClick={() => setNestedModal(null)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Crear Nuevo {nestedModal === 'cliente' ? 'Cliente' : nestedModal === 'producto' ? 'Producto' : 'Servicio'}
              </h3>
              <button className="modal-close" onClick={() => setNestedModal(null)}>×</button>
            </div>
            <form onSubmit={handleNestedSubmit} style={{ padding: '20px' }}>
              {nestedModal === 'cliente' && (
                <>
                  <div className="form-group"><label className="form-label">Nombre *</label><input required className="form-input" value={nestedFormData.nombre} onChange={(e) => setNestedFormData(p => ({...p, nombre: e.target.value}))} /></div>
                  <div className="grid grid-2">
                    <div className="form-group">
                      <label className="form-label">Tipo Doc. *</label>
                      <select required className="form-input" value={nestedFormData.tipo_documento} onChange={(e) => setNestedFormData(p => ({...p, tipo_documento: e.target.value}))}>
                        <option value="DNI">DNI</option>
                        <option value="RUC">RUC</option>
                        <option value="CE">CE</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nro Doc. *</label>
                      <input required className="form-input" value={nestedFormData.numero_documento} onChange={(e) => setNestedFormData(p => ({...p, numero_documento: e.target.value}))} />
                    </div>
                  </div>
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={nestedFormData.email} onChange={(e) => setNestedFormData(p => ({...p, email: e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={nestedFormData.telefono} onChange={(e) => setNestedFormData(p => ({...p, telefono: e.target.value}))} /></div>
                </>
              )}
              {nestedModal === 'servicio' && (
                <>
                  <div className="form-group"><label className="form-label">Nombre del Servicio *</label><input required className="form-input" value={nestedFormData.nombre} onChange={(e) => setNestedFormData(p => ({...p, nombre: e.target.value}))} /></div>
                  <div className="grid grid-2">
                     <div className="form-group"><label className="form-label">Precio Base</label><input type="number" step="0.01" required className="form-input" value={nestedFormData.precio_base} onChange={(e) => setNestedFormData(p => ({...p, precio_base: Number(e.target.value)}))} /></div>
                     <div className="form-group"><label className="form-label">Duración (min)</label><input type="number" required className="form-input" value={nestedFormData.duracion_minutos} onChange={(e) => setNestedFormData(p => ({...p, duracion_minutos: Number(e.target.value)}))} /></div>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setNestedModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar {nestedModal === 'cliente' ? 'Cliente' : 'Servicio'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProductFormModal
        visible={productModalVisible}
        mode="create"
        onClose={() => setProductModalVisible(false)}
        onSave={(newProduct) => {
          setPendingSelection({ type: 'producto', id: newProduct.id });
          setProductos(prev => {
            if (prev.find(p => p.id === newProduct.id)) return prev;
            return [...prev, newProduct];
          });
          fetchProductos();
          setProductModalVisible(false);
        }}
      />
    </div>
  );
}

export default Ventas;
