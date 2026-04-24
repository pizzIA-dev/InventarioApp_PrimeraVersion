import { useState, useEffect, useCallback, useContext } from 'react';
import { almacenesAPI, usuariosAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';

/* ─────────────────────────────────────────────────────────────────────────────
   GestionAlmacenes — Solo visible para GERENTE
   Permite:
   - Ver todos los almacenes (general + subalmacenes)
   - Crear / editar almacenes
   - Ver stock de cada almacén
   - Ver / crear traslados entre almacenes
   - Asignar colaboradores a almacenes
───────────────────────────────────────────────────────────────────────────── */

const TAB = { ALMACENES: 'almacenes', TRASLADOS: 'traslados', ASIGNACIONES: 'asignaciones' };

export default function GestionAlmacenes() {
  const { user } = useContext(AuthContext);
  const isGerente = user?.rol === 'GERENTE';
  const [tab, setTab] = useState(TAB.ALMACENES);

  // ── Almacenes ──
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'crear' | 'editar' | 'stock' | 'traslado'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', es_general: false });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Traslados ──
  const [traslados, setTraslados] = useState([]);
  const [trasladoForm, setTrasladoForm] = useState({
    tipo: 'GENERAL_A_SUB', producto_id: '', origen_id: '', destino_id: '', cantidad: '', notas: ''
  });
  const [productos, setProductos] = useState([]);

  // ── Asignaciones ──
  const [usuarios, setUsuarios] = useState([]);

  // ── Stock del almacén seleccionado ──
  const [stockAlmacen, setStockAlmacen] = useState([]);

  const fetchAlmacenes = useCallback(async () => {
    setLoading(true);
    try {
      const r = await almacenesAPI.listar();
      setAlmacenes(r.data.results || r.data);
    } catch { /* silenced */ }
    setLoading(false);
  }, []);

  const fetchTraslados = useCallback(async () => {
    const r = await almacenesAPI.getTraslados();
    setTraslados(r.data.results || r.data);
  }, []);

  const fetchUsuarios = useCallback(async () => {
    const r = await usuariosAPI.listar();
    setUsuarios(r.data);
  }, []);

  const fetchProductos = useCallback(async () => {
    const r = await fetch('/api/productos/?page_size=500', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    });
    const d = await r.json();
    setProductos(d.results || d);
  }, []);

  useEffect(() => { fetchAlmacenes(); }, [fetchAlmacenes]);
  useEffect(() => {
    if (tab === TAB.TRASLADOS) { fetchTraslados(); fetchProductos(); }
    if (tab === TAB.ASIGNACIONES) { fetchUsuarios(); fetchAlmacenes(); }
  }, [tab, fetchTraslados, fetchProductos, fetchUsuarios, fetchAlmacenes]);

  // ── Handlers ──
  const openCrear = () => {
    setForm({ nombre: '', descripcion: '', es_general: false });
    setFormError('');
    setModal('crear');
  };

  const openEditar = (a) => {
    setSelected(a);
    setForm({ nombre: a.nombre, descripcion: a.descripcion || '', es_general: a.es_general });
    setFormError('');
    setModal('editar');
  };

  const openStock = async (a) => {
    setSelected(a);
    setModal('stock');
    const r = await almacenesAPI.getStockAlmacen({ almacen: a.id });
    setStockAlmacen(r.data.results || r.data);
  };

  const submitAlmacen = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setFormError('El nombre es obligatorio.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      if (modal === 'crear') {
        await almacenesAPI.crear(form);
      } else {
        await almacenesAPI.actualizar(selected.id, form);
      }
      setModal(null);
      fetchAlmacenes();
    } catch (err) {
      setFormError(err.response?.data?.detail || err.response?.data?.nombre?.[0] || 'Error al guardar.');
    }
    setSubmitting(false);
  };

  const submitTraslado = async (e) => {
    e.preventDefault();
    if (!trasladoForm.producto_id || !trasladoForm.cantidad) {
      setFormError('Producto y cantidad son obligatorios.'); return;
    }
    setSubmitting(true);
    setFormError('');
    const payload = {
      tipo: trasladoForm.tipo,
      producto: parseInt(trasladoForm.producto_id),
      almacen_origen:  trasladoForm.origen_id  ? parseInt(trasladoForm.origen_id)  : null,
      almacen_destino: trasladoForm.destino_id ? parseInt(trasladoForm.destino_id) : null,
      cantidad: parseFloat(trasladoForm.cantidad),
      notas: trasladoForm.notas,
    };
    try {
      await almacenesAPI.crearTraslado(payload);
      fetchTraslados();
      setTrasladoForm({ tipo: 'GENERAL_A_SUB', producto_id: '', origen_id: '', destino_id: '', cantidad: '', notas: '' });
      setFormError('');
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.detail || 'Error al trasladar.');
    }
    setSubmitting(false);
  };

  const handleAsignarAlmacen = async (usuarioId, almacenId) => {
    try {
      await usuariosAPI.asignarAlmacen(usuarioId, almacenId || null);
      fetchUsuarios();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al asignar almacén.');
    }
  };

  // ── Guard: solo Gerente ──
  if (!user || !['GERENTE'].includes(user.rol)) {
    return (
      <div style={styles.restricted}>
        <span style={{ fontSize: 40 }}>🔒</span>
        <p>Esta sección es exclusiva para el Gerente.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Almacenes y Cajas</h1>
          <p style={styles.subtitle}>Gestiona tu inventario distribuido entre sub-almacenes y colaboradores</p>
        </div>
        {tab === TAB.ALMACENES && (
          <button style={styles.btnPrimary} onClick={openCrear}>+ Nuevo Almacén</button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key: TAB.ALMACENES,   label: '🏪 Almacenes' },
          { key: TAB.TRASLADOS,   label: '🔄 Traslados' },
          { key: TAB.ASIGNACIONES, label: '👤 Asignaciones' },
        ].map(t => (
          <button
            key={t.key}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB ALMACENES ── */}
      {tab === TAB.ALMACENES && (
        loading ? <div style={styles.loading}>Cargando almacenes…</div> : (
          <div style={styles.grid}>
            {almacenes.length === 0 && (
              <div style={styles.empty}>Aún no hay almacenes registrados.<br/>Crea el almacén general primero.</div>
            )}
            {almacenes.map(a => (
              <div key={a.id} style={{ ...styles.card, ...(a.es_general ? styles.cardGeneral : {}) }}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardIcon}>{a.es_general ? '🏬' : '📦'}</span>
                  <div>
                    <div style={styles.cardNombre}>{a.nombre}</div>
                    {a.es_general && <span style={styles.badgeGeneral}>General</span>}
                  </div>
                </div>
                {a.descripcion && <p style={styles.cardDesc}>{a.descripcion}</p>}
                <div style={styles.cardStats}>
                  <div style={styles.stat}>
                    <span style={styles.statVal}>{a.total_productos ?? '—'}</span>
                    <span style={styles.statLabel}>Productos</span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statVal}>{a.total_colaboradores ?? 0}</span>
                    <span style={styles.statLabel}>Colaboradores</span>
                  </div>
                </div>
                <div style={styles.cardActions}>
                  <button style={styles.btnSm}     onClick={() => openStock(a)}>Ver Stock</button>
                  <button style={styles.btnSmGhost} onClick={() => openEditar(a)}>Editar</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── TAB TRASLADOS ── */}
      {tab === TAB.TRASLADOS && (
        <div style={styles.splitLayout}>
          {/* Formulario */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Nuevo Traslado</h3>
            <form onSubmit={submitTraslado} style={styles.form}>
              <label style={styles.label}>Tipo de traslado</label>
              <select
                style={styles.input}
                value={trasladoForm.tipo}
                onChange={e => setTrasladoForm(f => ({ ...f, tipo: e.target.value }))}
              >
                <option value="GENERAL_A_SUB">Almacén General → Subalmacén</option>
                <option value="SUB_A_GENERAL">Subalmacén → Almacén General</option>
                <option value="SUB_A_SUB">Entre Subalmacenes</option>
                <option value="AJUSTE">Ajuste de Inventario</option>
              </select>

              <label style={styles.label}>Producto</label>
              <select
                style={styles.input}
                value={trasladoForm.producto_id}
                onChange={e => setTrasladoForm(f => ({ ...f, producto_id: e.target.value }))}
                required
              >
                <option value="">— Selecciona producto —</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock_actual})</option>
                ))}
              </select>

              <label style={styles.label}>Origen (almacén)</label>
              <select
                style={styles.input}
                value={trasladoForm.origen_id}
                onChange={e => setTrasladoForm(f => ({ ...f, origen_id: e.target.value }))}
              >
                <option value="">— Sin origen (entrada externa) —</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>

              <label style={styles.label}>Destino (almacén)</label>
              <select
                style={styles.input}
                value={trasladoForm.destino_id}
                onChange={e => setTrasladoForm(f => ({ ...f, destino_id: e.target.value }))}
              >
                <option value="">— Sin destino (salida) —</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>

              <label style={styles.label}>Cantidad</label>
              <input
                style={styles.input}
                type="number" min="0.01" step="0.01"
                value={trasladoForm.cantidad}
                onChange={e => setTrasladoForm(f => ({ ...f, cantidad: e.target.value }))}
                required
                placeholder="0.00"
              />

              <label style={styles.label}>Notas (opcional)</label>
              <textarea
                style={{ ...styles.input, height: 70, resize: 'vertical' }}
                value={trasladoForm.notas}
                onChange={e => setTrasladoForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Observaciones del traslado…"
              />

              {formError && <div style={styles.errorBox}>{formError}</div>}
              <button style={styles.btnPrimary} type="submit" disabled={submitting}>
                {submitting ? 'Ejecutando…' : '🔄 Ejecutar Traslado'}
              </button>
            </form>
          </div>

          {/* Historial */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Historial de Traslados</h3>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Fecha</th>
                    <th style={styles.th}>Producto</th>
                    <th style={styles.th}>Origen</th>
                    <th style={styles.th}>Destino</th>
                    <th style={styles.th}>Cantidad</th>
                    <th style={styles.th}>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {traslados.map(t => (
                    <tr key={t.id} style={styles.tr}>
                      <td style={styles.td}>{new Date(t.fecha).toLocaleString('es')}</td>
                      <td style={styles.td}>{t.producto_nombre}</td>
                      <td style={styles.td}>{t.almacen_origen_nombre || '—'}</td>
                      <td style={styles.td}>{t.almacen_destino_nombre || '—'}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{t.cantidad}</td>
                      <td style={styles.td}>{t.usuario_nombre}</td>
                    </tr>
                  ))}
                  {traslados.length === 0 && (
                    <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 32 }}>Sin traslados registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB ASIGNACIONES ── */}
      {tab === TAB.ASIGNACIONES && (
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Asignación de Colaboradores a Almacenes</h3>
          <p style={styles.subtitle}>El almacén asignado controla qué stock ve y usa el colaborador al vender.</p>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Colaborador</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Almacén Actual</th>
                  <th style={styles.th}>Reasignar</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{u.username}</strong>
                      {u.rol_custom_nombre && <span style={styles.badge}>{u.rol_custom_nombre}</span>}
                    </td>
                    <td style={styles.td}>{u.email || '—'}</td>
                    <td style={styles.td}>
                      <span style={u.is_active ? styles.badgeActive : styles.badgeInactive}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {u.almacen_nombre
                        ? <span>{u.almacen_es_general ? '🏬 ' : '📦 '}{u.almacen_nombre}</span>
                        : <span style={{ color: '#aaa' }}>Sin asignar</span>
                      }
                    </td>
                    <td style={styles.td}>
                      <select
                        style={{ ...styles.input, margin: 0, padding: '4px 8px', fontSize: 13 }}
                        value={u.almacen_id || ''}
                        onChange={e => handleAsignarAlmacen(u.id, e.target.value || null)}
                      >
                        <option value="">— Sin almacén —</option>
                        {almacenes.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.es_general ? '🏬 ' : '📦 '}{a.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr><td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 32 }}>No hay colaboradores registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL Crear / Editar Almacén ── */}
      {(modal === 'crear' || modal === 'editar') && (
        <div style={styles.overlay} onClick={() => setModal(null)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{modal === 'crear' ? 'Nuevo Almacén' : 'Editar Almacén'}</h2>
            <form onSubmit={submitAlmacen} style={styles.form}>
              <label style={styles.label}>Nombre *</label>
              <input style={styles.input} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Almacén Principal, Caja Sur" required />

              <label style={styles.label}>Descripción</label>
              <textarea style={{ ...styles.input, height: 70, resize: 'vertical' }} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción opcional…" />

              <label style={styles.checkLabel}>
                <input type="checkbox" checked={form.es_general} onChange={e => setForm(f => ({ ...f, es_general: e.target.checked }))} />
                <span>¿Es el almacén general / principal?</span>
              </label>
              <p style={styles.hint}>Solo puede existir un almacén general por empresa.</p>

              {formError && <div style={styles.errorBox}>{formError}</div>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button style={styles.btnPrimary} type="submit" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar'}</button>
                <button style={styles.btnGhost}  type="button" onClick={() => setModal(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL Stock del Almacén ── */}
      {modal === 'stock' && selected && (
        <div style={styles.overlay} onClick={() => setModal(null)}>
          <div style={{ ...styles.modalBox, maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📦 Stock — {selected.nombre}</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Producto</th>
                    <th style={styles.th}>Código</th>
                    <th style={styles.th}>Unidad</th>
                    <th style={styles.th}>Cantidad</th>
                    <th style={styles.th}>Stock Mínimo</th>
                    <th style={styles.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockAlmacen.map(s => (
                    <tr key={s.id} style={styles.tr}>
                      <td style={styles.td}>{s.producto_nombre}</td>
                      <td style={styles.td}>{s.producto_codigo}</td>
                      <td style={styles.td}>{s.producto_unidad}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: s.stock_bajo ? '#ef4444' : '#22c55e' }}>{s.cantidad}</td>
                      <td style={styles.td}>{s.stock_minimo}</td>
                      <td style={styles.td}>
                        <span style={s.stock_bajo ? styles.badgeInactive : styles.badgeActive}>
                          {s.stock_bajo ? '⚠ Bajo' : '✓ OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {stockAlmacen.length === 0 && (
                    <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 32 }}>Sin productosenregistrados en este almacén aún.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <button style={{ ...styles.btnGhost, marginTop: 16 }} onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const styles = {
  page:       { padding: '24px 32px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif", maxWidth: 1280, margin: '0 auto' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  h1:         { margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' },
  subtitle:   { margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)' },
  tabs:       { display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 },
  tab:        { background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14, transition: 'all .2s' },
  tabActive:  { background: 'var(--accent)', color: '#fff' },
  loading:    { color: 'var(--text-muted)', padding: 40, textAlign: 'center' },
  empty:      { gridColumn: '1/-1', color: 'var(--text-muted)', textAlign: 'center', padding: 48, fontSize: 15 },
  restricted: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 80, color: 'var(--text-muted)', fontSize: 15 },

  // Grid de almacenes
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 },
  card:        { background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border-color)' },
  cardGeneral: { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' },
  cardHeader:  { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon:    { fontSize: 28 },
  cardNombre:  { fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' },
  cardDesc:    { fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' },
  cardStats:   { display: 'flex', gap: 16, marginBottom: 14 },
  cardActions: { display: 'flex', gap: 10 },
  stat:        { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statVal:     { fontSize: 20, fontWeight: 700, color: 'var(--accent)' },
  statLabel:   { fontSize: 11, color: 'var(--text-muted)' },

  // Badge
  badgeGeneral:  { background: 'var(--accent)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, marginTop: 2, display: 'inline-block' },
  badge:         { background: 'var(--border-color)', color: 'var(--text-muted)', borderRadius: 4, padding: '2px 6px', fontSize: 11, marginLeft: 6 },
  badgeActive:   { background: '#166534', color: '#86efac', borderRadius: 4, padding: '2px 8px', fontSize: 11 },
  badgeInactive: { background: '#7f1d1d', color: '#fca5a5', borderRadius: 4, padding: '2px 8px', fontSize: 11 },

  // Splitlayout y panel
  splitLayout: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'flex-start' },
  panel:       { background: 'var(--bg-card)', borderRadius: 12, padding: 24, border: '1px solid var(--border-color)' },
  panelTitle:  { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },

  // Formulario
  form:  { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 },
  input: { background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer' },
  hint:  { margin: 0, fontSize: 12, color: 'var(--text-muted)' },
  errorBox: { background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontSize: 13 },

  // Tabla
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: 'var(--bg-app)', color: 'var(--text-muted)', padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' },

  // Botones
  btnPrimary: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  btnGhost:   { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 20px', fontWeight: 500, fontSize: 14, cursor: 'pointer' },
  btnSm:     { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnSmGhost: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' },

  // Modal
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBox:  { background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 28, width: '90%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
};
