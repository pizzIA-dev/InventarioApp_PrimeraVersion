import { useState, useEffect } from 'react';
import {
  CheckCircleOutlined, PlayCircleOutlined,
  DeleteOutlined, EditOutlined, PlusOutlined, CloseOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { comprasServiciosAPI, proveedoresAPI, serviciosContratadosAPI } from '../services/api';
import ExportDropdown from '../components/ExportDropdown';
import SearchableSelect from '../components/SearchableSelect';
import ServicioContratadoFormModal from '../components/ServicioContratadoFormModal';

const ESTADO_BADGE = { PENDIENTE: 'badge-warning', EN_PROGRESO: 'badge-info', TERMINADO: 'badge-success', CANCELADO: 'badge-danger' };
const ESTADO_LABEL = { PENDIENTE: 'PENDIENTE', EN_PROGRESO: 'EN PROCESO', TERMINADO: 'TERMINADO', CANCELADO: 'CANCELADO' };
const EMPTY_FORM    = {
  servicio: '', servicio_nombre: '', proveedor: '', precio: '', descuento: '0', impuesto: '0',
  fecha_programada: '', estado: 'PENDIENTE', notas: '',
  numero_comprobante: '', numero_comprobante_simple: '', tipo_comprobante: '',
};
const PAGE_SIZE     = 15;

const LABEL_STYLE = { fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' };

export default function ComprasServicios() {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [servicios, setServicios]     = useState([]);
  const [proveedores, setProveedores] = useState([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [servicioContratadoModalVisible, setServicioContratadoModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);


  // Pagination
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchProveedor,   setSearchProveedor]   = useState('');
  const [searchServicio,    setSearchServicio]     = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin,    setFilterFechaFin]    = useState('');
  const [filterEstado,      setFilterEstado]      = useState('ALL');

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await comprasServiciosAPI.getAll({ page: p, page_size: PAGE_SIZE });
      setData(res.data.results || res.data);
      setTotal(res.data.count || 0);
    } catch {}
    setLoading(false);
  };

  const fetchCatalogs = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        serviciosContratadosAPI.getAll({ page_size: 999, activo: true }),
        proveedoresAPI.getAll({ page_size: 999 }),
      ]);
      setServiciosContratados(sRes.data.results || sRes.data);
      setProveedores(pRes.data.results || pRes.data);
    } catch {}
  };

  useEffect(() => { fetchData(); fetchCatalogs(); }, []);

  // Client-side filtering
  const filtered = data.filter(r => {
    const matchProv    = (r.proveedor_nombre || '').toLowerCase().includes(searchProveedor.toLowerCase());
    const matchServ    = (r.servicio_nombre  || '').toLowerCase().includes(searchServicio.toLowerCase());
    const matchEstado  = filterEstado === 'ALL' || r.estado === filterEstado;
    const dateKey      = (r.fecha_programada || r.creado_en || '').slice(0, 10);
    const matchDesde   = !filterFechaInicio || dateKey >= filterFechaInicio;
    const matchHasta   = !filterFechaFin    || dateKey <= filterFechaFin;
    return matchProv && matchServ && matchEstado && matchDesde && matchHasta;
  });

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage     = Math.min(page, totalPages);
  const paginated    = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearFilters = () => { setSearchProveedor(''); setSearchServicio(''); setFilterFechaInicio(''); setFilterFechaFin(''); setFilterEstado('ALL'); setPage(1); };
  const hasFilters   = searchProveedor || searchServicio || filterFechaInicio || filterFechaFin || filterEstado !== 'ALL';

  // Handlers
  const openCreate = () => { setModalMode('create'); setSelected(null); setForm(EMPTY_FORM); setErrors({}); setModalOpen(true); };
  const openEdit   = (r)  => {
    setModalMode('edit'); setSelected(r);
    setForm({
      servicio: String(r.servicio || ''),
        servicio_nombre: r.servicio_nombre || '',
      proveedor: String(r.proveedor || ''),
      precio: String(r.precio || ''),
      descuento: String(r.descuento || '0'),
      impuesto: String(r.impuesto || '0'),
      fecha_programada: r.fecha_programada ? r.fecha_programada.substring(0,10) : '',
      estado: r.estado || 'PENDIENTE',
      notas: r.notas || '',
      numero_comprobante: r.numero_comprobante || '',
      numero_comprobante_simple: r.numero_comprobante_simple || '',
      tipo_comprobante: r.tipo_comprobante || '',
    });
    setErrors({}); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setErrors({}); };

  const validate = () => {
    const e = {};
    if (!form.servicio_nombre?.trim()) e.servicio = 'Ingresa el concepto del servicio';
    if (!form.precio || Number(form.precio) <= 0) e.precio = 'Ingresa un precio valido';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        servicio: null,
        servicio_nombre: form.servicio_nombre || '',
        proveedor: form.proveedor ? Number(form.proveedor) : null,
        precio: Number(form.precio) || 0,
        descuento: Number(form.descuento) || 0,
        impuesto: Number(form.impuesto) || 0,
        fecha_programada: form.fecha_programada || null,
        estado: form.estado || 'PENDIENTE',
        notas: form.notas || '',
        numero_comprobante: form.numero_comprobante || '',
        numero_comprobante_simple: form.numero_comprobante_simple || '',
        tipo_comprobante: form.tipo_comprobante || '',
      };
      if (modalMode === 'create') { await comprasServiciosAPI.create(payload); }
      else { await comprasServiciosAPI.update(selected.id, payload); }
      closeModal(); fetchData(page);
    } catch (e) { setErrors({ general: e.response?.data?.error || e.response?.data?.detail || 'Error al guardar' }); }
    setSaving(false);
  };

  const handleIniciar   = async (id) => { try { await comprasServiciosAPI.iniciar(id);   fetchData(page); } catch {} };
  const handleCompletar = async (id) => { try { await comprasServiciosAPI.completar(id); fetchData(page); } catch {} };
  const handleDelete    = async (id) => { try { await comprasServiciosAPI.delete(id);    fetchData(page); } catch {} setConfirmDelete(null); };

  const handleExportar = async (periodo, anio) => {
    try {
      const params = { periodo };
      if (anio) params.anio = anio;
      const response = await comprasServiciosAPI.exportar(params);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `compras_servicios_${periodo}${anio ? '_' + anio : ''}.xlsx`);
      document.body.appendChild(link);
      link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Error al exportar datos.'); }
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Compra de Servicios</h1>
          <p className="page-subtitle">Registro de compras de servicios</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportDropdown onExport={handleExportar} label="Exportar Compras" />
          <button className="btn btn-primary" onClick={openCreate}>
            <PlusOutlined /> Nueva Compra
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={LABEL_STYLE}>Servicio</label>
            <input type="text" className="form-input" placeholder="Buscar servicio..." value={searchServicio} onChange={e => { setSearchServicio(e.target.value); setPage(1); }} />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={LABEL_STYLE}>Proveedor</label>
            <input type="text" className="form-input" placeholder="Buscar proveedor..." value={searchProveedor} onChange={e => { setSearchProveedor(e.target.value); setPage(1); }} />
          </div>
          <div style={{ width: '150px' }}>
            <label style={LABEL_STYLE}>Desde</label>
            <input type="date" className="form-input" value={filterFechaInicio} onChange={e => { setFilterFechaInicio(e.target.value); setPage(1); }} />
          </div>
          <div style={{ width: '150px' }}>
            <label style={LABEL_STYLE}>Hasta</label>
            <input type="date" className="form-input" value={filterFechaFin} onChange={e => { setFilterFechaFin(e.target.value); setPage(1); }} />
          </div>
          <div style={{ width: '180px' }}>
            <label style={LABEL_STYLE}>Estado</label>
            <select className="form-input" value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
              <option value="ALL">TODOS</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="EN_PROGRESO">EN PROCESO</option>
              <option value="TERMINADO">TERMINADO</option>
              <option value="CANCELADO">CANCELADO</option>
            </select>
          </div>
          {hasFilters && (
            <button className="btn btn-secondary" style={{ height: '38px' }} onClick={clearFilters}>Limpiar</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Fecha</th>
                <th>Servicio</th>
                <th>Proveedor</th>
                <th style={{ textAlign: 'right', width: '100px' }}>Precio</th>
                <th style={{ width: '120px' }}>Estado</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Cargando...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {hasFilters ? 'No se encontraron compras que coincidan con los filtros.' : 'No hay compras de servicios registradas.'}
                </td></tr>
              ) : paginated.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.fecha_programada || r.creado_en).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 500 }}>{r.servicio_nombre || '—'}</td>
                  <td style={{ color: r.proveedor_nombre ? 'inherit' : 'var(--text-secondary)', fontStyle: r.proveedor_nombre ? 'normal' : 'italic' }}>{r.proveedor_nombre || 'Sin proveedor'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>S/. {Number(r.precio || 0).toFixed(2)}</td>
                  <td><span className={`badge ${ESTADO_BADGE[r.estado] || 'badge-secondary'}`}>{ESTADO_LABEL[r.estado] || r.estado}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                      <button className="btn btn-secondary btn-icon" onClick={() => openEdit(r)} title="Editar"><EditOutlined /></button>
                      {r.estado === 'PENDIENTE'  && <button className="btn btn-primary btn-icon"  onClick={() => handleIniciar(r.id)}   title="Iniciar servicio"><PlayCircleOutlined /></button>}
                      {r.estado === 'EN_PROGRESO' && <button className="btn btn-success btn-icon"  onClick={() => handleCompletar(r.id)} title="Completado"><CheckCircleOutlined /></button>}
                      <button className="btn btn-danger btn-icon" onClick={() => setConfirmDelete(r.id)} title="Eliminar"><DeleteOutlined /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button className="btn btn-secondary" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
            <span style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>Pagina {safePage} de {totalPages}</span>
            <button className="btn btn-secondary" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Eliminar compra</h3><button className="modal-close" onClick={() => setConfirmDelete(null)}><CloseOutlined /></button></div>
            <div className="modal-body"><p>Estas seguro que deseas eliminar esta compra de servicio? Esta accion no se puede deshacer.</p></div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? 'Nueva Compra de Servicio' : 'Editar Compra de Servicio'}
              </h3>
              <button className="modal-close" onClick={closeModal}><CloseOutlined /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {errors.general && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '13px', background: '#fff1f0', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffccc7', marginBottom: '16px' }}>
                    {errors.general}
                  </div>
                )}

                {/* Fila 1: Proveedor | Servicio */}
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
                          if (pg) setForm(f => ({ ...f, proveedor: String(pg.id) }));
                        }}
                      >
                        Proveedor General
                      </button>
                    </div>
                    <SearchableSelect
                      options={proveedores.map(p => ({
                        id: String(p.id),
                        nombre: p.nombre,
                        subtitle: `${p.identificador || ''} ${!p.activo ? '(INACTIVO)' : ''}`,
                        disabled: !p.activo
                      }))}
                      value={form.proveedor}
                      onChange={val => setForm(f => ({ ...f, proveedor: val }))}
                      placeholder="Buscar proveedor..."
                      error={errors.proveedor}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Concepto / Servicio *</label>
                    <SearchableSelect
                      options={serviciosContratados.map(s => ({
                      id: String(s.id),
                      nombre: s.nombre,
                      subtitle: s.precio_referencia ? `Ref: S/. ${Number(s.precio_referencia).toFixed(2)}` : ''
                    }))}
                      value={form.servicio}
                      onChange={val => {
                      const sc = serviciosContratados.find(s => String(s.id) === String(val));
                      setForm(f => ({
                        ...f,
                        servicio: val,
                        servicio_nombre: sc ? sc.nombre : '',
                        ...(sc && sc.precio_referencia && !f.precio ? { precio: sc.precio_referencia } : {})
                      }));
                    }}
                      placeholder="Buscar servicio..."
                      onActionClick={() => setServicioContratadoModalVisible(true)}
                      actionLabel="Nuevo Servicio"
                      error={errors.servicio}
                    />
                    {errors.servicio && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>{errors.servicio}</div>}
                  </div>
                </div>

                {/* Fila 2: Nro Comprobante | Tipo Comprobante */}
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Nro Comprobante</label>
                    <input type="text" className="form-input" placeholder="Ej: F001-0001"
                      value={form.numero_comprobante}
                      onChange={e => setForm(f => ({ ...f, numero_comprobante: e.target.value }))}
                      onFocus={e => e.target.select()}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo Comprobante</label>
                    <select className="form-input" value={form.tipo_comprobante}
                      onChange={e => setForm(f => ({ ...f, tipo_comprobante: e.target.value }))}>
                      <option value="">Ninguno</option>
                      <option value="FACTURA">Factura</option>
                      <option value="BOLETA">Boleta</option>
                      <option value="TICKET">Ticket</option>
                      <option value="RECIBO">Recibo de Honorarios</option>
                    </select>
                  </div>
                </div>

                {/* Fila 3: Estado | Fecha Programada */}
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-input" value={form.estado}
                      onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EN_PROGRESO">En Progreso</option>
                      <option value="TERMINADO">Terminado</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha Programada</label>
                    <input type="date" className="form-input" value={form.fecha_programada}
                      onChange={e => setForm(f => ({ ...f, fecha_programada: e.target.value }))} />
                  </div>
                </div>

                {/* Fila 4: Precio | Descuento  (análogo a sección Productos) */}
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Precio (S/.) *</label>
                    <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00"
                      value={form.precio}
                      onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                      onFocus={e => e.target.select()}
                    />
                    {errors.precio && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>{errors.precio}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descuento (S/.)</label>
                    <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00"
                      value={form.descuento}
                      onChange={e => setForm(f => ({ ...f, descuento: e.target.value }))}
                      onFocus={e => e.target.select()}
                    />
                  </div>
                </div>

                {/* Fila 5: Impuesto | Total Estimado */}
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Impuesto (S/.)</label>
                    <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00"
                      value={form.impuesto}
                      onChange={e => setForm(f => ({ ...f, impuesto: e.target.value }))}
                      onFocus={e => e.target.select()}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Estimado</label>
                    <input type="text" className="form-input" readOnly
                      value={`S/. ${(Math.max(0, Number(form.precio)||0) - (Number(form.descuento)||0) + (Number(form.impuesto)||0)).toFixed(2)}`}
                      style={{ fontWeight: 'bold', background: 'var(--bg-input)', color: 'var(--accent, #1677ff)', border: '2px solid var(--accent, #1677ff)' }}
                    />
                  </div>
                </div>

                {/* Fila 6: Notas */}
                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea className="form-input" rows={2} style={{ resize: 'vertical' }}
                    placeholder="Descripción o notas adicionales..."
                    value={form.notas}
                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  />
                </div>

                {/* Fila 7: Archivo */}
                <div className="form-group">
                  <label className="form-label">Comprobante de Pago (Archivo)</label>
                  <input type="file" className="form-input" accept="image/*,.pdf"
                    onChange={e => { if (e.target.files.length > 0) setForm(f => ({ ...f, comprobante_archivo: e.target.files[0] })); }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Registrar Compra' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Nuevo Servicio */}
      <ServicioContratadoFormModal
        visible={servicioContratadoModalVisible}
        onClose={() => setServicioContratadoModalVisible(false)}
        onSave={(newSvc) => {
          setServiciosContratados(prev => prev.find(s => s.id === newSvc.id) ? prev : [...prev, newSvc]);
          setForm(f => ({ ...f, servicio: String(newSvc.id) }));
          setServicioContratadoModalVisible(false);
        }}
      />
    </>
  );
}
