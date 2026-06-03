import { useState, useEffect } from 'react';
import {
  CheckCircleOutlined, PlayCircleOutlined,
  DeleteOutlined, EditOutlined, PlusOutlined
} from '@ant-design/icons';
import { comprasServiciosAPI, serviciosAPI, proveedoresAPI } from '../services/api';
import SearchableSelect from '../components/SearchableSelect';

const ESTADO_BADGE = {
  PENDIENTE:  'badge-warning',
  EN_PROCESO: 'badge-info',
  COMPLETADO: 'badge-success',
  CANCELADO:  'badge-danger',
};

const ESTADO_LABEL = {
  PENDIENTE:  'Pendiente',
  EN_PROCESO: 'En Proceso',
  COMPLETADO: 'Completado',
  CANCELADO:  'Cancelado',
};

const EMPTY_FORM = { servicio: '', proveedor: '', precio: '', fecha_programada: '', notas: '' };

function ComprasServicios() {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [servicios, setServicios]     = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [modalOpen, setModalOpen]     = useState(false);
  const [modalMode, setModalMode]     = useState('create');
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [errors, setErrors]           = useState({});
  const [saving, setSaving]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [search, setSearch]           = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const PAGE_SIZE = 15;

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
        serviciosAPI.getAll({ page_size: 999, activo: true }),
        proveedoresAPI.getAll({ page_size: 999 }),
      ]);
      setServicios(sRes.data.results || sRes.data);
      setProveedores(pRes.data.results || pRes.data);
    } catch {}
  };

  useEffect(() => { fetchData(); fetchCatalogs(); }, []);

  const filtered = data.filter(r => {
    const matchSearch = !search ||
      (r.servicio_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.proveedor_nombre || '').toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'ALL' || r.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const openCreate = () => { setModalMode('create'); setSelected(null); setForm(EMPTY_FORM); setErrors({}); setModalOpen(true); };
  const openEdit   = (r)  => {
    setModalMode('edit'); setSelected(r);
    setForm({ servicio: String(r.servicio || ''), proveedor: String(r.proveedor || ''), precio: String(r.precio || ''), fecha_programada: r.fecha_programada || '', notas: r.notas || '' });
    setErrors({}); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setSelected(null); setErrors({}); };

  const validate = () => {
    const e = {};
    if (!form.servicio) e.servicio = 'Selecciona un servicio';
    if (!form.precio || Number(form.precio) <= 0) e.precio = 'Ingresa un precio valido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        servicio: Number(form.servicio),
        proveedor: form.proveedor ? Number(form.proveedor) : null,
        precio: Number(form.precio),
        fecha_programada: form.fecha_programada || null,
        notas: form.notas || '',
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

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Compra de Servicios</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Registro de compras de servicios</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <PlusOutlined /> Nueva Compra
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Buscar</label>
            <input className="form-control" placeholder="Buscar por servicio o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ minWidth: '160px' }}>
            <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Estado</label>
            <select className="form-control" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
              <option value="ALL">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PROCESO">En Proceso</option>
              <option value="COMPLETADO">Completado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          {(search || filterEstado !== 'ALL') && (
            <button className="btn btn-secondary" onClick={() => { setSearch(''); setFilterEstado('ALL'); }}>Limpiar</button>
          )}
        </div>
      </div>

      {/* Table */}
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
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No hay compras de servicios registradas.</td></tr>
            ) : filtered.map(record => (
              <tr key={record.id}>
                <td>{(record.fecha_programada || record.creado_en) ? new Date(record.fecha_programada || record.creado_en).toLocaleDateString() : '—'}</td>
                <td style={{ fontWeight: 500 }}>{record.servicio_nombre || '—'}</td>
                <td>{record.proveedor_nombre || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin proveedor</span>}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>S/. {Number(record.precio || 0).toFixed(2)}</td>
                <td><span className={`badge ${ESTADO_BADGE[record.estado] || 'badge-secondary'}`}>{ESTADO_LABEL[record.estado] || record.estado}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button className="btn btn-secondary btn-icon" onClick={() => openEdit(record)} title="Editar"><EditOutlined /></button>
                    {record.estado === 'PENDIENTE' && (
                      <button className="btn btn-primary btn-icon" onClick={() => handleIniciar(record.id)} title="Iniciar servicio"><PlayCircleOutlined /></button>
                    )}
                    {record.estado === 'EN_PROCESO' && (
                      <button className="btn btn-success btn-icon" onClick={() => handleCompletar(record.id)} title="Marcar como completado"><CheckCircleOutlined /></button>
                    )}
                    <button className="btn btn-danger btn-icon" onClick={() => setConfirmDelete(record.id)} title="Eliminar"><DeleteOutlined /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-secondary" disabled={page === 1} onClick={() => { setPage(p => p - 1); fetchData(page - 1); }}>Anterior</button>
          <span style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>Pagina {page} de {Math.ceil(total / PAGE_SIZE)}</span>
          <button className="btn btn-secondary" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => { setPage(p => p + 1); fetchData(page + 1); }}>Siguiente</button>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Eliminar compra de servicio</h3><button className="modal-close" onClick={() => setConfirmDelete(null)}>x</button></div>
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
          <div className="modal-container" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'create' ? 'Nueva Compra de Servicio' : 'Editar Compra de Servicio'}</h3>
              <button className="modal-close" onClick={closeModal}>x</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {errors.general && <div style={{ color: 'red', fontSize: '13px', background: '#fff1f0', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffccc7' }}>{errors.general}</div>}
                <div>
                  <label className="form-label">Servicio *</label>
                  <SearchableSelect options={servicios.map(s => ({ value: String(s.id), label: s.nombre }))} value={form.servicio} onChange={val => setForm(f => ({ ...f, servicio: val }))} placeholder="Seleccionar servicio..." />
                  {errors.servicio && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.servicio}</div>}
                </div>
                <div>
                  <label className="form-label">Proveedor <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>(opcional)</span></label>
                  <SearchableSelect options={proveedores.map(p => ({ value: String(p.id), label: p.nombre }))} value={form.proveedor} onChange={val => setForm(f => ({ ...f, proveedor: val }))} placeholder="Seleccionar proveedor..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Precio (S/.) *</label>
                    <input type="number" step="0.01" min="0" className="form-control" placeholder="0.00" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
                    {errors.precio && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{errors.precio}</div>}
                  </div>
                  <div>
                    <label className="form-label">Fecha programada</label>
                    <input type="date" className="form-control" value={form.fecha_programada} onChange={e => setForm(f => ({ ...f, fecha_programada: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Notas</label>
                  <textarea className="form-control" rows={3} placeholder="Descripcion o notas adicionales..." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : modalMode === 'create' ? 'Registrar Compra' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComprasServicios;
