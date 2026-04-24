import { useState, useEffect, useContext } from 'react';
import { ventasAPI, productosAPI, clientesAPI, serviciosAPI } from '../services/api';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, 
  PlayCircleOutlined, OrderedListOutlined, EyeOutlined, DownloadOutlined,
  FileTextOutlined, HistoryOutlined, CalendarOutlined, SearchOutlined, EllipsisOutlined, CheckCircleOutlined, CloseCircleOutlined, PrinterOutlined
} from '@ant-design/icons';
import { message } from 'antd';

import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import ProductFormModal from '../components/ProductFormModal';
import SearchableSelect from '../components/SearchableSelect';
import ClienteFormModal from '../components/ClienteFormModal';
import VentaHistoryModal from '../components/VentaHistoryModal';
import VentaGlobalKardexModal from '../components/VentaGlobalKardexModal';
import LoadingScreen from '../components/LoadingScreen';
import { AuthContext } from '../context/AuthContext';


function Ventas() {
  const { isVendedor } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteModalVisible, setClienteModalVisible] = useState(false);

  const [ventasServicios, setVentasServicios] = useState([]);
  const [activeTab, setActiveTab] = useState('PRODUCTOS');
  
  // Pagination
  const VENTAS_PAGE_SIZE = 15;
  const [ventasPage, setVentasPage] = useState(1);
  const [ventasServiciosPage, setVentasServiciosPage] = useState(1);
  const [filterServicio, setFilterServicio] = useState('ALL');
  const [servicios, setServicios] = useState([]);
  const [ventaConfirmDialog, setVentaConfirmDialog] = useState({ visible: false, id: null, nombre: '', estado: '' });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedVentaForDetail, setSelectedVentaForDetail] = useState(null);
  const [isFormalizing, setIsFormalizing] = useState(false);
  const [formalizacionData, setFormalizacionData] = useState({ tipo: 'BOLETA', numero: '' });
  const [printMode, setPrintMode] = useState(null);

  const [ventaErrors, setVentaErrors] = useState({});

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyType, setHistoryType] = useState(''); // 'producto' or 'servicio'
  const [showGlobalKardex, setShowGlobalKardex] = useState(false);

  // Alias for Cliente General (separate from formData/ventaData so it's not sent as-is)
  const [clienteAlias, setClienteAlias] = useState('');
  const [ventaClienteAlias, setVentaClienteAlias] = useState('');
  // IGV calculation flags: false = IGV ya incluido en precios, true = calcular IGV automáticamente
  const [calcularIgv, setCalcularIgv] = useState(false);
  const [calcularIgvServicio, setCalcularIgvServicio] = useState(false);

  const openDetailModal = async (venta) => {
    // Determine if it's a service sale or product sale
    const isService = !!venta.servicio;
    
    // Set basic data first to show modal immediately with loading state (or at least partial data)
    setSelectedVentaForDetail({ ...venta, isService });
    setDetailModalVisible(true);
    
    try {
      console.log('Opening detail modal for:', venta.id, 'isService:', isService);
      // Fetch full detail from correct API
      const res = isService 
        ? await serviciosAPI.getVentaDetail(venta.id)
        : await ventasAPI.getById(venta.id);
        
      if (res.data) {
        setSelectedVentaForDetail({ ...res.data, isService });
      }
    } catch (err) {
      console.error('Error fetching venta detail:', err);
      // Fallback: we already have basic data from 'venta' parameter
    }
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedVentaForDetail(null);
    setIsFormalizing(false);
  };

  const openHistoryModal = (venta, type) => {
    setSelectedVenta(venta);
    setHistoryType(type);
    setShowHistoryModal(true);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryType('');
  };

  const [ventaData, setVentaData] = useState({
    servicio: '',
    servicio_nombre: '',
    cliente: '',
    cliente_nombre: '',
    precio: 0,
    descuento: 0,
    impuesto: 0,
    numero_comprobante_simple: '', 
    numero_comprobante: '', 
    tipo_comprobante: 'SIMPLE',
    fecha_programada: '',
    estado: 'PENDIENTE',
    notas: '',
  });
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '', estado: '' });
  const [formData, setFormData] = useState({
    cliente: '',
    cliente_nombre: '',
    numero_comprobante_simple: '',
    numero_comprobante: '',
    tipo_comprobante: 'SIMPLE',
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

  const handleCreateCliente = async (clientData) => {
    try {
      const res = await clientesAPI.create(clientData);
      const newClient = res.data;
      setClientes(prev => {
        if (prev.find(c => c.id === newClient.id)) return prev;
        return [...prev, newClient];
      });
      setPendingSelection({ type: 'cliente', id: newClient.id, nombre: newClient.nombre });
      setClienteModalVisible(false);
      fetchClientes();
    } catch (err) {
      alert('Error creando cliente: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleNestedSubmit = async (e) => {
    e.preventDefault();
    try {
      if (nestedModal === 'servicio') {
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
  
  // Helper to generate next comprobante number
  const generateComprobanteNumber = (type) => {
    if (!type) return '';
    const prefixMap = {
      'SIMPLE': 'SMP',
      'BOLETA': 'BOL',
      'FACTURA': 'FAC'
    };
    const prefix = prefixMap[type] || 'DOC';
    
    // Combine both products and services ventas to find the global max for this prefix
    const allVentas = [...ventas, ...ventasServicios];
    // Try finding in its own specific field first for 'SIMPLE'
    let filtered = [];
    if (type === 'SIMPLE') {
      filtered = allVentas.filter(v => v.numero_comprobante_simple && v.numero_comprobante_simple.startsWith(`${prefix}-`));
    } else {
      filtered = allVentas.filter(v => v.numero_comprobante && v.numero_comprobante.startsWith(`${prefix}-`));
    }
    
    let maxNum = 0;
    filtered.forEach(v => {
      const field = (type === 'SIMPLE') ? v.numero_comprobante_simple : v.numero_comprobante;
      const parts = field.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1]);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    return `${prefix}-${(maxNum + 1).toString().padStart(6, '0')}`;
  };

  // Auto-calculate IGV for Products — only when calcularIgv is enabled
  useEffect(() => {
    if (modalMode === 'create' || modalMode === 'edit') {
      if (calcularIgv) {
        const subtotal = formData.detalle.reduce((sum, d) => {
          return sum + Number(d.subtotal || 0);
        }, 0) - Number(formData.descuento || 0);
        const newImpuesto = Number((subtotal * 0.18).toFixed(2));
        if (formData.impuesto !== newImpuesto) {
          setFormData(prev => ({ ...prev, impuesto: newImpuesto }));
        }
      } else {
        if (formData.impuesto !== 0) {
          setFormData(prev => ({ ...prev, impuesto: 0 }));
        }
      }
    }
  }, [formData.detalle, formData.descuento, modalMode, calcularIgv]);

  // Auto-calculate IGV for Services — only when calcularIgvServicio is enabled
  useEffect(() => {
    if (modalMode === 'venta' || modalMode === 'editVenta') {
      if (calcularIgvServicio) {
        const subtotal = Number(ventaData.precio || 0) - Number(ventaData.descuento || 0);
        const newImpuesto = Number((subtotal * 0.18).toFixed(2));
        if (ventaData.impuesto !== newImpuesto) {
          setVentaData(prev => ({ ...prev, impuesto: newImpuesto }));
        }
      } else {
        if (ventaData.impuesto !== 0) {
          setVentaData(prev => ({ ...prev, impuesto: 0 }));
        }
      }
    }
  }, [ventaData.precio, ventaData.descuento, modalMode, calcularIgvServicio]);

  useEffect(() => {
    fetchData();
  }, []);

  // async-parallel: los 5 fetches iniciales se ejecutan en paralelo
  const fetchData = async () => {
    try {
      const [ventasRes, productosRes, clientesRes, ventasServiciosRes, serviciosRes] = await Promise.all([
        ventasAPI.getAll(),
        productosAPI.getAll(),
        clientesAPI.getAll(),
        serviciosAPI.getVentas(),
        serviciosAPI.getAll(),
      ]);
      setVentas(ventasRes.data.results || ventasRes.data);
      setProductos(productosRes.data.results || productosRes.data);
      setClientes(clientesRes.data.results || clientesRes.data);
      setVentasServicios(ventasServiciosRes.data.results || ventasServiciosRes.data);
      setServicios(serviciosRes.data.results || serviciosRes.data);
    } catch (error) {
      console.error('Error fetching ventas data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    if (mode === 'create') {
      const simpleNum = generateComprobanteNumber('SIMPLE');
      setClienteAlias('');
      setCalcularIgv(false);
      setFormData({
        cliente: '',
        cliente_nombre: '',
        numero_comprobante_simple: simpleNum,
        numero_comprobante: simpleNum,
        tipo_comprobante: 'SIMPLE',
        estado: 'CONFIRMADA',
        descuento: 0,
        impuesto: 0,
        notas: '',
        detalle: [],
      });
    } else {
      setSelectedVenta(venta);
      // Fetch full detail if only basic info is present (optional, but good practice)
      try {
        const res = await ventasAPI.getById(venta.id);
        const full = res.data;
        // Extract alias from cliente_nombre if it's "Cliente General - Alias"
        const nombre = full.cliente_nombre || '';
        const isGeneralWithAlias = nombre.startsWith('Cliente General - ');
        setClienteAlias(isGeneralWithAlias ? nombre.slice('Cliente General - '.length) : '');
        // Auto-detect IGV flag: if impuesto > 0 the original venta had IGV calculated
        setCalcularIgv(Number(full.impuesto || 0) > 0);
        setFormData({
          cliente: full.cliente || '',
          cliente_nombre: isGeneralWithAlias ? 'Cliente General' : nombre,
          numero_comprobante_simple: full.numero_comprobante_simple || '',
          numero_comprobante: full.numero_comprobante || '',
          tipo_comprobante: full.tipo_comprobante || '',
          estado: full.estado || 'CONFIRMADA',
          descuento: Number(full.descuento || 0),
          impuesto: Number(full.impuesto || 0),
          notas: full.notas || '',
          detalle: (full.detalle || []).map(d => ({
            producto: String(d.producto),
            cantidad: Number(d.cantidad || 1),
            precio_venta: Number(d.precio_venta || 0),
            descuento: Number(d.descuento || 0),
            subtotal: (Number(d.cantidad || 1) * Number(d.precio_venta || 0)) - Number(d.descuento || 0),
          })),
        });
      } catch (err) {
        // Fallback to passed venta data
        const nombre = venta.cliente_nombre || '';
        const isGeneralWithAlias = nombre.startsWith('Cliente General - ');
        setClienteAlias(isGeneralWithAlias ? nombre.slice('Cliente General - '.length) : '');
        // Auto-detect IGV flag: if impuesto > 0 the original venta had IGV calculated
        setCalcularIgv(Number(venta.impuesto || 0) > 0);
        setFormData({
          cliente: venta.cliente || '',
          cliente_nombre: isGeneralWithAlias ? 'Cliente General' : nombre,
          numero_comprobante_simple: venta.numero_comprobante_simple || '',
          numero_comprobante: venta.numero_comprobante || '',
          tipo_comprobante: venta.tipo_comprobante || '',
          estado: venta.estado || 'CONFIRMADA',
          descuento: Number(venta.descuento || 0),
          impuesto: Number(venta.impuesto || 0),
          notas: venta.notas || '',
          detalle: (venta.detalle || []).map(d => ({
            producto: String(d.producto),
            cantidad: Number(d.cantidad || 1),
            precio_venta: Number(d.precio_venta || 0),
            descuento: Number(d.descuento || 0),
            subtotal: (Number(d.cantidad || 1) * Number(d.precio_venta || 0)) - Number(d.descuento || 0),
          })),
        });
      }
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
      detalle: [...prev.detalle, { producto: '', cantidad: 1, precio_venta: 0, descuento: 0, subtotal: 0 }]
    }));
  };

  const updateDetalle = (index, field, value) => {
    const newDetalle = [...formData.detalle];
    const item = { ...newDetalle[index], [field]: value };
    if (field === 'producto') {
      const prod = productos.find(p => p.id === parseInt(value));
      if (prod) {
        item.precio_venta = Number(prod.precio_venta || 0);
      }
      item.subtotal = (Number(item.cantidad || 0) * Number(item.precio_venta || 0)) - Number(item.descuento || 0);
    } else if (field === 'cantidad' || field === 'descuento') {
      item.subtotal = (Number(item.cantidad || 0) * Number(item.precio_venta || 0)) - Number(item.descuento || 0);
    } else if (field === 'subtotal') {
      const numericVal = parseFloat(value) || 0;
      const bruto = Number(item.cantidad || 0) * Number(item.precio_venta || 0);
      item.descuento = Math.max(0, Number((bruto - numericVal).toFixed(2)));
    }
    newDetalle[index] = item;
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
    if (!formData.cliente) {
      newErrors.cliente = 'Debe seleccionar un cliente para registrar la venta.';
    }
    
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

    // SUNAT Validation: Ventas > 700 to Cliente General require identification for BOLETA/FACTURA
    const isPublicoGeneral = formData.cliente_nombre === 'Cliente General' || 
                             (clientes.find(c => String(c.id) === String(formData.cliente))?.numero_documento === '00000000');
    const total = calcularTotal();
    
    if (isPublicoGeneral && (formData.tipo_comprobante === 'BOLETA' || formData.tipo_comprobante === 'FACTURA') && total >= 700) {
      alert('Sugerencia Legal: Las ventas mayores a S/ 700.00 con Boleta o Factura requieren identificar al cliente (DNI/RUC). Por favor, seleccione un cliente identificado o use Comprobante Simple.');
      return;
    }

    try {
      const submitData = new FormData();
      // Combine alias into cliente_nombre before submitting
      const submitFormData = { ...formData };
      if (submitFormData.cliente_nombre === 'Cliente General' && clienteAlias.trim()) {
        submitFormData.cliente_nombre = `Cliente General - ${clienteAlias.trim()}`;
      }
      Object.keys(submitFormData).forEach(key => {
        if (key === 'detalle') {
          submitData.append(key, JSON.stringify(submitFormData.detalle.map(d => ({
            producto: parseInt(d.producto),
            cantidad: Number(d.cantidad || 0),
            precio_venta: Number(d.precio_venta || 0),
            descuento: Number(d.descuento || 0),
          }))));
        } else if (key === 'cliente') {
            if (submitFormData[key]) {
                submitData.append(key, parseInt(submitFormData[key]));
            }
        } else if (key === 'comprobante_archivo') {
          if (submitFormData[key] instanceof File) {
            submitData.append(key, submitFormData[key]);
          }
        } else if (key === 'impuesto') {
            submitData.append(key, Number(submitFormData.impuesto || 0));
        } else if (key === 'descuento') {
            submitData.append(key, Number(submitFormData.descuento || 0));
        } else {
            if (submitFormData[key] !== null && submitFormData[key] !== '') {
                submitData.append(key, submitFormData[key]);
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
    setConfirmDialog({ visible: true, id: venta.id, nombre: venta.numero_comprobante || `Venta #${venta.id}`, estado: venta.estado });
  };

  const handleDeleteConfirm = async () => {
    try {
      await ventasAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '', estado: '' });
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
      return sum + Number(d.subtotal || 0);
    }, 0);
    return subtotal - Number(formData.descuento || 0) + Number(formData.impuesto || 0);
  };

  
  const openVentaModal = () => {
    const simpleNum = generateComprobanteNumber('SIMPLE');
    setVentaErrors({});
    setVentaClienteAlias('');
    setCalcularIgvServicio(false);
    setVentaData({
      servicio: '',
      servicio_nombre: '',
      cliente: '',
      cliente_nombre: '',
      precio: 0,
      descuento: 0,
      impuesto: 0,
      numero_comprobante_simple: simpleNum,
      tipo_comprobante: 'SIMPLE',
      numero_comprobante: simpleNum,
      fecha_programada: '',
      estado: 'PENDIENTE',
      notas: '',
    });
    setModalMode('venta');
    setModalVisible(true);
  };

  const openVentaEditModal = (venta) => {
    setSelectedVenta(venta);
    // Extract alias from cliente_nombre if it's "Cliente General - Alias"
    const nombre = venta.cliente_nombre || '';
    const isGeneralWithAlias = nombre.startsWith('Cliente General - ');
    setVentaClienteAlias(isGeneralWithAlias ? nombre.slice('Cliente General - '.length) : '');
    // Auto-detect IGV flag: if impuesto > 0 the original venta had IGV calculated
    setCalcularIgvServicio(Number(venta.impuesto || 0) > 0);
    setVentaData({
      servicio: venta.servicio || '',
      servicio_nombre: venta.servicio_nombre || '',
      cliente: venta.cliente || '',
      cliente_nombre: isGeneralWithAlias ? 'Cliente General' : nombre,
      precio: venta.precio || 0,
      descuento: venta.descuento || 0,
      impuesto: venta.impuesto || 0,
      numero_comprobante_simple: venta.numero_comprobante_simple || '',
      tipo_comprobante: venta.tipo_comprobante || '',
      numero_comprobante: venta.numero_comprobante || '',
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
    setVentaConfirmDialog({ visible: true, id: venta.id, nombre: venta.servicio_nombre || 'Venta de Servicio', estado: venta.estado });
  };

  const handleDeleteVentaConfirm = async () => {
    try {
      await serviciosAPI.deleteVenta(ventaConfirmDialog.id);
      setVentaConfirmDialog({ visible: false, id: null, nombre: '', estado: '' });
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
      const response = await serviciosAPI.exportarVentas(params);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ventas_servicios_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar ventas de servicios:', error);
      message.error("Error al exportar ventas de servicios");
    }
  };

  const handleVentaSubmit = async (e) => {
    e.preventDefault();
    const newVentaErrors = {};
    if (!ventaData.servicio) newVentaErrors.servicio = 'Debes seleccionar un servicio';
    if (!ventaData.precio || Number(ventaData.precio) <= 0) newVentaErrors.precio = 'El precio debe ser mayor a 0';
    // fecha_programada is now optional
    // if (!ventaData.fecha_programada) newVentaErrors.fecha_programada = 'La fecha programada es obligatoria';
    
    if (Object.keys(newVentaErrors).length > 0) {
      setVentaErrors(newVentaErrors);
      return;
    }

    // SUNAT Validation: Ventas > 700 to Cliente General require identification for BOLETA/FACTURA
    const isPublicoGeneral = ventaData.cliente_nombre === 'Cliente General' || 
                             (clientes.find(c => String(c.id) === String(ventaData.cliente))?.numero_documento === '00000000');
    const total = Number(ventaData.precio || 0) - Number(ventaData.descuento || 0) + Number(ventaData.impuesto || 0);
    
    if (isPublicoGeneral && (ventaData.tipo_comprobante === 'BOLETA' || ventaData.tipo_comprobante === 'FACTURA') && total >= 700) {
      alert('Sugerencia Legal: Las ventas de servicios mayores a S/ 700.00 con Boleta o Factura requieren identificar al cliente (DNI/RUC).');
      return;
    }

    const ventaSubmitData = new FormData();
    // Combine alias into cliente_nombre before submitting
    const submitVentaData = { ...ventaData };
    if (submitVentaData.cliente_nombre === 'Cliente General' && ventaClienteAlias.trim()) {
      submitVentaData.cliente_nombre = `Cliente General - ${ventaClienteAlias.trim()}`;
    }
    Object.keys(submitVentaData).forEach(key => {
        if (key === 'precio') {
            ventaSubmitData.append(key, Number(submitVentaData.precio || 0));
        } else if (key === 'descuento') {
            ventaSubmitData.append(key, Number(submitVentaData.descuento || 0));
        } else if (key === 'comprobante_archivo') {
            if (submitVentaData[key] instanceof File) {
                ventaSubmitData.append(key, submitVentaData[key]);
            }
        } else {
            if (submitVentaData[key] !== null && submitVentaData[key] !== '') {
                ventaSubmitData.append(key, submitVentaData[key]);
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
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ventas_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar ventas:', error);
      message.error("Error al exportar ventas");
    }
  };

  const handleExportHistorialGlobal = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await ventasAPI.exportarHistorialGlobal(params);
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_global_ventas_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar historial global:', error);
    }
  };

  const handleExportHistorialGlobalServicios = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await serviciosAPI.exportarHistorialGlobalVentas(params);
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_global_servicios_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar historial global de servicios:', error);
      message.error("No se pudo exportar el historial global de servicios");
    }
  };

  const filteredVentas = ventas.filter(v => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (v.cliente_nombre || 'Cliente General').toLowerCase().includes(term) || 
                        (v.numero_comprobante || '').toLowerCase().includes(term) ||
                        (v.numero_comprobante_simple || '').toLowerCase().includes(term) ||
                        `#${v.id}`.toLowerCase().includes(term);
    if (filterEstado !== 'ALL' && v.estado !== filterEstado) return false;
    
    // Date range match
    const purchaseDate = new Date(v.creado_en).toISOString().split('T')[0];
    if (filterFechaInicio && purchaseDate < filterFechaInicio) return false;
    if (filterFechaFin && purchaseDate > filterFechaFin) return false;
    
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
                                      (v.servicio_nombre || v.servicio || '').toString().toLowerCase().includes(term) ||
                                      (v.numero_comprobante || '').toLowerCase().includes(term) ||
                                      (v.numero_comprobante_simple || '').toLowerCase().includes(term);
    if (filterEstado !== 'ALL' && v.estado !== filterEstado) return false;
    
    // Date range match
    if (v.creado_en) {
      const saleDate = new Date(v.creado_en).toISOString().split('T')[0];
      if (filterFechaInicio && saleDate < filterFechaInicio) return false;
      if (filterFechaFin && saleDate > filterFechaFin) return false;
    }

    if (filterServicio !== 'ALL' && String(v.servicio) !== filterServicio) return false;
    
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
  const handleFilterEstadoChange = (val) => { setFilterEstado(val); setVentasPage(1); };

  if (loading) {
    return <LoadingScreen message="CARGANDO VENTAS..." />;
  }

  const handleFilterFechaInicio = (val) => { setFilterFechaInicio(val); setVentasPage(1); setVentasServiciosPage(1); };
  const handleFilterFechaFin = (val) => { setFilterFechaFin(val); setVentasPage(1); setVentasServiciosPage(1); };

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

      <VentaHistoryModal
        visible={showHistoryModal}
        onClose={closeHistoryModal}
        venta={selectedVenta}
        isServicio={historyType === 'servicio'}
      />

      <VentaGlobalKardexModal
        visible={showGlobalKardex}
        onClose={() => setShowGlobalKardex(false)}
      />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Registro de ventas a clientes</p>
        </div>
                <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'PRODUCTOS' ? (
            <>
              {!isVendedor && (
                <>
                  <ExportDropdown onExport={handleExportHistorialGlobal} label="Exportar Historial Global" />
                  <ExportDropdown onExport={handleExportar} label="Exportar Ventas de Productos" />
                </>
              )}
              <button className="btn btn-primary" onClick={() => openModal('create')}>
                <PlusOutlined /> Nueva Venta
              </button>
            </>
          ) : (
            <>
              {!isVendedor && (
                <>
                  <ExportDropdown onExport={handleExportHistorialGlobalServicios} label="Exportar Historial Global" />
                  <ExportDropdown onExport={handleExportarServicios} label="Exportar Ventas de Servicios" />
                </>
              )}
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
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Buscar</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por cliente o comprobante..." 
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Desde</label>
            <input 
              type="date" 
              className="form-input" 
              value={filterFechaInicio}
              onChange={(e) => handleFilterFechaInicio(e.target.value)}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Hasta</label>
            <input 
              type="date" 
              className="form-input" 
              value={filterFechaFin}
              onChange={(e) => handleFilterFechaFin(e.target.value)}
            />
          </div>
          <div style={{ width: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Estado</label>
            <select 
              className="form-input" 
              value={filterEstado}
              onChange={(e) => handleFilterEstadoChange(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              {activeTab === 'PRODUCTOS' ? (
                <>
                  <option value="CONFIRMADA">Confirmada</option>
                  <option value="BORRADOR">Borrador</option>
                  <option value="CANCELADA">Cancelada</option>
                </>
              ) : (
                <>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROGRESO">En Progreso</option>
                  <option value="TERMINADO">Terminado</option>
                  <option value="CANCELADO">Cancelado</option>
                </>
              )}
            </select>
          </div>
          {activeTab === 'SERVICIOS' && (
            <div style={{ width: '200px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Servicio</label>
              <select 
                className="form-input" 
                value={filterServicio}
                onChange={(e) => { setFilterServicio(e.target.value); setVentasServiciosPage(1); }}
              >
                <option value="ALL">Todos los servicios</option>
                {servicios.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <button 
            className="btn btn-secondary" 
            style={{ height: '38px', alignSelf: 'flex-end' }}
            onClick={() => {
              setSearchTerm('');
              setFilterEstado('ALL');
              setFilterFechaInicio('');
              setFilterFechaFin('');
              setFilterServicio('ALL');
              setVentasPage(1);
              setVentasServiciosPage(1);
            }}
            title="Limpiar filtros"
          >
            Limpiar
          </button>
        </div>
      </div>

      
      {activeTab === 'PRODUCTOS' ? (
        <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Fecha</th>
                <th style={{ width: '120px' }}>Comprobante</th>
                <th>Cliente</th>
                <th style={{ textAlign: 'center' }}>Producto</th>
                <th>Almacén</th>
                  <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVentas.map((venta) => (
                <tr key={venta.id}>
                  <td>{new Date(venta.creado_en).toLocaleDateString()}</td>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{venta.numero_comprobante_simple || 'S/N'}</div>
                    <div style={{ fontSize: '10px', color: '#8c8c8c' }}>COMPROBANTE SIMPLE</div>
                    {venta.tipo_comprobante && venta.tipo_comprobante !== 'SIMPLE' && (
                      <div style={{ marginTop: '4px', borderTop: '1px dashed #ddd', paddingTop: '2px' }}>
                        <div style={{ fontWeight: 'bold', color: '#1677ff' }}>{venta.numero_comprobante}</div>
                        <div style={{ fontSize: '10px', color: '#1677ff' }}>{venta.tipo_comprobante}</div>
                      </div>
                    )}
                  </td>
                  <td>{venta.cliente_nombre || 'Cliente General'}</td>
                  <td style={{ textAlign: "center" }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: "6px 12px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", margin: "0 auto" }}
                      onClick={() => openDetailModal(venta)}
                      title="Ver Detalle de Productos"
                    >
                      <OrderedListOutlined />
                      <span>Ver Detalle</span>
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${
                      venta.estado === "CONFIRMADA" ? "badge-success" :
                      venta.estado === "CANCELADA" ? "badge-danger" : "badge-warning"
                    }`}>
                      {venta.estado}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "bold" }}>S/. {Number(venta.total || 0).toFixed(2)}</td>
                  <td style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    <button className="btn btn-secondary" onClick={() => openHistoryModal(venta, 'producto')} title="Ver Historial/Kardex">
                      <HistoryOutlined />
                    </button>
                    {venta.estado === "BORRADOR" && (
                      <button className="btn btn-success" onClick={() => handleConfirmar(venta.id)} title="Confirmar venta">
                        <CheckOutlined />
                      </button>
                    )}
                    {/* Formalizar moved to detail modal */}
                    <button className="btn btn-secondary" onClick={() => openModal("edit", venta)} title="Editar">
                      <EditOutlined />
                    </button>
                    {!isVendedor && (
                      <button className="btn btn-danger" onClick={() => handleDeleteClick(venta)} title="Eliminar">
                        <DeleteOutlined />
                      </button>
                    )}
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
                  <th style={{ width: '110px' }}>Fecha</th>
                  <th style={{ width: '120px' }}>Comprobante</th>
                  <th>Servicio</th>
                  <th>Cliente</th>
                  <th>F. Programada</th>
                  <th>Almacén</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ width: '120px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVentasServicios.map((venta) => {
                  if (!venta) return null;
                  return (
                  <tr key={venta.id}>
                    <td>{venta.creado_en ? new Date(venta.creado_en).toLocaleDateString() : '-'}</td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{venta.numero_comprobante_simple || 'S/N'}</div>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>COMPROBANTE SIMPLE</div>
                      {venta.tipo_comprobante && venta.tipo_comprobante !== 'SIMPLE' && (
                        <div style={{ marginTop: '4px', borderTop: '1px dashed #ddd', paddingTop: '2px' }}>
                          <div style={{ fontWeight: 'bold', color: '#1677ff' }}>{venta.numero_comprobante}</div>
                          <div style={{ fontSize: '10px', color: '#1677ff' }}>{venta.tipo_comprobante}</div>
                        </div>
                      )}
                    </td>
                    <td>{venta.servicio_nombre || venta.servicio}</td>
                    <td>{venta.cliente_nombre || 'Cliente General'}</td>
                    <td>
                      {venta.fecha_programada ? (
                        <div>
                          <div style={{ fontWeight: '500' }}>{new Date(venta.fecha_programada).toLocaleDateString()}</div>
                          <div style={{ fontSize: '10px', color: '#8c8c8c' }}>{new Date(venta.fecha_programada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`badge ${
                        venta.estado === 'TERMINADO' ? 'badge-success' :
                        venta.estado === 'CANCELADO' ? 'badge-danger' :
                        venta.estado === 'EN_PROGRESO' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {venta.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "bold" }}>S/. {Number(venta.total || 0).toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-secondary" onClick={() => openHistoryModal(venta, 'servicio')} title="Ver Historial/Kardex">
                          <HistoryOutlined />
                        </button>
                        <button className="btn btn-secondary" onClick={() => openDetailModal(venta)} title="Ver Detalle"><EyeOutlined /></button>
                        {/* Formalizar moved to detail modal */}
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
                        {!isVendedor && (
                          <button className="btn btn-danger" onClick={() => handleDeleteVentaClick(venta)} title="Eliminar"><DeleteOutlined /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
                 {filteredVentasServicios.length === 0 && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay servicios registrados que coincidan con los filtros</td></tr>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label className="form-label" style={{ marginBottom: 0 }}>Cliente</label>
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                            onClick={() => {
                              const pg = clientes.find(c => c.numero_documento === '00000000');
                              if (pg) {
                                setVentaData(prev => ({ 
                                  ...prev, 
                                  cliente: String(pg.id), 
                                  cliente_nombre: pg.nombre,
                                  tipo_comprobante: 'SIMPLE',
                                  numero_comprobante: generateComprobanteNumber('SIMPLE')
                                }));
                              } else {
                                alert('Cliente General no encontrado.');
                              }
                            }}
                          >
                            👤 Cliente General
                          </button>
                        </div>
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
                          onActionClick={() => setClienteModalVisible(true)}
                          actionLabel="➕ Crear Nuevo Cliente"
                        />
                        {/* Alias input for Cliente General */}
                        {ventaData.cliente_nombre === 'Cliente General' && (
                          <div style={{ marginTop: '8px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                              Alias <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Nombre y Apellidos — opcional)</span>
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Ej: Juan Pérez o Tienda Martínez"
                              value={ventaClienteAlias}
                              onChange={(e) => setVentaClienteAlias(e.target.value)}
                              style={{ borderColor: 'var(--accent, #1677ff)', transition: 'border-color 0.2s' }}
                            />
                          </div>
                        )}
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
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Tipo Comprobante</label>
                        <select name="tipo_comprobante" className="form-input" value={ventaData.tipo_comprobante} onChange={(e) => {
                          const val = e.target.value;
                          setVentaData(prev => ({ 
                            ...prev, 
                            tipo_comprobante: val,
                            numero_comprobante: val === 'SIMPLE' ? prev.numero_comprobante_simple : generateComprobanteNumber(val)
                          }));
                        }}>
                          <option value="SIMPLE">Comprobante Simple</option>
                          <option value="BOLETA">Boleta</option>
                          <option value="FACTURA">Factura</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Nro Comprobante</label>
                        <input type="text" name="numero_comprobante" className="form-input" value={ventaData.numero_comprobante} readOnly style={{ background: 'var(--bg-input)', opacity: 0.8 }} />
                      </div>
                    </div>
                    <div className="grid grid-2">
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
                      <div className="form-group">
                        <label className="form-label">Impuestos (IGV 18%)</label>
                        <input
                          type="number"
                          name="impuesto"
                          className="form-input"
                          value={ventaData.impuesto}
                          readOnly={calcularIgvServicio}
                          onChange={calcularIgvServicio ? undefined : (e) => setVentaData(prev => ({ ...prev, impuesto: parseFloat(e.target.value) || 0 }))}
                          onFocus={(e) => !calcularIgvServicio && e.target.select()}
                          style={calcularIgvServicio ? { background: 'var(--bg-input)', opacity: 0.7 } : {}}
                          min="0"
                          step="0.01"
                        />
                        <div style={{ marginTop: '6px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', userSelect: 'none' }}>
                            <input
                              type="checkbox"
                              checked={calcularIgvServicio}
                              onChange={(e) => setCalcularIgvServicio(e.target.checked)}
                              style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--accent, #1677ff)' }}
                            />
                            Agregar Cálculo de IGV
                          </label>
                          {!calcularIgvServicio && (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              IGV incluido en los precios ingresados
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-2">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Cliente</label>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                        onClick={() => {
                          const pg = clientes.find(c => c.numero_documento === '00000000');
                          if (pg) {
                            setFormData(prev => ({ 
                              ...prev, 
                              cliente: String(pg.id), 
                              cliente_nombre: pg.nombre
                            }));
                            // If it was a SIMPLE, it stays simple, if it was something else, keep it. 
                            // But usually Cliente General is for SIMPLE.
                            if (errors.cliente) setErrors(prev => ({ ...prev, cliente: null }));
                          } else {
                            alert('Cliente Cliente General no encontrado.');
                          }
                        }}
                      >
                        👤 Cliente General
                      </button>
                    </div>
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
                        if (errors.cliente) setErrors(prev => ({ ...prev, cliente: null }));
                      }}
                      placeholder="Buscar cliente..."
                      onActionClick={() => setClienteModalVisible(true)}
                      actionLabel="➕ Crear Nuevo Cliente"
                      error={errors.cliente}
                    />
                    {/* Alias input for Cliente General */}
                    {formData.cliente_nombre === 'Cliente General' && (
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                          Alias <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Nombre y Apellidos — opcional)</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Ej: Juan Pérez o Tienda Martínez"
                          value={clienteAlias}
                          onChange={(e) => setClienteAlias(e.target.value)}
                          style={{ borderColor: 'var(--accent, #1677ff)', transition: 'border-color 0.2s' }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo Comprobante</label>
                    <select name="tipo_comprobante" className="form-input" value={formData.tipo_comprobante} onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        tipo_comprobante: val,
                        numero_comprobante: val === 'SIMPLE' ? prev.numero_comprobante_simple : generateComprobanteNumber(val)
                      }));
                      if (errors.tipo_comprobante) setErrors(prev => ({ ...prev, tipo_comprobante: null }));
                    }}>
                      <option value="SIMPLE">Comprobante Simple</option>
                      <option value="BOLETA">Boleta</option>
                      <option value="FACTURA">Factura</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Nro Comprobante</label>
                    <input type="text" name="numero_comprobante" className="form-input" value={formData.numero_comprobante} readOnly style={{ background: 'var(--bg-input)', opacity: 0.8 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select name="estado" className="form-input" value={formData.estado} onChange={handleChange}>
                      <option value="BORRADOR">Borrador</option>
                      <option value="CONFIRMADA">Confirmada</option>
                      <option value="CANCELADA">Cancelada</option>
                    </select>
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
                      <div style={{ width: '110px' }}>P. Unit. (fijo)</div>
                      <div style={{ width: '100px' }}>Descuento</div>
                      <div style={{ width: '100px' }}>Subtotal</div>
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
                          className="form-input"
                          placeholder="Precio"
                          value={item.precio_venta}
                          readOnly
                          style={{ width: '110px', opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-table-header)' }}
                          tabIndex={-1}
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
                          type="number"
                          className="form-input"
                          placeholder="Subtotal"
                          value={item.subtotal}
                          onChange={(e) => updateDetalle(index, 'subtotal', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '100px', fontWeight: 'bold', color: 'var(--accent)' }}
                          min="0"
                          step="0.01"
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
                    <label className="form-label">Impuestos (IGV 18%)</label>
                    <input
                      type="number"
                      name="impuesto"
                      className="form-input"
                      value={formData.impuesto}
                      readOnly={calcularIgv}
                      onChange={calcularIgv ? undefined : (e) => setFormData(prev => ({ ...prev, impuesto: parseFloat(e.target.value) || 0 }))}
                      onFocus={(e) => !calcularIgv && e.target.select()}
                      style={calcularIgv ? { background: 'var(--bg-input)', opacity: 0.7 } : {}}
                      min="0"
                      step="0.01"
                    />
                    <div style={{ marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={calcularIgv}
                          onChange={(e) => setCalcularIgv(e.target.checked)}
                          style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--accent, #1677ff)' }}
                        />
                        Agregar Cálculo de IGV
                      </label>
                      {!calcularIgv && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          IGV incluido en los precios ingresados
                        </div>
                      )}
                    </div>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Crear Nuevo {nestedModal === 'servicio' ? 'Servicio' : ''}
              </h3>
              <button className="modal-close" onClick={() => setNestedModal(null)}>×</button>
            </div>
            <form onSubmit={handleNestedSubmit} style={{ padding: '20px' }}>
              {nestedModal === 'servicio' && (
                <>
                  <div className="form-group"><label className="form-label">Nombre del Servicio *</label><input required className="form-input" value={nestedFormData.nombre} onChange={(e) => setNestedFormData(p => ({...p, nombre: e.target.value}))} /></div>
                  <div className="grid grid-2">
                     <div className="form-group"><label className="form-label">Precio de Servicio</label><input type="number" step="0.01" required className="form-input" value={nestedFormData.precio_base} onChange={(e) => setNestedFormData(p => ({...p, precio_base: Number(e.target.value)}))} /></div>
                     <div className="form-group"><label className="form-label">Duración (min)</label><input type="number" required className="form-input" value={nestedFormData.duracion_minutos} onChange={(e) => setNestedFormData(p => ({...p, duracion_minutos: Number(e.target.value)}))} /></div>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setNestedModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Servicio</button>
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
      
      <ClienteFormModal 
        visible={clienteModalVisible}
        mode="create"
        onClose={() => setClienteModalVisible(false)}
        onSave={handleCreateCliente}
      />

      {/* Modal de Detalle de Venta */}
      {detailModalVisible && selectedVentaForDetail && (
        <div className="modal-overlay" onClick={closeDetailModal} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px" }}>
            <style>{`
              @page { 
                margin: 0 !important; 
                size: auto; 
              }
              @media print {
                /* Hide everything by default */
                body * { visibility: hidden !important; }
                /* Show only the modal and its content */
                .modal-overlay, .modal-overlay * { visibility: visible !important; }
                
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  height: auto !important;
                  overflow: visible !important;
                  background: white !important;
                }
                
                /* Add content margin for printing since @page margin is 0 */
                body {
                  padding: 1.5cm !important;
                }

                .modal-overlay { 
                  position: absolute !important; 
                  left: 0 !important; 
                  top: 0 !important; 
                  background: white !important; 
                  width: 100% !important; 
                  margin: 0 !important; 
                  padding: 0 !important;
                  display: block !important;
                  overflow: visible !important;
                  height: auto !important;
                }
                .modal { 
                  position: relative !important; 
                  width: 100% !important; 
                  max-width: 100% !important; 
                  margin: 0 !important; 
                  padding: 0 !important; 
                  box-shadow: none !important; 
                  border: none !important;
                  background: white !important;
                  height: auto !important;
                  overflow: visible !important;
                }
                /* Hide UI elements */
                .modal-close, .modal-footer, .btn, .ant-btn { display: none !important; }
              }
            `}</style>
            <div className="modal-header">
              <h3 className="modal-title">Detalle de {selectedVentaForDetail.isService ? 'Servicio' : 'Venta'} #{selectedVentaForDetail.id}</h3>
              <button className="modal-close" onClick={closeDetailModal}>×</button>
            </div>
            <div className="modal-body" style={{ padding: "24px" }}>
              <div className="grid grid-2" style={{ marginBottom: "24px", background: "var(--bg-body)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Cliente</div>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>{selectedVentaForDetail.cliente_nombre || "Cliente General"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Comprobante(s)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Only show SMP and "Comprobante de Pago" text if NOT printing LEGAL */}
                    {printMode !== 'LEGAL' && (
                       <div style={{ fontWeight: "bold" }}>
                         COMPROBANTE DE PAGO: {selectedVentaForDetail.numero_comprobante_simple || "S/N"}
                         {printMode === 'SIMPLE' && <div style={{ fontSize: '12px', fontWeight: 'normal' }}>COMPROBANTE NO VÁLIDO PARA SUNAT</div>}
                       </div>
                    )}
                    
                    {/* Only show LEGAL info if NOT printing SIMPLE and legal exists */}
                    {printMode !== 'SIMPLE' && selectedVentaForDetail.tipo_comprobante && selectedVentaForDetail.tipo_comprobante !== 'SIMPLE' && (
                      <div style={{ fontWeight: "bold", color: "var(--accent)" }}>
                        {selectedVentaForDetail.tipo_comprobante}: {selectedVentaForDetail.numero_comprobante}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", marginTop: '8px' }}>Fecha: {selectedVentaForDetail.creado_en ? new Date(selectedVentaForDetail.creado_en).toLocaleString() : 'S/F'}</div>
                </div>
              </div>

              {!selectedVentaForDetail.isService ? (
                <div className="table-container" style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--bg-table-header)" }}>
                      <tr>
                        <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)" }}>Producto</th>
                        <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)", textAlign: "center" }}>Cant.</th>
                        <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)", textAlign: "right" }}>P. Unitario</th>
                        <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)", textAlign: "right" }}>Desc.</th>
                        <th style={{ padding: "12px", borderBottom: "2px solid var(--border-color)", textAlign: "right" }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedVentaForDetail.detalle || []).map((item, idx) => {
                        if (!item) return null;
                        const prodId = item.producto_id || item.producto; // Handle both ID and full object if any
                        const prod = productos.find(p => String(p.id) === String(prodId));
                        return (
                          <tr key={idx}>
                            <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)" }}>
                              <div style={{ fontWeight: 500 }}>{item.producto_nombre || prod?.nombre || "Producto"}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Código: {item.producto_codigo || prod?.codigo || "S/C"}</div>
                            </td>
                            <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)", textAlign: "center" }}>{item.cantidad || 0}</td>
                            <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)", textAlign: "right" }}><span>S/. </span>{Number(item.precio_venta || 0).toFixed(2)}</td>
                            <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)", textAlign: "right" }}><span>S/. </span>{Number(item.descuento || 0).toFixed(2)}</td>
                            <td style={{ padding: "12px", borderBottom: "1px solid var(--border-color)", textAlign: "right" }}><span>S/. </span>{((Number(item.cantidad || 0) * Number(item.precio_venta || 0)) - Number(item.descuento || 0)).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ background: "var(--bg-body)", padding: "20px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div className="grid grid-2">
                    <div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Servicio</div>
                      <div style={{ fontWeight: "bold", fontSize: "16px" }}>{selectedVentaForDetail.servicio_nombre || selectedVentaForDetail.servicio}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Precio de Servicio</div>
                      <div style={{ fontWeight: "bold" }}>S/. {Number(selectedVentaForDetail.precio || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Estado del Servicio</div>
                    <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', background: selectedVentaForDetail.estado === 'COMPLETADO' ? '#e6f4ff' : '#fff7e6', color: selectedVentaForDetail.estado === 'COMPLETADO' ? '#0958d9' : '#d46b08' }}>
                      {selectedVentaForDetail.estado}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                 <div style={{ display: "flex", gap: "40px", fontSize: "14px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Descuento Global:</span>
                    <span style={{ fontWeight: 600 }}><span>S/. </span>{Number(selectedVentaForDetail.descuento || 0).toFixed(2)}</span>
                 </div>
                 <div style={{ display: "flex", gap: "40px", fontSize: "14px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Impuesto:</span>
                    <span style={{ fontWeight: 600 }}><span>S/. </span>{Number(selectedVentaForDetail.impuesto || 0).toFixed(2)}</span>
                 </div>
                 <div style={{ display: "flex", gap: "40px", fontSize: "18px", borderTop: "2px solid var(--border-color)", paddingTop: "8px", marginTop: "4px" }}>
                    <span style={{ fontWeight: "bold" }}>Total:</span>
                    <span style={{ fontWeight: "bold", color: "var(--accent, #1677ff)" }}><span>S/. </span>{Number(selectedVentaForDetail.total || 0).toFixed(2)}</span>
                 </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {!isFormalizing && selectedVentaForDetail.tipo_comprobante === 'SIMPLE' && (
                  <button 
                    className="btn btn-primary" 
                    style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
                    onClick={() => {
                      setIsFormalizing(true);
                      setFormalizacionData({ 
                        tipo: 'BOLETA', 
                        numero: generateComprobanteNumber('BOLETA') 
                      });
                    }}
                  >
                    <FileTextOutlined /> Emitir Boleta/Factura
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={closeDetailModal}>Cerrar</button>
                {!isFormalizing && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setPrintMode('SIMPLE');
                        setTimeout(() => {
                          window.print();
                          setPrintMode(null);
                        }, 100);
                      }} 
                      title="Imprimir Comprobante Simple"
                    >
                      <DownloadOutlined /> Comprobante Simple
                    </button>
                    {selectedVentaForDetail.tipo_comprobante && selectedVentaForDetail.tipo_comprobante !== 'SIMPLE' && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => {
                          setPrintMode('LEGAL');
                          setTimeout(() => {
                            window.print();
                            setPrintMode(null);
                          }, 100);
                        }} 
                        title={`Imprimir ${selectedVentaForDetail.tipo_comprobante}`}
                      >
                        <DownloadOutlined /> {selectedVentaForDetail.tipo_comprobante === 'BOLETA' ? 'Boleta' : 'Factura'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {isFormalizing && (
              <div style={{ padding: '0 24px 24px 24px', borderTop: '1px solid var(--border-color)', marginTop: '0' }}>
                <h4 style={{ margin: '16px 0 12px 0', color: 'var(--accent)' }}>Formalización de Comprobante</h4>
                <div className="grid grid-2" style={{ alignItems: 'flex-end' }}>
                  <div className="form-group">
                    <label className="form-label">Tipo de Comprobante Legal</label>
                    <select 
                      className="form-input" 
                      value={formalizacionData.tipo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormalizacionData({ 
                          tipo: val, 
                          numero: generateComprobanteNumber(val) 
                        });
                      }}
                    >
                      <option value="BOLETA">Boleta</option>
                      <option value="FACTURA">Factura</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nro de Comprobante</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formalizacionData.numero} 
                      readOnly 
                      style={{ background: 'var(--bg-input)', opacity: 0.8 }} 
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button className="btn btn-secondary" onClick={() => setIsFormalizing(false)}>Cancelar</button>
                  <button 
                    className="btn btn-primary" 
                    onClick={async () => {
                      try {
                        const isService = !!selectedVentaForDetail.isService;
                        const endpoint = isService 
                          ? `${import.meta.env.VITE_API_URL}/servicios/ventas-servicio/${selectedVentaForDetail.id}/`
                          : `${import.meta.env.VITE_API_URL}/inventario/ventas/${selectedVentaForDetail.id}/`;
                        
                        const response = await fetch(endpoint, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            tipo_comprobante: formalizacionData.tipo,
                            numero_comprobante: formalizacionData.numero
                          })
                        });
                        
                        if (response.ok) {
                          alert('Comprobante formalizado con éxito');
                          setIsFormalizing(false);
                          closeDetailModal();
                          if (activeTab === 'PRODUCTOS') fetchVentas();
                          else fetchVentasServicios();
                        } else {
                          const err = await response.json();
                          alert('Error al formalizar: ' + JSON.stringify(err));
                        }
                      } catch (error) {
                        console.error('Error formalizando:', error);
                        alert('Error de conexión al formalizar');
                      }
                    }}
                  >
                    Confirmar Emisión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diálogos de Confirmación de Eliminación */}
      <ConfirmDialog
        visible={confirmDialog.visible || ventaConfirmDialog.visible}
        title="Confirmar Eliminación"
        message={
          confirmDialog.visible 
            ? (confirmDialog.estado === 'CONFIRMADA' 
                ? `Esta venta está CONFIRMADA. Al eliminarla, el stock de los productos se reintegrará automáticamente al inventario. ¿Deseas eliminar la venta ${confirmDialog.nombre}?`
                : confirmDialog.estado === 'CANCELADA'
                ? `Esta venta ya fue CANCELADA. Al eliminarla se borrará el registro permanentemente. ¿Deseas eliminar la venta ${confirmDialog.nombre}?`
                : `Esta venta es un BORRADOR y no ha afectado el inventario. Al eliminarla se perderá permanentemente. ¿Deseas eliminar la venta ${confirmDialog.nombre}?`)
            : (ventaConfirmDialog.estado === 'TERMINADO'
                ? `Este servicio está TERMINADO. Al eliminarlo se borrará el registro permanentemente. ¿Deseas eliminar el servicio ${ventaConfirmDialog.nombre}?`
                : `Al eliminar este servicio se perderá permanentemente. ¿Deseas eliminar el servicio ${ventaConfirmDialog.nombre}?`)
        }
        onConfirm={confirmDialog.visible ? handleDeleteConfirm : handleDeleteVentaConfirm}
        onCancel={() => {
          if (confirmDialog.visible) setConfirmDialog({ visible: false, id: null, nombre: '', estado: '' });
          if (ventaConfirmDialog.visible) setVentaConfirmDialog({ visible: false, id: null, nombre: '', estado: '' });
        }}
        confirmText="Sí, eliminar"
        danger={true}
      />
    </div>
  );
}

export default Ventas;
