import { useState, useEffect } from 'react';
import { comprasAPI, proveedoresAPI, productosAPI, comprasServiciosAPI, serviciosAPI } from '../services/api';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined,
  OrderedListOutlined, EyeOutlined, DownloadOutlined, HistoryOutlined
} from '@ant-design/icons';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import ProductFormModal from '../components/ProductFormModal';
import ProveedorFormModal from '../components/ProveedorFormModal';
import GlobalKardexModal from '../components/compras/GlobalKardexModal';
import CompraHistoryModal from '../components/compras/CompraHistoryModal';
import CompraDetailModal from '../components/compras/CompraDetailModal';
import LoadingScreen from '../components/LoadingScreen';
import SearchableSelect from '../components/SearchableSelect';

function Compras({ openNew = 0 }) {
  const [loading, setLoading] = useState(true);
  const [compras, setCompras] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [selectedCompraForDetail, setSelectedCompraForDetail] = useState(null);
  const [searchProveedor, setSearchProveedor] = useState('');
  const [searchComprobante, setSearchComprobante] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  // History Modal States
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedHistoryCompra, setSelectedHistoryCompra] = useState(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState('estados'); // 'estados', 'productos'
  const [historyEstados, setHistoryEstados] = useState([]);
  const [historyProductos, setHistoryProductos] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyFechaDesde, setHistoryFechaDesde] = useState('');
  const [historyFechaHasta, setHistoryFechaHasta] = useState('');
  
  // Global Kardex States
  const [globalKardexVisible, setGlobalKardexVisible] = useState(false);
  const [globalKardexData, setGlobalKardexData] = useState([]);
  const [loadingGlobalKardex, setLoadingGlobalKardex] = useState(false);
  const [globalKardexPage, setGlobalKardexPage] = useState(1);
  const [globalKardexTotal, setGlobalKardexTotal] = useState(0);
  const [globalKardexTotalPages, setGlobalKardexTotalPages] = useState(1);
  const [globalKardexFechaDesde, setGlobalKardexFechaDesde] = useState('');
  const [globalKardexFechaHasta, setGlobalKardexFechaHasta] = useState('');
  const [globalFilterProveedor, setGlobalFilterProveedor] = useState('');
  const [globalFilterProducto, setGlobalFilterProducto] = useState('');
  
  // Pagination
  const COMPRAS_PAGE_SIZE = 15;
  const [comprasPage, setComprasPage] = useState(1);
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ 
    visible: false, 
    id: null, 
    nombre: '', 
    type: 'delete', 
    title: '', 
    message: '',
    confirmText: '',
    danger: false
  });
  const [formData, setFormData] = useState({
    proveedor: '',
    proveedor_nombre: '',
    tipo_compra: 'PROVEEDOR',
    numero_comprobante: '',
    tipo_comprobante: '',
    estado: 'CONFIRMADA',
    impuesto: 0,
    notas: '',
    detalle: [],
  });

  const [nestedModal, setNestedModal] = useState(null);
  const [nestedFormData, setNestedFormData] = useState({});
  const [nestedModalIndex, setNestedModalIndex] = useState(null);

  const openNestedModal = (type) => {
    if (type === 'proveedor') {
      setProveedorModalVisible(true);
    }
  };

  const [proveedorModalVisible, setProveedorModalVisible] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);
  // Alias for Proveedor General (kept separate so it's combined on submit)
  const [proveedorAlias, setProveedorAlias] = useState('');

  useEffect(() => {
    if (pendingSelection && pendingSelection.type === 'proveedor') {
      const found = proveedores.find(p => String(p.id) === String(pendingSelection.id));
      if (found) {
        setFormData(prev => ({ 
          ...prev, 
          proveedor: String(found.id), 
          proveedor_nombre: found.nombre 
        }));
        setPendingSelection(null);
      }
    } else if (pendingSelection && pendingSelection.type === 'producto') {
      const found = productos.find(p => String(p.id) === String(pendingSelection.id));
      if (found) {
        if (nestedModalIndex !== null) {
          setFormData(prev => {
            const newDetalle = [...prev.detalle];
            newDetalle[nestedModalIndex] = {
              ...newDetalle[nestedModalIndex],
              producto: String(found.id),
              precio_compra: Number(found.precio_compra || 0)
            };
            return { ...prev, detalle: newDetalle };
          });
          setNestedModalIndex(null);
        }
        setPendingSelection(null);
      }
    }
  }, [proveedores, productos, pendingSelection, nestedModalIndex]);

  useEffect(() => {
    fetchData();
  }, []);

  // Open modal when parent triggers (via counter prop):
  useEffect(() => {
    if (openNew > 0) openModal('create');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNew]);

  // async-parallel: las 3 peticiones iniciales se ejecutan en paralelo
  const fetchData = async () => {
    try {
      const [comprasRes, proveedoresRes, productosRes] = await Promise.all([
        comprasAPI.getAll(),
        proveedoresAPI.getAll(),
        productosAPI.getAll(),
      ]);
      setCompras(comprasRes.data.results || comprasRes.data);
      setProveedores(proveedoresRes.data.results || proveedoresRes.data);
      setProductos(productosRes.data.results || productosRes.data);
    } catch (error) {
      console.error('Error fetching compras data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aliases para compatibilidad con callbacks individuales (onSave de modales, etc.)
  // Genera sugerencia de número de comprobante para compras: C-YYYYMM-NNNNN
  const generateComprobanteCompra = (existingCompras = []) => {
    const now = new Date();
    const prefix = `C-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month_compras = existingCompras.filter(c =>
      c.numero_comprobante && c.numero_comprobante.startsWith(prefix)
    );
    let maxNum = 0;
    month_compras.forEach(c => {
      const parts = c.numero_comprobante.split('-');
      const num = parseInt(parts[parts.length - 1]);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return `${prefix}-${String(maxNum + 1).padStart(5, '0')}`;
  };

  const fetchCompras = async () => {
    try {
      const response = await comprasAPI.getAll();
      setCompras(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching compras:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProveedores = async () => {
    try {
      const response = await proveedoresAPI.getAll();
      setProveedores(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching proveedores:', error);
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

  const openModal = async (mode, compra = null) => {
    setModalMode(mode);
    setErrors({});
    if (compra) {
      setSelectedCompra(compra);
      try {
        const res = await comprasAPI.getById(compra.id);
        const full = res.data;
        // Extract alias from proveedor_nombre if it's "Proveedor General - Alias"
        const provNombre = full.proveedor_nombre || '';
        const isGeneralWithAlias = provNombre.startsWith('Proveedor General - ');
        setProveedorAlias(isGeneralWithAlias ? provNombre.slice('Proveedor General - '.length) : '');
        setFormData({
          proveedor: full.proveedor || '',
          proveedor_nombre: isGeneralWithAlias ? 'Proveedor General' : provNombre,
          tipo_compra: full.tipo_compra || 'PROVEEDOR',
          numero_comprobante: full.numero_comprobante || '',
          tipo_comprobante: full.tipo_comprobante || '',
          estado: full.estado || 'BORRADOR',
          impuesto: Number(full.impuesto || 0),
          notas: full.notas || '',
          detalle: (full.detalle || []).map(d => ({
            producto: String(d.producto),
            cantidad: Number(d.cantidad || 1),
            precio_compra: Number(d.precio_compra || 0),
            descuento: Number(d.descuento || 0),
            subtotal: (Number(d.cantidad || 1) * Number(d.precio_compra || 0)) - Number(d.descuento || 0),
          })),
        });
      } catch {
        // Extract alias from proveedor_nombre if it's "Proveedor General - Alias"
        const provNombre = compra.proveedor_nombre || '';
        const isGeneralWithAlias = provNombre.startsWith('Proveedor General - ');
        setProveedorAlias(isGeneralWithAlias ? provNombre.slice('Proveedor General - '.length) : '');
        setFormData({
          proveedor: compra.proveedor || '',
          proveedor_nombre: isGeneralWithAlias ? 'Proveedor General' : provNombre,
          tipo_compra: compra.tipo_compra || 'PROVEEDOR',
          numero_comprobante: compra.numero_comprobante || '',
          tipo_comprobante: compra.tipo_comprobante || '',
          estado: compra.estado || 'CONFIRMADA',
          impuesto: Number(compra.impuesto || 0),
          notas: compra.notas || '',
          detalle: [],
        });
      }
    } else {
      setSelectedCompra(null);
      setProveedorAlias('');
      setFormData({
        proveedor: '',
        proveedor_nombre: '',
        tipo_compra: 'PROVEEDOR',
        numero_comprobante: '',
        tipo_comprobante: '',
        estado: 'CONFIRMADA',
        impuesto: 0,
        notas: '',
        detalle: [],
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCompra(null);
    setErrors({});
  };

  const openDetailModal = (compra) => {
    setSelectedCompraForDetail(compra);
    setDetailModalVisible(true);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedCompraForDetail(null);
  };

  const fetchHistoryEstados = async (id, pageArg = 1, desde = '', hasta = '') => {
    const page = typeof pageArg === 'number' ? pageArg : 1;
    setLoadingHistory(true);
    try {
      const params = { page, fecha_desde: desde, fecha_hasta: hasta };
      const res = await comprasAPI.getHistoryEstados(id, params);
      setHistoryEstados(res.data.results || []);
      setHistoryTotal(res.data.count || 0);
      setHistoryTotalPages(res.data.total_pages || 1);
      setHistoryPage(res.data.page || 1);
    } catch (error) {
      console.error('Error fetching history estados:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchHistoryProductos = async (id, pageArg = 1, desde = '', hasta = '') => {
    const page = typeof pageArg === 'number' ? pageArg : 1;
    setLoadingHistory(true);
    try {
      const params = { page, fecha_desde: desde, fecha_hasta: hasta };
      const res = await comprasAPI.getKardexProductos(id, params);
      setHistoryProductos(res.data.results || []);
      setHistoryTotal(res.data.count || 0);
      setHistoryTotalPages(res.data.total_pages || 1);
      setHistoryPage(res.data.page || 1);
    } catch (error) {
      console.error('Error fetching history productos:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistoryModal = async (compra) => {
    setSelectedHistoryCompra(compra);
    setHistoryModalVisible(true);
    setActiveHistoryTab('estados');
    setHistoryPage(1);
    setHistoryFechaDesde('');
    setHistoryFechaHasta('');
    fetchHistoryEstados(compra.id, 1, '', '');
  };

  const closeHistoryModal = () => {
    setHistoryModalVisible(false);
    setSelectedHistoryCompra(null);
    setHistoryEstados([]);
    setHistoryProductos([]);
    setHistoryPage(1);
    setHistoryFechaDesde('');
    setHistoryFechaHasta('');
  };

  const handleHistoryPageChange = (newPage) => {
    if (activeHistoryTab === 'estados') {
      fetchHistoryEstados(selectedHistoryCompra.id, newPage, historyFechaDesde, historyFechaHasta);
    } else {
      fetchHistoryProductos(selectedHistoryCompra.id, newPage, historyFechaDesde, historyFechaHasta);
    }
  };

  const handleHistoryFilter = () => {
    if (activeHistoryTab === 'estados') {
      fetchHistoryEstados(selectedHistoryCompra.id, 1, historyFechaDesde, historyFechaHasta);
    } else {
      fetchHistoryProductos(selectedHistoryCompra.id, 1, historyFechaDesde, historyFechaHasta);
    }
  };

  const openGlobalKardex = async (pageArg = 1, desde = '', hasta = '', prov = '', prod = '') => {
    const page = typeof pageArg === 'number' ? pageArg : 1;
    setGlobalKardexVisible(true);
    setLoadingGlobalKardex(true);
    try {
      const params = { 
        page, 
        fecha_desde: desde, 
        fecha_hasta: hasta,
        proveedor: prov,
        producto: prod
      };
      const res = await comprasAPI.getKardexGlobalProductos(params);
      setGlobalKardexData(res.data.results || []);
      setGlobalKardexTotal(res.data.count || 0);
      setGlobalKardexTotalPages(res.data.total_pages || 1);
      setGlobalKardexPage(res.data.page || 1);
    } catch (error) {
      console.error('Error fetching global kardex:', error);
      alert('Error al cargar el Historial Global.');
    } finally {
      setLoadingGlobalKardex(false);
    }
  };

  const handleGlobalPageChange = (newPage) => {
    openGlobalKardex(newPage, globalKardexFechaDesde, globalKardexFechaHasta, globalFilterProveedor, globalFilterProducto);
  };

  const handleGlobalFilter = () => {
    openGlobalKardex(1, globalKardexFechaDesde, globalKardexFechaHasta, globalFilterProveedor, globalFilterProducto);
  };

  const addProducto = () => {
    setFormData(prev => ({
      ...prev,
      detalle: [...prev.detalle, { producto: '', cantidad: 1, precio_compra: 0, descuento: 0, subtotal: 0 }]
    }));
  };

  const updateDetalle = (index, field, value) => {
    const newDetalle = [...formData.detalle];
    const item = { ...newDetalle[index], [field]: value };
    if (field === 'producto') {
      const prod = productos.find(p => p.id === parseInt(value));
      if (prod) {
        item.precio_compra = Number(prod.precio_compra || 0);
      }
      item.subtotal = (Number(item.cantidad || 0) * Number(item.precio_compra || 0)) - Number(item.descuento || 0);
    } else if (field === 'cantidad' || field === 'descuento') {
      item.subtotal = (Number(item.cantidad || 0) * Number(item.precio_compra || 0)) - Number(item.descuento || 0);
    } else if (field === 'subtotal') {
      const numericVal = parseFloat(value) || 0;
      const bruto = Number(item.cantidad || 0) * Number(item.precio_compra || 0);
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
    if (formData.detalle.length === 0) {
      newErrors.detalle = 'Debes agregar al menos un producto a la compra.';
    } else {
      formData.detalle.forEach((item, i) => {
        if (!item.producto) newErrors[`detalle_${i}`] = 'Selecciona un producto';
        if (Number(item.cantidad) <= 0) newErrors[`cantidad_${i}`] = 'La cantidad debe ser mayor a 0';
        if (Number(item.precio_compra) <= 0) newErrors[`precio_${i}`] = 'El precio debe ser mayor a 0';
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    // Check if provider is active
    const selectedProv = proveedores.find(p => p.id === parseInt(formData.proveedor));
    if (selectedProv && !selectedProv.activo) {
      alert('No se puede realizar una compra a un proveedor inactivo. Por favor, activa el proveedor o selecciona otro.');
      return;
    }
    try {
      const submitData = new FormData();
      // Combine alias into proveedor_nombre before submitting
      const submitFormData = { ...formData };
      if (submitFormData.proveedor_nombre === 'Proveedor General' && proveedorAlias.trim()) {
        submitFormData.proveedor_nombre = `Proveedor General - ${proveedorAlias.trim()}`;
      }
      Object.keys(submitFormData).forEach(key => {
        if (key === 'detalle') {
          submitData.append(key, JSON.stringify(submitFormData.detalle.map(d => ({
            producto: parseInt(d.producto),
            cantidad: Number(d.cantidad || 0),
            precio_compra: Number(d.precio_compra || 0),
            descuento: Number(d.descuento || 0),
          }))));
        } else if (key === 'proveedor') {
            if (submitFormData[key]) {
                submitData.append(key, parseInt(submitFormData[key]));
            }
        } else if (key === 'comprobante_archivo') {
          if (submitFormData[key] instanceof File) {
            submitData.append(key, submitFormData[key]);
          }
        } else if (key === 'impuesto') {
            submitData.append(key, Number(submitFormData.impuesto || 0));
        } else {
            if (submitFormData[key] !== null && submitFormData[key] !== '') {
                submitData.append(key, submitFormData[key]);
            }
        }
      });

      if (modalMode === 'create') {
        await comprasAPI.create(submitData);
      } else {
        await comprasAPI.update(selectedCompra.id, submitData);
      }
      closeModal();
      fetchCompras();
    } catch (error) {
      console.error('Error saving compra:', error);
      const errData = error.response?.data;
      const msg = typeof errData === 'string' ? errData
        : errData?.detail || errData?.message || JSON.stringify(errData) || 'Error al guardar';
      alert(msg);
    }
  };

  const handleDeleteClick = (compra) => {
    setConfirmDialog({ 
      visible: true, 
      id: compra.id, 
      nombre: compra.numero_comprobante || `#${compra.id}`,
      type: 'delete',
      title: 'Eliminar Compra',
      message: `¿Estás seguro de que deseas eliminar "${compra.numero_comprobante || `#${compra.id}`}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      danger: true
    });
  };

  const handleConfirmarClick = (compra) => {
    setConfirmDialog({
      visible: true,
      id: compra.id,
      nombre: compra.numero_comprobante || `#${compra.id}`,
      type: 'confirmar',
      title: 'Confirmar Compra',
      message: `¿Deseas confirmar la compra "${compra.numero_comprobante || `#${compra.id}`}"? Esto registrará el ingreso de los productos al stock actual.`,
      confirmText: 'Sí, confirmar',
      danger: false
    });
  };


  // === Modal cancelacion con razon ===
  const RAZON_OPCIONES_COMPRA = [
    { value: 'CONFUSION',       label: 'Confusion en el pedido' },
    { value: 'ARREPENTIMIENTO', label: 'Proveedor se arrepintio' },
    { value: 'SIN_STOCK',       label: 'Sin stock disponible' },
    { value: 'PRECIO',          label: 'Desacuerdo en el precio' },
    { value: 'DUPLICADO',       label: 'Registro duplicado' },
    { value: 'ERROR_SISTEMA',   label: 'Error del sistema' },
    { value: 'OTRO',            label: 'Otro motivo' },
  ];
  const [cancelModal, setCancelModal] = useState({ visible: false, id: null, razon_tag: '', razon_detalle: '', loading: false, error: '' });
  const openCancelModal  = (id) => setCancelModal({ visible: true, id, razon_tag: '', razon_detalle: '', loading: false, error: '' });
  const closeCancelModal = () => setCancelModal({ visible: false, id: null, razon_tag: '', razon_detalle: '', loading: false, error: '' });
  const submitCancelModal = async () => {
    if (!cancelModal.razon_tag) { setCancelModal(p => ({ ...p, error: 'Debes seleccionar una razon.' })); return; }
    setCancelModal(p => ({ ...p, loading: true, error: '' }));
    try {
      await comprasAPI.cancelar(cancelModal.id, { razon_tag: cancelModal.razon_tag, razon_detalle: cancelModal.razon_detalle });
      fetchCompras();
      closeCancelModal();
    } catch (err) {
      setCancelModal(p => ({ ...p, loading: false, error: err.response?.data?.error || 'Error al cancelar' }));
    }
  };
  // ===================================

  const handleCancelarClick = (compra) => openCancelModal(compra.id);

  const handleGeneralConfirm = async () => {
    const { id, type } = confirmDialog;
    try {
      if (type === 'delete') {
        await comprasAPI.delete(id);
      } else if (type === 'confirmar') {
        await comprasAPI.confirmar(id);
      } else if (type === 'cancelar') {
        await comprasAPI.cancelar(id);
      }
      fetchCompras();
      setConfirmDialog({ ...confirmDialog, visible: false });
    } catch (error) {
      console.error(`Error in ${type} operation:`, error);
      alert(`Error al procesar la solicitud: ${type}`);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await comprasAPI.delete(confirmDialog.id);
      setConfirmDialog({ visible: false, id: null, nombre: '' });
      fetchCompras();
    } catch (error) {
      console.error('Error deleting compra:', error);
      alert('Error al eliminar la compra.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['impuesto'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (parseFloat(value) || 0) : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const calcularTotal = () => {
    const subtotal = formData.detalle.reduce((sum, d) => {
      return sum + Number(d.subtotal || 0);
    }, 0);
    return Number(subtotal) + Number(formData.impuesto || 0);
  };

  const handleExportar = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await comprasAPI.exportar(params);
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compras_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar compras:', error);
      alert('Error al exportar datos de compras.');
    }
  };

  const handleExportHistorialIndividual = async () => {
    if (!selectedHistoryCompra) return;
    try {
      const response = await comprasAPI.exportarHistorialIndividual(selectedHistoryCompra.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_compra_${selectedHistoryCompra.numero_comprobante || selectedHistoryCompra.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar historial:', error);
      alert('Error al exportar el historial de compras.');
    }
  };

  const handleExportHistorialGlobal = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await comprasAPI.exportarHistorialGlobal(params);
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_global_compras_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar historial global:', error);
      alert('Error al exportar el historial global de compras.');
    }
  };

  const filteredCompras = compras.filter((c) => {
    const proveMatch = (c.proveedor_nombre || 'Sin proveedor').toLowerCase().includes(searchProveedor.toLowerCase());
    const compMatch = (c.numero_comprobante || '').toLowerCase().includes(searchComprobante.toLowerCase());
    const estadoMatch = filterEstado === 'ALL' ? true : c.estado === filterEstado;
    
    // Date range match
    let dateMatch = true;
    const purchaseDate = new Date(c.creado_en).toISOString().split('T')[0];
    
    if (filterFechaInicio && filterFechaFin) {
      dateMatch = purchaseDate >= filterFechaInicio && purchaseDate <= filterFechaFin;
    } else if (filterFechaInicio) {
      dateMatch = purchaseDate >= filterFechaInicio;
    } else if (filterFechaFin) {
      dateMatch = purchaseDate <= filterFechaFin;
    }
    
    return proveMatch && compMatch && estadoMatch && dateMatch;
  });

  // Pagination derived values
  const comprasTotalPages = Math.max(1, Math.ceil(filteredCompras.length / COMPRAS_PAGE_SIZE));
  const safeComprasPage = Math.min(comprasPage, comprasTotalPages);
  const paginatedCompras = filteredCompras.slice(
    (safeComprasPage - 1) * COMPRAS_PAGE_SIZE,
    safeComprasPage * COMPRAS_PAGE_SIZE
  );

  // Reset page on filter change
  const handleSearchProveedor = (val) => { setSearchProveedor(val); setComprasPage(1); };
  const handleSearchComprobante = (val) => { setSearchComprobante(val); setComprasPage(1); };
  const handleFilterFechaInicio = (val) => { setFilterFechaInicio(val); setComprasPage(1); };
  const handleFilterFechaFin = (val) => { setFilterFechaFin(val); setComprasPage(1); };
  const handleFilterEstado = (val) => { setFilterEstado(val); setComprasPage(1); };

  if (loading) {
    return <LoadingScreen message="OBTENIENDO COMPRAS..." />;
  }


  return (
    <>
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleGeneralConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, visible: false })}
        confirmText={confirmDialog.confirmText}
        danger={confirmDialog.danger}
      />



      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Proveedor</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar proveedor..." 
              value={searchProveedor}
              onChange={(e) => handleSearchProveedor(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Comprobante</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Nro comprobante..." 
              value={searchComprobante}
              onChange={(e) => handleSearchComprobante(e.target.value)}
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
          <div style={{ width: '180px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Estado</label>
            <select 
              className="form-input" 
              value={filterEstado}
              onChange={(e) => handleFilterEstado(e.target.value)}
            >
              <option value="ALL">TODOS</option>
              <option value="CONFIRMADA">CONFIRMADA</option>
              <option value="BORRADOR">BORRADOR</option>
              <option value="CANCELADA">CANCELADA</option>
            </select>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ height: '38px' }}
            onClick={() => {
              setSearchProveedor('');
              setSearchComprobante('');
              setFilterFechaInicio('');
              setFilterFechaFin('');
              setFilterEstado('ALL');
              setComprasPage(1);
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
                <th style={{ width: '100px' }}>Fecha</th>
                <th>Comprobante</th>
                <th>Proveedor</th>
                <th style={{ textAlign: 'center' }}>Productos</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Archivo</th>
                  <th>Estado</th>
                <th>Total</th>
                <th style={{ width: '100px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCompras.map((compra) => (
                <tr key={compra.id}>
                  <td>{new Date(compra.creado_en).toLocaleDateString()}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{compra.numero_comprobante || 'S/N'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      {compra.tipo_comprobante || 'Sin tipo'}
                    </div>
                  </td>
                  <td>
                    <div>{compra.proveedor_nombre || 'Proveedor General'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{compra.tipo_compra}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                      onClick={() => openDetailModal(compra)}
                      title="Ver Detalle de Productos"
                    >
                      <OrderedListOutlined />
                      <span>Ver Detalle</span>
                    </button>
                  </td>
                  <td>
                    {compra.comprobante_archivo ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <a 
                          href={compra.comprobante_archivo} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px' }}
                          title="Ver Comprobante"
                        >
                          <EyeOutlined />
                        </a>
                        <a 
                          href={compra.comprobante_archivo} 
                          download 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px' }}
                          title="Descargar Comprobante"
                        >
                          <DownloadOutlined />
                        </a>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>
                        Sin archivo
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      compra.estado === 'CONFIRMADA' ? 'badge-success' :
                      compra.estado === 'CANCELADA' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {compra.estado}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>S/. {Number(compra.total || 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-secondary" onClick={() => openModal('edit', compra)} title="Editar">
                        <EditOutlined />
                      </button>
                      <button className="btn btn-secondary" onClick={() => openHistoryModal(compra)} title="Historial/Kardex">
                        <HistoryOutlined />
                      </button>
                      {compra.estado === 'BORRADOR' && (
                        <button className="btn btn-success" onClick={() => handleConfirmarClick(compra)} title="Confirmar">
                          <CheckOutlined />
                        </button>
                      )}
                      {(compra.estado === 'BORRADOR' || compra.estado === 'CONFIRMADA') && (
                        <button className="btn btn-warning" onClick={() => handleCancelarClick(compra)} title="Cancelar">
                          <CloseOutlined />
                        </button>
                      )}
                      <button className="btn btn-danger" onClick={() => handleDeleteClick(compra)} title="Eliminar">
                        <DeleteOutlined />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCompras.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay compras registradas que coincidan con los filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={safeComprasPage}
          totalPages={comprasTotalPages}
          onPageChange={setComprasPage}
          pageSize={COMPRAS_PAGE_SIZE}
          totalItems={filteredCompras.length}
          itemName="compras"
        />
      </div>

      {modalVisible && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nueva Compra' : 'Editar Compra'}
              </h3>
              <button className="modal-close" onClick={closeModal}><CloseOutlined /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Proveedor</label>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                        onClick={() => {
                          const pg = proveedores.find(p => p.identificador === '00000000');
                          if (pg) {
                            setFormData(prev => ({
                              ...prev,
                              proveedor: String(pg.id),
                              proveedor_nombre: pg.nombre
                            }));
                            if (errors.proveedor) setErrors(prev => ({ ...prev, proveedor: null }));
                          } else {
                            alert('Proveedor General no encontrado. Asegúrate de haber ejecutado las migraciones.');
                          }
                        }}
                      >
                        Proveedor General
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <SearchableSelect
                        options={proveedores.map(p => ({
                          id: String(p.id),
                          nombre: p.nombre,
                          subtitle: `${p.identificador} ${!p.activo ? '(INACTIVO)' : ''}`,
                          disabled: !p.activo
                        }))}
                        value={formData.proveedor}
                        onChange={(val) => {
                          const prov = proveedores.find(p => String(p.id) === String(val));
                          setFormData(prev => ({
                            ...prev,
                            proveedor: val,
                            proveedor_nombre: prov ? prov.nombre : ''
                          }));
                        }}
                        placeholder="Buscar proveedor..."
                        onActionClick={() => openNestedModal('proveedor')}
                        actionLabel="Crear Nuevo Proveedor"
                        error={errors.proveedor}
                      />
                      {formData.proveedor && !proveedores.find(p => String(p.id) === String(formData.proveedor))?.activo && (
                        <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>
                          ⚠️ Este proveedor no está activo y no se puede usar para nuevas compras.
                        </div>
                      )}
                      {/* Alias input for Proveedor General */}
                      {formData.proveedor_nombre === 'Proveedor General' && (
                        <div style={{ marginTop: '8px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            Alias <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Nombre, Apellidos o Tienda — opcional)</span>
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: Juan Pérez o Tienda Martínez"
                            value={proveedorAlias}
                            onChange={(e) => setProveedorAlias(e.target.value)}
                            style={{ borderColor: 'var(--accent, #1677ff)', transition: 'border-color 0.2s' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Compra</label>
                    <select name="tipo_compra" className="form-input" value={formData.tipo_compra} onChange={handleChange}>
                      <option value="PROVEEDOR">Compra a Proveedor</option>
                      <option value="MINORISTA">Compra al por menor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Nro Comprobante
                      {modalMode === 'create' && <span style={{ fontSize: '10px', background: 'var(--color-primary)', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>SUGERIDO</span>}
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" name="numero_comprobante" className="form-input" value={formData.numero_comprobante} onChange={handleChange} onFocus={(e) => e.target.select()} style={{ flex: 1 }} />
                      {modalMode === 'create' && (
                        <button type="button" title="Regenerar número" onClick={() => setFormData(p => ({ ...p, numero_comprobante: generateComprobanteCompra(compras) }))}
                          style={{ padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '16px' }}>🔄</button>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo Comprobante</label>
                    <select name="tipo_comprobante" className="form-input" value={formData.tipo_comprobante} onChange={handleChange}>
                      <option value="">Ninguno</option>
                      <option value="FACTURA">Factura</option>
                      <option value="BOLETA">Boleta</option>
                      <option value="TICKET">Ticket</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select name="estado" className="form-input" value={formData.estado} onChange={handleChange}>
                      <option value="BORRADOR">Borrador</option>
                      <option value="CONFIRMADA">Confirmada (Registra Stock)</option>
                      <option value="CANCELADA">Cancelada (Revierte Stock si aplica)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Productos {errors.detalle && <span style={{ color: '#ff4d4f', fontWeight: 400, marginLeft: 8 }}>{errors.detalle}</span>}
                  </label>

                  {formData.detalle.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontWeight: 600, fontSize: '11px', color: '#666', paddingRight: '44px' }}>
                      <div style={{ flex: '1.5', minWidth: 0 }}>Producto</div>
                      <div style={{ width: '70px' }}>Cant.</div>
                      <div style={{ width: '110px' }}>P. Compra (fijo)</div>
                      <div style={{ width: '90px' }}>Descuento</div>
                      <div style={{ width: '100px' }}>Subtotal</div>
                    </div>
                  )}

                  {formData.detalle.map((item, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ flex: '1.5', minWidth: 0 }}>
                          <SearchableSelect
                            options={productos.map(p => ({
                              id: String(p.id),
                              nombre: p.nombre,
                              subtitle: p.codigo,
                              disabled: !p.activo
                            }))}
                            value={item.producto}
                            onChange={(val) => updateDetalle(index, 'producto', val)}
                            placeholder="Buscar producto..."
                            onActionClick={() => {
                              setNestedModalIndex(index);
                              setProductModalVisible(true);
                            }}
                            actionLabel="Nuevo Producto"
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
                          style={{ width: '70px', fontSize: '13px' }}
                          min="0.01"
                          step="0.01"
                        />
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Precio"
                          value={item.precio_compra}
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
                          style={{ width: '90px' }}
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
                        <button type="button" className="btn btn-danger" onClick={() => removeDetalle(index)} style={{ flexShrink: 0, padding: '4px 8px' }}>
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

                <div className="grid grid-2">
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
                
                <div className="form-group">
                  <label className="form-label">Comprobante de Pago (Archivo)</label>
                  <input type="file" name="comprobante_archivo" className="form-input" accept="image/*,.pdf" onChange={(e) => {
                    if (e.target.files.length > 0) {
                      setFormData(prev => ({ ...prev, comprobante_archivo: e.target.files[0] }));
                    }
                  }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Crear Compra' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ProveedorFormModal
        visible={proveedorModalVisible}
        mode="create"
        onClose={() => setProveedorModalVisible(false)}
        onSave={(newProv) => {
          setPendingSelection({ type: 'proveedor', id: newProv.id, nombre: newProv.nombre });
          setProveedores(prev => {
            if (prev.find(p => p.id === newProv.id)) return prev;
            return [...prev, newProv];
          });
          fetchProveedores();
          setProveedorModalVisible(false);
        }}
      />

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

      {/* Modales Modulares */}
      <CompraDetailModal 
        visible={detailModalVisible}
        compra={selectedCompraForDetail}
        onClose={closeDetailModal}
      />

      <CompraHistoryModal 
        visible={historyModalVisible}
        compra={selectedHistoryCompra}
        onClose={closeHistoryModal}
        onFetchHistory={fetchHistoryEstados}
        onFetchKardex={fetchHistoryProductos}
        historyData={historyEstados}
        kardexData={historyProductos}
        loading={loadingHistory}
        currentPage={historyPage}
        totalPages={historyTotalPages}
        totalItems={historyTotal}
      />

      <GlobalKardexModal 
        visible={globalKardexVisible}
        onClose={() => setGlobalKardexVisible(false)}
        onFetchKardex={openGlobalKardex}
        kardexData={globalKardexData}
        loading={loadingGlobalKardex}
        currentPage={globalKardexPage}
        totalPages={globalKardexTotalPages}
        totalItems={globalKardexTotal}
      />
    </div>
    {/* Modal Cancelacion con Razon */}
    {cancelModal.visible && (
      <div className="modal-overlay" onClick={closeCancelModal}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
          <div className="modal-header">
            <h3 className="modal-title">Cancelar Compra</h3>
            <button className="modal-close" onClick={closeCancelModal}><CloseOutlined /></button>
          </div>
          <div className="modal-body">
            <div className="cancel-reason-options">
              {RAZON_OPCIONES_COMPRA.map(op => (
                <label key={op.value} className={`cancel-reason-option ${cancelModal.razon_tag === op.value ? 'selected' : ''}`}>
                  <input type="radio" name="razon_compra" value={op.value}
                    checked={cancelModal.razon_tag === op.value}
                    onChange={() => setCancelModal(p => ({ ...p, razon_tag: op.value }))}
                  />
                  <span style={{ fontSize: 13 }}>{op.label}</span>
                </label>
              ))}
            </div>
            {cancelModal.error && (
              <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{cancelModal.error}</p>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={closeCancelModal} disabled={cancelModal.loading}>Volver</button>
            <button className="btn btn-danger" onClick={submitCancelModal} disabled={cancelModal.loading}>
              {cancelModal.loading ? 'Cancelando...' : 'Confirmar Cancelacion'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default Compras;