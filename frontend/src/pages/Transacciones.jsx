import { useState, useEffect } from 'react';
import { transaccionesAPI } from '../services/api';
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined, EditOutlined, DeleteOutlined, SettingOutlined, HistoryOutlined } from '@ant-design/icons';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDropdown from '../components/ExportDropdown';
import CategoryManagerModal from '../components/transacciones/CategoryManagerModal';
import LoadingScreen from '../components/LoadingScreen';
import { message } from 'antd';

function Transacciones() {
  const [loading, setLoading] = useState(true);
  const [transacciones, setTransacciones] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedTransaccion, setSelectedTransaccion] = useState(null);
  const [activeTab, setActiveTab] = useState('INGRESO');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('ALL');

  const [confirmDialog, setConfirmDialog] = useState({ visible: false, id: null, nombre: '' });
  const [confirmCatDialog, setConfirmCatDialog] = useState({ visible: false, id: null, nombre: '' });
  const [categorias, setCategorias] = useState([]);

  // Category Management Modal
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catModalMode, setCatModalMode] = useState('create');
  const [editingCatId, setEditingCatId] = useState(null);
  const [catFormData, setCatFormData] = useState({ nombre: '', tipo: 'INGRESO', descripcion: '', activo: true });
  const [catPage, setCatPage] = useState(1);

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

  // Kardex State
  const [kardexVisible, setKardexVisible] = useState(false);
  const [selectedCatKardex, setSelectedCatKardex] = useState(null);
  const [kardexData, setKardexData] = useState([]);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [kardexPage, setKardexPage] = useState(1);
  const [kardexTotalPages, setKardexTotalPages] = useState(1);
  const [kardexTotal, setKardexTotal] = useState(0);
  const [kardexFechaDesde, setKardexFechaDesde] = useState('');
  const [kardexFechaHasta, setKardexFechaHasta] = useState('');

  // Individual Transaction Audit State
  const [auditVisible, setAuditVisible] = useState(false);
  const [selectedTransAudit, setSelectedTransAudit] = useState(null);
  const [auditData, setAuditData] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFechaDesde, setAuditFechaDesde] = useState('');
  const [auditFechaHasta, setAuditFechaHasta] = useState('');

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
      const fetchedCats = response.data.results || response.data;
      // Sort alphabetically by name
      const sorted = [...fetchedCats].sort((a, b) => 
        (a.nombre || '').localeCompare(b.nombre || '')
      );
      setCategorias(sorted);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  // â”€â”€ Category CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const resetCatForm = () => {
    setCatFormData({ nombre: '', tipo: activeTab, descripcion: '', activo: true });
    setCatModalMode('create');
    setEditingCatId(null);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catFormData.nombre) {
      message.error('El nombre de la categoría es obligatorio');
      return;
    }
    try {
      if (catModalMode === 'create') {
        await transaccionesAPI.createCategoria({ ...catFormData, tipo: activeTab });
        message.success('Categoría creada con éxito');
      } else {
        await transaccionesAPI.updateCategoria(editingCatId, catFormData);
        message.success('Categoría actualizada con éxito');
      }
      fetchCategorias();
      resetCatForm();
    } catch (error) {
      console.error('Error saving categoria:', error);
      message.error('Error al guardar la categoría');
    }
  };

  const handleEditCat = (cat) => {
    setCatModalMode('edit');
    setEditingCatId(cat.id);
    setCatFormData({ 
      nombre: cat.nombre, 
      tipo: cat.tipo, 
      descripcion: cat.descripcion || '',
      activo: cat.activo !== undefined ? cat.activo : true 
    });
  };

  const handleToggleCatActive = async (cat) => {
    try {
      const nuevoEstado = !cat.activo;
      await transaccionesAPI.updateCategoria(cat.id, { activo: nuevoEstado });
      message.success(`Categoría ${nuevoEstado ? 'activada' : 'desactivada'} con éxito`);
      fetchCategorias();
    } catch (error) {
      message.error('Error al cambiar el estado de la categoría');
    }
  };

  const handleDeleteCat = (cat) => {
    setConfirmCatDialog({ visible: true, id: cat.id, nombre: cat.nombre });
  };

  const handleDeleteCatConfirm = async () => {
    if (!confirmCatDialog.id) return;
    try {
      await transaccionesAPI.deleteCategoria(confirmCatDialog.id);
      message.success('Categoría eliminada con éxito');
      fetchCategorias();
      setConfirmCatDialog({ visible: false, id: null, nombre: '' });
    } catch (error) {
      console.error('Error deleting category:', error);
      const isConstraintError = error.response?.status === 400 || error.response?.data?.detail?.includes('asociados');
      if (isConstraintError) {
        message.warning('No se puede eliminar: esta categoría tiene movimientos asociados. Te recomendamos desactivarla en su lugar.');
      } else {
        message.error('Error al eliminar categoría.');
      }
      setConfirmCatDialog({ visible: false, id: null, nombre: '' });
    }
  };

  // â”€â”€ Kardex Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchKardex = async (catId, page = 1, desde = '', hasta = '') => {
    setKardexLoading(true);
    try {
      const params = { page };
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
      
      const response = await transaccionesAPI.getCategoriaHistorial(catId, params);
      setKardexData(response.data.results || response.data);
      setKardexTotal(response.data.count || (response.data.results ? response.data.results.length : response.data.length));
      setKardexTotalPages(Math.ceil((response.data.count || 1) / 10)); // Assuming 10 per page in backend default pagination
      setKardexPage(page);
    } catch (error) {
      console.error('Error fetching kardex:', error);
      message.error('Error al cargar el historial.');
    } finally {
      setKardexLoading(false);
    }
  };

  const handleKardexExport = async () => {
    if (!selectedCatKardex) return;
    try {
      const params = {};
      if (kardexFechaDesde) params.fecha_desde = kardexFechaDesde;
      if (kardexFechaHasta) params.fecha_hasta = kardexFechaHasta;
      
      const response = await transaccionesAPI.exportarCategoriaHistorial(selectedCatKardex.id, params);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_${selectedCatKardex.nombre.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Historial exportado con éxito');
    } catch (error) {
      console.error('Error exporting kardex:', error);
      message.error('Error al exportar el historial.');
    }
  };

  const openKardex = (cat) => {
    setSelectedCatKardex(cat);
    setKardexVisible(true);
    setKardexFechaDesde('');
    setKardexFechaHasta('');
    fetchKardex(cat.id, 1, '', '');
  };

  const closeKardex = () => {
    setKardexVisible(false);
    setSelectedCatKardex(null);
    setKardexData([]);
  };

  // â”€â”€ Transaction Audit Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchAudit = async (id, page = 1, desde = '', hasta = '') => {
    setAuditLoading(true);
    try {
      const params = { page };
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
      const response = await transaccionesAPI.getHistorial(id, params);
      const data = response.data;
      setAuditData(data.results || data);
      const count = data.count || (data.results ? data.results.length : data.length);
      setAuditTotal(count);
      setAuditTotalPages(Math.ceil(count / 10));
      setAuditPage(page);
    } catch (error) {
      console.error('Error fetching audit:', error);
      message.error('Error al cargar el historial del registro.');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAuditExport = async () => {
    if (!selectedTransAudit) return;
    try {
      const params = {};
      if (auditFechaDesde) params.fecha_desde = auditFechaDesde;
      if (auditFechaHasta) params.fecha_hasta = auditFechaHasta;
      const response = await transaccionesAPI.exportarHistorial(selectedTransAudit.id, params);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_transaccion_${selectedTransAudit.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Historial exportado con éxito');
    } catch (error) {
      console.error('Error exporting audit:', error);
      message.error('Error al exportar el historial.');
    }
  };

  const openAudit = (trans) => {
    setSelectedTransAudit(trans);
    setAuditVisible(true);
    setAuditFechaDesde('');
    setAuditFechaHasta('');
    setAuditPage(1);
    fetchAudit(trans.id, 1, '', '');
  };

  const closeAudit = () => {
    setAuditVisible(false);
    setSelectedTransAudit(null);
    setAuditData([]);
    setAuditPage(1);
    setAuditFechaDesde('');
    setAuditFechaHasta('');
  };

  // â”€â”€ Movement CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openModal = (mode, transaccion = null) => {
    setModalMode(mode);
    if (transaccion) {
      setSelectedTransaccion(transaccion);
      setFormData({
        categoria: transaccion.categoria || '',
        tipo: transaccion.tipo || activeTab,
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
        tipo: activeTab,
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
    if (!formData.categoria) {
      message.error('Debes seleccionar un nombre/categoría para el movimiento.');
      return;
    }
    if (Number(formData.monto || 0) <= 0) {
      message.error('El monto debe ser mayor a S/. 0.00');
      return;
    }
    try {
      const submitData = {
        ...formData,
        categoria: formData.categoria || null,
        monto: Number(formData.monto || 0),
      };
      if (modalMode === 'create') {
        await transaccionesAPI.create(submitData);
      } else {
        await transaccionesAPI.update(selectedTransaccion.id, submitData);
      }
      closeModal();
      fetchTransacciones();
      fetchResumen();
      message.success(`Movimiento ${modalMode === 'create' ? 'registrado' : 'actualizado'} con éxito`);
    } catch (error) {
      console.error('Error saving movimiento:', error);
      const errData = error.response?.data;
      const msg = typeof errData === 'string' ? errData
        : errData?.detail || errData?.message
        || JSON.stringify(errData) || 'Error al guardar';
      message.error(msg);
    }
  };

  const handleDeleteClick = (transaccion) => {
    setConfirmDialog({
      visible: true,
      id: transaccion.id,
      nombre: transaccion.categoria_nombre || transaccion.descripcion || 'este movimiento',
    });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDialog.id) return;
    try {
      await transaccionesAPI.delete(confirmDialog.id);
      fetchTransacciones();
      fetchResumen();
      message.success('Movimiento eliminado correctamente');
      setConfirmDialog({ visible: false, id: null, nombre: '' });
    } catch (error) {
      console.error('Error deleting transaccion:', error);
      message.error('Error al eliminar');
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
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `movimientos_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar movimientos:', error);
      message.error('Error al exportar datos.');
    }
  };

  const handleExportarHistorialGlobal = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await transaccionesAPI.exportarHistorialGlobal(params);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historial_global_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al exportar historial global:', error);
      message.error('Error al exportar historial global.');
    }
  };

  // â”€â”€ Tab change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setTransaccionesPage(1);
    setFilterCategoria('ALL');
    setSearchTerm('');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterFechaInicio('');
    setFilterFechaFin('');
    setFilterCategoria('ALL');
    setTransaccionesPage(1);
  };

  // â”€â”€ Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filterList = (tipo) => transacciones.filter(t => {
    if (t.tipo !== tipo) return false;
    const term = searchTerm.toLowerCase();
    const searchMatch = (t.categoria_nombre || '').toLowerCase().includes(term);
    const catMatch = filterCategoria === 'ALL' ? true : String(t.categoria) === filterCategoria;
    const transDate = new Date(t.fecha).toISOString().split('T')[0];
    if (filterFechaInicio && transDate < filterFechaInicio) return false;
    if (filterFechaFin && transDate > filterFechaFin) return false;
    return searchMatch && catMatch;
  });

  const filteredIngresos = filterList('INGRESO');
  const filteredEgresos = filterList('EGRESO');
  const activeList = activeTab === 'INGRESO' ? filteredIngresos : filteredEgresos;
  const categoriasActivas = categorias.filter(c => c.tipo === activeTab);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(activeList.length / TRANSACCIONES_PAGE_SIZE));
  const safePage = Math.min(transaccionesPage, totalPages);
  const paginatedTransacciones = activeList.slice(
    (safePage - 1) * TRANSACCIONES_PAGE_SIZE,
    safePage * TRANSACCIONES_PAGE_SIZE
  );

  // â”€â”€ Filtered Totals for Resumen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isFiltered = searchTerm !== '' || filterFechaInicio !== '' || filterFechaFin !== '' || filterCategoria !== 'ALL';
  
  const totalIngresosPeriodo = filteredIngresos.reduce((sum, t) => sum + Number(t.monto || 0), 0);
  const totalEgresosPeriodo = filteredEgresos.reduce((sum, t) => sum + Number(t.monto || 0), 0);
  const balancePeriodo = totalIngresosPeriodo - totalEgresosPeriodo;

  // Category modal pagination
  const CAT_PAGE_SIZE = 5;
  const catsTotales = categorias.filter(c => c.tipo === activeTab);
  const catTotalPages = Math.max(1, Math.ceil(catsTotales.length / CAT_PAGE_SIZE));
  const safeCatPage = Math.min(catPage, catTotalPages);
  const paginatedCats = catsTotales.slice(
    (safeCatPage - 1) * CAT_PAGE_SIZE,
    safeCatPage * CAT_PAGE_SIZE
  );

  return (
    <div>
      <ConfirmDialog
        visible={confirmDialog.visible}
        onCancel={() => setConfirmDialog({ visible: false, id: null, nombre: '' })}
        onConfirm={handleDeleteConfirm}
        title={`Eliminar ${activeTab === 'INGRESO' ? 'Ingreso' : 'Gasto'}`}
        message={`¿Estás seguro de que deseas eliminar "${confirmDialog.nombre}"? Esta acción no se puede deshacer y afectará el balance.`}
        danger={true}
      />

      <ConfirmDialog 
        visible={confirmCatDialog.visible}
        onCancel={() => setConfirmCatDialog({ visible: false, id: null, nombre: '' })}
        onConfirm={handleDeleteCatConfirm}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${confirmCatDialog.nombre}"? Los movimientos que usen esta categoría perderán su referencia, pero no serán eliminados.`}
        confirmText="Sí, eliminar categoría"
        danger={true}
      />

      {/* â”€â”€ Page Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Caja Externa / No Operativos</h1>
          <p className="page-subtitle">Ingresos no operativos y gastos del negocio</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportDropdown onExport={handleExportarHistorialGlobal} label="Exportar Historial Global" />
          <ExportDropdown onExport={handleExportar} label="Exportar Movimientos" />
          <button
            className="btn btn-secondary"
            onClick={() => { setCatPage(1); resetCatForm(); setCatModalVisible(true); }}
          >
            <SettingOutlined /> Gestionar Categorías
          </button>
          <button className="btn btn-primary" onClick={() => openModal('create')}>
            <PlusOutlined /> {activeTab === 'INGRESO' ? 'Nuevo Ingreso' : 'Nuevo Gasto'}
          </button>
        </div>
      </div>

      {/* â”€â”€ Summary Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {resumen && (
        <div className="grid grid-3" style={{ marginBottom: '24px' }}>
          <div className="stat-card green">
            <div className="stat-label">
              <ArrowUpOutlined /> {isFiltered ? 'Ingresos (Periodo)' : 'Ingresos Totales'}
            </div>
            <div className="stat-value">
              S/. {Number(isFiltered ? totalIngresosPeriodo : (resumen.total_ingresos || 0)).toFixed(2)}
            </div>
            {!isFiltered && (
              <div className="stat-label">Este mes: S/. {Number(resumen.ingresos_mes || 0).toFixed(2)}</div>
            )}
            {isFiltered && (
              <div className="stat-label" style={{ opacity: 0.8, fontSize: '11px' }}>Filtros activos</div>
            )}
          </div>
          <div className="stat-card orange">
            <div className="stat-label">
              <ArrowDownOutlined /> {isFiltered ? 'Gastos (Periodo)' : 'Gastos Totales'}
            </div>
            <div className="stat-value">
              S/. {Number(isFiltered ? totalEgresosPeriodo : (resumen.total_egresos || 0)).toFixed(2)}
            </div>
            {!isFiltered && (
              <div className="stat-label">Este mes: S/. {Number(resumen.egresos_mes || 0).toFixed(2)}</div>
            )}
            {isFiltered && (
              <div className="stat-label" style={{ opacity: 0.8, fontSize: '11px' }}>Filtros activos</div>
            )}
          </div>
          <div className={`stat-card ${((isFiltered ? balancePeriodo : (resumen.balance || 0))) >= 0 ? '' : 'blue'}`}>
            <div className="stat-label">
              {isFiltered ? 'Balance (Periodo)' : 'Balance Global'}
            </div>
            <div className="stat-value">
              S/. {Number(isFiltered ? balancePeriodo : (resumen.balance || 0)).toFixed(2)}
            </div>
            {!isFiltered && (
              <div className="stat-label">Este mes: S/. {Number(resumen.balance_mes || 0).toFixed(2)}</div>
            )}
            {isFiltered && (
              <div className="stat-label" style={{ opacity: 0.8, fontSize: '11px' }}>Filtros activos</div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="card" style={{ marginBottom: '24px', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color, #eee)' }}>
          <button
            style={{
              flex: 1, padding: '16px', fontSize: '15px', fontWeight: activeTab === 'INGRESO' ? 'bold' : 'normal',
              background: activeTab === 'INGRESO' ? 'var(--bg-card, #fff)' : 'var(--bg-secondary, #fafafa)',
              border: 'none', borderBottom: activeTab === 'INGRESO' ? '2px solid #52c41a' : '2px solid transparent',
              color: activeTab === 'INGRESO' ? '#52c41a' : 'var(--text-secondary, #666)',
              cursor: 'pointer', transition: 'all 0.3s',
            }}
            onClick={() => handleTabChange('INGRESO')}
          >
            <ArrowUpOutlined /> Ingresos No Operativos
            <span style={{ marginLeft: '8px', fontSize: '12px', background: activeTab === 'INGRESO' ? '#f6ffed' : '#f0f0f0', color: activeTab === 'INGRESO' ? '#52c41a' : '#888', borderRadius: '10px', padding: '1px 8px' }}>
              {filteredIngresos.length}
            </span>
          </button>
          <button
            style={{
              flex: 1, padding: '16px', fontSize: '15px', fontWeight: activeTab === 'EGRESO' ? 'bold' : 'normal',
              background: activeTab === 'EGRESO' ? 'var(--bg-card, #fff)' : 'var(--bg-secondary, #fafafa)',
              border: 'none', borderBottom: activeTab === 'EGRESO' ? '2px solid #ff4d4f' : '2px solid transparent',
              color: activeTab === 'EGRESO' ? '#ff4d4f' : 'var(--text-secondary, #666)',
              cursor: 'pointer', transition: 'all 0.3s',
            }}
            onClick={() => handleTabChange('EGRESO')}
          >
            <ArrowDownOutlined /> Gastos
            <span style={{ marginLeft: '8px', fontSize: '12px', background: activeTab === 'EGRESO' ? '#fff1f0' : '#f0f0f0', color: activeTab === 'EGRESO' ? '#ff4d4f' : '#888', borderRadius: '10px', padding: '1px 8px' }}>
              {filteredEgresos.length}
            </span>
          </button>
        </div>
      </div>

      {/* â”€â”€ Filter Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>
              {activeTab === 'INGRESO' ? 'Nombre del Ingreso' : 'Nombre del Gasto'}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={activeTab === 'INGRESO' ? 'Buscar por nombre de ingreso...' : 'Buscar por nombre de gasto...'}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setTransaccionesPage(1); }}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Desde</label>
            <input
              type="date"
              className="form-input"
              value={filterFechaInicio}
              onChange={(e) => { setFilterFechaInicio(e.target.value); setTransaccionesPage(1); }}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Hasta</label>
            <input
              type="date"
              className="form-input"
              value={filterFechaFin}
              onChange={(e) => { setFilterFechaFin(e.target.value); setTransaccionesPage(1); }}
            />
          </div>
          <div style={{ width: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Categoría</label>
            <select
              className="form-input"
              value={filterCategoria}
              onChange={(e) => { setFilterCategoria(e.target.value); setTransaccionesPage(1); }}
            >
              <option value="ALL">Todas las categorías</option>
              {categoriasActivas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-secondary"
            style={{ height: '38px' }}
            onClick={clearFilters}
            title="Limpiar filtros"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha de Creación</th>
                <th>{activeTab === 'INGRESO' ? 'Nombre del Ingreso' : 'Nombre del Gasto'}</th>
                <th>Descripción</th>
                <th>Método de Pago</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransacciones.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>#{t.id}</td>
                  <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {t.creado_en ? new Date(t.creado_en).toLocaleString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date(t.fecha).toLocaleDateString()}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: t.tipo === 'INGRESO' ? '#52c41a' : '#ff4d4f' }}>
                      {t.categoria_nombre || '"”'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {t.descripcion || '"”'}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px' }}>{t.metodo_pago}</span>
                  </td>
                  <td style={{ fontWeight: 'bold', textAlign: 'right', color: t.tipo === 'INGRESO' ? '#52c41a' : '#ff4d4f' }}>
                    {t.tipo === 'INGRESO' ? '+' : '-'}S/. {Number(t.monto || 0).toFixed(2)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ marginRight: '4px' }}
                        onClick={() => openAudit(t)}
                        title="Ver Historial"
                      >
                        <HistoryOutlined />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openModal('edit', t)}
                        title="Editar"
                      >
                        <EditOutlined />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteClick(t)}
                        title="Eliminar"
                      >
                        <DeleteOutlined />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {activeList.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#aaa', padding: '40px' }}>
                    No hay {activeTab === 'INGRESO' ? 'ingresos no operativos' : 'gastos'} registrados que coincidan con los filtros.
                    {categorias.filter(c => c.tipo === activeTab).length === 0 && (
                      <div style={{ marginTop: '12px', fontSize: '13px' }}>
                        ðŸ’¡ Primero crea una categoría haciendo clic en <strong>"Gestionar Categorías"</strong>.
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setTransaccionesPage}
          pageSize={TRANSACCIONES_PAGE_SIZE}
          totalItems={activeList.length}
          itemName={activeTab === 'INGRESO' ? 'ingresos' : 'gastos'}
        />
      </div>

      {/* â”€â”€ Movement Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {modalVisible && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create'
                  ? (activeTab === 'INGRESO' ? 'Registrar Nuevo Ingreso' : 'Registrar Nuevo Gasto')
                  : (formData.tipo === 'INGRESO' ? 'Editar Ingreso' : 'Editar Gasto')}
              </h3>
              <button className="modal-close" onClick={closeModal}>Ã—</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                {/* Category selector */}
                <div className="form-group">
                  <label className="form-label">
                    {formData.tipo === 'INGRESO' ? 'Nombre del Ingreso *' : 'Nombre del Gasto *'}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      name="categoria"
                      className="form-input"
                      value={formData.categoria}
                      onChange={handleChange}
                      required
                      style={{ flex: 1 }}
                    >
                      <option value="">Seleccionar nombre...</option>
                      {categorias
                        .filter(c => c.tipo === formData.tipo && c.activo !== false)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { resetCatForm(); setCatFormData(prev => ({ ...prev, tipo: formData.tipo })); setCatPage(1); setCatModalVisible(true); }}
                      style={{ height: '42px', padding: '0 12px', whiteSpace: 'nowrap' }}
                      title="Gestionar Categorías"
                    >
                      <SettingOutlined />
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Si no encuentras el nombre que buscas, haz clic en <SettingOutlined /> para crearlo.
                  </div>
                </div>

                {/* Description (optional) */}
                <div className="form-group">
                  <label className="form-label">
                    Descripción{' '}
                    <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)' }}>(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    name="descripcion"
                    className="form-input"
                    value={formData.descripcion}
                    onChange={handleChange}
                    onFocus={(e) => e.target.select()}
                    placeholder={formData.tipo === 'INGRESO' ? 'Ej: Propina de cliente satisfecho...' : 'Ej: Factura N° 001-0045...'}
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
                      placeholder="Nro de operación (opcional)"
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
                    placeholder="Notas adicionales (opcional)..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create'
                    ? (formData.tipo === 'INGRESO' ? 'Registrar Ingreso' : 'Registrar Gasto')
                    : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ Category Management Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {catModalVisible && (
        <div className="modal-overlay" onClick={() => { setCatModalVisible(false); resetCatForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Gestionar Categorías "” {activeTab === 'INGRESO' ? 'Ingresos No Operativos' : 'Gastos'}
              </h3>
              <button className="modal-close" onClick={() => { setCatModalVisible(false); resetCatForm(); }}>Ã—</button>
            </div>
            <div className="modal-body">
              {/* Form */}
              <form
                onSubmit={handleCatSubmit}
                style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              >
                <h4 style={{ marginBottom: '12px' }}>
                  {catModalMode === 'create'
                    ? (activeTab === 'INGRESO' ? 'Nueva Categoría de Ingreso' : 'Nueva Categoría de Gasto')
                    : 'Editar Categoría'}
                </h4>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={catFormData.nombre}
                    onChange={(e) => setCatFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder={
                      activeTab === 'INGRESO'
                        ? 'Ej: Propina, Apoyo familiar, Ingreso extraordinario...'
                        : 'Ej: Pago de luz, Pago de agua, Alquiler, Internet...'
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input 
                      type="checkbox" 
                      checked={catFormData.activo} 
                      onChange={(e) => setCatFormData(prev => ({ ...prev, activo: e.target.checked }))} 
                    />
                    Esta categoría está activa (disponible para nuevos registros)
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Descripción{' '}
                    <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)' }}>(Opcional)</span>
                  </label>
                  <textarea
                    className="form-input"
                    value={catFormData.descripcion}
                    onChange={(e) => setCatFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Descripción adicional de esta categoría..."
                    rows={2}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {catModalMode === 'edit' && (
                    <button type="button" className="btn btn-secondary" onClick={resetCatForm}>
                      Cancelar Edición
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary">
                    {catModalMode === 'create' ? 'Crear Categoría' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>

              {/* List */}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Estado</th>
                      <th>Uso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCats.map(cat => (
                      <tr key={cat.id} style={{ opacity: cat.activo ? 1 : 0.6 }}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{cat.nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cat.descripcion || ''}</div>
                        </td>
                        <td>
                          <span 
                            onClick={() => handleToggleCatActive(cat)}
                            style={{ 
                              cursor: 'pointer',
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: 600,
                              background: cat.activo ? '#f6ffed' : '#fff1f0',
                              color: cat.activo ? '#52c41a' : '#ff4d4f',
                              border: `1px solid ${cat.activo ? '#b7eb8f' : '#ffa39e'}`
                            }}
                          >
                            {cat.activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                           {cat.transacciones_count || 0} mov.
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              className="btn btn-info" 
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => openKardex(cat)}
                              title="Ver Historial (Kardex)"
                            >
                              <HistoryOutlined />
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleEditCat(cat)}
                              style={{ padding: '4px 8px' }}
                              title="Editar"
                            >
                              <EditOutlined style={{ fontSize: '14px' }} />
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDeleteCat(cat)}
                              style={{ padding: '4px 8px', opacity: (cat.transacciones_count > 0) ? 0.5 : 1 }}
                              title={(cat.transacciones_count > 0) ? "No se puede eliminar (tiene movimientos)" : "Eliminar"}
                              disabled={cat.transacciones_count > 0}
                            >
                              <DeleteOutlined style={{ fontSize: '14px' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {catsTotales.length === 0 && (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
                          No hay categorías de {activeTab === 'INGRESO' ? 'ingresos' : 'gastos'} creadas aún.
                          <br />
                          <span style={{ fontSize: '12px' }}>Usa el formulario de arriba para crear la primera.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for categories */}
              {catTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '16px', fontSize: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px' }}
                    onClick={() => setCatPage(prev => Math.max(1, prev - 1))}
                    disabled={safeCatPage === 1}
                  >
                    Anterior
                  </button>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Pág {safeCatPage} de {catTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px' }}
                    onClick={() => setCatPage(prev => Math.min(catTotalPages, prev + 1))}
                    disabled={safeCatPage === catTotalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setCatModalVisible(false); resetCatForm(); }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* â”€â”€ Kardex Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {kardexVisible && selectedCatKardex && (
        <div className="modal-overlay" onClick={closeKardex}>
          <div className="modal" style={{ maxWidth: '1080px', width: '95vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Historial: {selectedCatKardex.nombre} ({selectedCatKardex.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto'})
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={handleKardexExport} style={{ padding: '4px 12px', fontSize: '12px' }}>
                  Exportar Excel
                </button>
                <button className="modal-close" onClick={closeKardex}>x</button>
              </div>
            </div>

            {/* Date filter bar */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Desde</label>
                <input
                  type="date"
                  value={kardexFechaDesde}
                  onChange={(e) => setKardexFechaDesde(e.target.value)}
                  className="form-input"
                  style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Hasta</label>
                <input
                  type="date"
                  value={kardexFechaHasta}
                  onChange={(e) => setKardexFechaHasta(e.target.value)}
                  className="form-input"
                  style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
                />
              </div>
              <button className="btn btn-primary" onClick={() => fetchKardex(selectedCatKardex.id, 1, kardexFechaDesde, kardexFechaHasta)} style={{ padding: '5px 14px', fontSize: '13px' }}>
                Filtrar
              </button>
              <button className="btn btn-secondary" onClick={() => { setKardexFechaDesde(''); setKardexFechaHasta(''); fetchKardex(selectedCatKardex.id, 1, '', ''); }} style={{ padding: '5px 14px', fontSize: '13px' }}>
                Limpiar
              </button>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                {kardexTotal} registro{kardexTotal !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table "” 9 columnas estándar */}
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '50vh' }}>
              {kardexLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Cargando historial...</div>
              ) : kardexData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No hay movimientos para esta categoría/período.
                </div>
              ) : (
                <table style={{ minWidth: '1000px', width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>Fecha y Hora</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Categoría</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>Tipo de Evento</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Campo</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>V. Anterior (S/.)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>V. Nuevo (S/.)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Descripción</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Notas</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexData.map((mov) => {
                      const dateObj = new Date(mov.fecha);
                      const dt = dateObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const tipoEvento = mov.tipo_movimiento || 'EDICION';
                      const colorTipo = tipoEvento === 'TRANSACCION' ? '#1890ff'
                        : tipoEvento === 'ESTADO' ? '#fa8c16'
                        : tipoEvento === 'CREACION' ? '#52c41a'
                        : '#722ed1';
                      return (
                        <tr key={mov.id} style={{ borderBottom: '1px solid var(--border-color, #f0f0f0)' }}>
                          <td style={{ padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>{dt}</td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', fontWeight: 500 }}>{selectedCatKardex.nombre}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ color: colorTipo, fontWeight: 'bold', fontSize: '11px' }}>
                              {tipoEvento === 'TRANSACCION' ? 'MOVIMIENTO' : tipoEvento}
                            </span>
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: '11px' }}>{mov.campo_modificado || 'N/A'}</td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                            {mov.valor_anterior || '-'}
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {mov.valor_nuevo || '-'}
                          </td>

                          <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>{mov.descripcion || ''}</td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>{mov.notas || '-'}</td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                             {mov.usuario_nombre ? `${mov.usuario_nombre} (${mov.usuario_rol || '-'})` : 'Sistema'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!kardexLoading && kardexTotalPages > 1 && (
              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => fetchKardex(selectedCatKardex.id, kardexPage - 1, kardexFechaDesde, kardexFechaHasta)}
                  disabled={kardexPage <= 1}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Página {kardexPage} de {kardexTotalPages}</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => fetchKardex(selectedCatKardex.id, kardexPage + 1, kardexFechaDesde, kardexFechaHasta)}
                  disabled={kardexPage >= kardexTotalPages}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* â”€â”€ Transaction Audit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {auditVisible && selectedTransAudit && (
        <div className="modal-overlay" onClick={closeAudit}>
          <div className="modal" style={{ maxWidth: '1080px', width: '95vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Historial: {selectedTransAudit.categoria_nombre || 'Transacción'} #{selectedTransAudit.id}
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={handleAuditExport} style={{ padding: '4px 12px', fontSize: '12px' }}>
                  Exportar Excel
                </button>
                <button className="modal-close" onClick={closeAudit}>x</button>
              </div>
            </div>

            {/* Summary bar */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', gap: '24px', flexWrap: 'wrap', background: 'var(--bg-secondary)' }}>
              <div><span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Concepto</span><div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedTransAudit.descripcion || '"”'}</div></div>
              <div><span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Categoría</span><div style={{ fontSize: '13px' }}>{selectedTransAudit.categoria_nombre || '"”'}</div></div>
              <div><span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Monto Actual</span><div style={{ fontSize: '15px', fontWeight: 'bold', color: selectedTransAudit.tipo === 'INGRESO' ? '#52c41a' : '#ff4d4f' }}>S/. {parseFloat(selectedTransAudit.monto || 0).toFixed(2)}</div></div>
            </div>

            {/* Date filter bar */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Desde</label>
                <input
                  type="date"
                  value={auditFechaDesde}
                  onChange={(e) => setAuditFechaDesde(e.target.value)}
                  className="form-input"
                  style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Hasta</label>
                <input
                  type="date"
                  value={auditFechaHasta}
                  onChange={(e) => setAuditFechaHasta(e.target.value)}
                  className="form-input"
                  style={{ padding: '5px 8px', fontSize: '13px', width: 'auto' }}
                />
              </div>
              <button className="btn btn-primary" onClick={() => fetchAudit(selectedTransAudit.id, 1, auditFechaDesde, auditFechaHasta)} style={{ padding: '5px 14px', fontSize: '13px' }}>
                Filtrar
              </button>
              <button className="btn btn-secondary" onClick={() => { setAuditFechaDesde(''); setAuditFechaHasta(''); fetchAudit(selectedTransAudit.id, 1, '', ''); }} style={{ padding: '5px 14px', fontSize: '13px' }}>
                Limpiar
              </button>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                {auditTotal} registro{auditTotal !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table "” 9 columnas estándar */}
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '45vh' }}>
              {auditLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Cargando historial...</div>
              ) : auditData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No hay registros de cambios para esta transacción.
                </div>
              ) : (
                <table style={{ minWidth: '1000px', width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>Fecha y Hora</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Categoría</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>Tipo de Evento</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Campo</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>V. Anterior (S/.)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap' }}>V. Nuevo (S/.)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Descripción</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Notas</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px' }}>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.map((mov) => {
                      const dateObj = new Date(mov.fecha);
                      const dt = dateObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const tipoEvento = mov.tipo_movimiento || 'EDICION';
                      const colorTipo = tipoEvento === 'TRANSACCION' ? '#1890ff'
                        : tipoEvento === 'ESTADO' ? '#fa8c16'
                        : tipoEvento === 'CREACION' ? '#52c41a'
                        : '#722ed1';
                      return (
                        <tr key={mov.id} style={{ borderBottom: '1px solid var(--border-color, #f0f0f0)' }}>
                          <td style={{ padding: '7px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>{dt}</td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', fontWeight: 500 }}>{selectedTransAudit.categoria_nombre || '"”'}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ color: colorTipo, fontWeight: 'bold', fontSize: '11px' }}>
                              {tipoEvento === 'TRANSACCION' ? 'MOVIMIENTO' : tipoEvento}
                            </span>
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: '11px' }}>{mov.campo_modificado || 'N/A'}</td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                            {mov.valor_anterior || '-'}
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {mov.valor_nuevo || '-'}
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>{mov.descripcion || ''}</td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>{mov.notas || '-'}</td>
                          <td style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                             {mov.usuario_nombre ? `${mov.usuario_nombre} (${mov.usuario_rol || '-'})` : 'Sistema'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!auditLoading && auditTotalPages > 1 && (
              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => fetchAudit(selectedTransAudit.id, auditPage - 1, auditFechaDesde, auditFechaHasta)}
                  disabled={auditPage <= 1}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Página {auditPage} de {auditTotalPages}</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => fetchAudit(selectedTransAudit.id, auditPage + 1, auditFechaDesde, auditFechaHasta)}
                  disabled={auditPage >= auditTotalPages}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Siguiente
                </button>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeAudit}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transacciones;

