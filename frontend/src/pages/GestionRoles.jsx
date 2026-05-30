import { useState, useEffect, useContext } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined, CloseOutlined } from '@ant-design/icons';
import { rolesAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Modal } from 'antd';

const MODULOS_SCOPES = [
  { label: 'Inventario (Lectura)',          value: 'inventario:leer' },
  { label: 'Inventario (Escritura)',         value: 'inventario:escribir' },
  { label: 'Ventas (Crear y Leer)',          value: 'ventas:crear' },
  { label: 'Finanzas/Capital (Acceso Total)',value: 'capital:acceso' },
  { label: 'Reportes (Visualizacion)',       value: 'reportes:ver' },
  { label: 'Usuarios y Empleados (Gestion)',  value: 'usuarios:manejo' },
];

const GestionRoles = () => {
  const { user } = useContext(AuthContext);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUpsell, setIsUpsell] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', permisos: [] });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await rolesAPI.listar();
      setRoles(res.data);
      setIsUpsell(false);
    } catch (error) {
      if (error.response?.status === 403) setIsUpsell(true);
    } finally {
      setLoading(false);
    }
  };

  const openCrear = () => {
    setEditingId(null);
    setForm({ nombre: '', descripcion: '', permisos: [] });
    setFormError('');
    setModalOpen(true);
  };

  const openEditar = (rol) => {
    setEditingId(rol.id);
    setForm({ nombre: rol.nombre, descripcion: rol.descripcion || '', permisos: rol.permisos || [] });
    setFormError('');
    setModalOpen(true);
  };

  const handleDelete = (id, nombre) => {
    Modal.confirm({
      title: `¿Eliminar el rol "${nombre}"?`,
      content: 'Los usuarios con este rol perderan inmediatamente el acceso a las funciones extra.',
      okText: 'Si, eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await rolesAPI.eliminar(id);
          fetchRoles();
        } catch (err) {
          alert(err.response?.data?.detail || 'Error al eliminar el rol.');
        }
      }
    });
  };

  const togglePermiso = (scope) => {
    setForm(prev => ({
      ...prev,
      permisos: prev.permisos.includes(scope)
        ? prev.permisos.filter(p => p !== scope)
        : [...prev.permisos, scope]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setFormError('El nombre del rol es obligatorio.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await rolesAPI.actualizar(editingId, form);
      } else {
        await rolesAPI.crear(form);
      }
      setModalOpen(false);
      fetchRoles();
    } catch (err) {
      setFormError(err.response?.data?.detail || err.response?.data?.nombre?.[0] || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (isUpsell) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16, textAlign: 'center' }}>
        <SafetyCertificateOutlined style={{ fontSize: 56, color: 'var(--text-muted)' }} />
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Funcion Corporativa</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 420, lineHeight: 1.6 }}>
          El Motor Avanzado de Roles y Permisos (RBAC) esta disponible exclusivamente en el <strong>Plan Empresario</strong>.
          Contacta a nuestro equipo para hacer el upgrade.
        </p>
        <a href="mailto:ventas@negocia.app" className="btn btn-primary">Contactar a Ventas</a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <SafetyCertificateOutlined style={{ marginRight: 8 }} />
            Roles Corporativos
          </h1>
          <p className="page-subtitle">Crea y gestiona roles personalizados con permisos granulares (Plan Empresario)</p>
        </div>
        <button className="btn btn-primary" onClick={openCrear}>
          <PlusOutlined /> Nuevo Rol
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando roles...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre del Rol</th>
                  <th>Descripcion</th>
                  <th>Niveles de Acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(rol => (
                  <tr key={rol.id}>
                    <td><strong>{rol.nombre}</strong></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{rol.descripcion || '-'}</td>
                    <td>
                      <span className="badge badge-info">{rol.permisos?.length || 0} reglas</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => openEditar(rol)} title="Editar">
                          <EditOutlined />
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDelete(rol.id, rol.nombre)} title="Eliminar">
                          <DeleteOutlined />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No hay roles corporativos creados aun. Crea el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Editar Rol' : 'Nuevo Rol Corporativo'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}><CloseOutlined /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Rol *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.nombre}
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej. Cajero, Sub-Gerente, Auditor..."
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripcion (opcional)</label>
                  <textarea
                    className="form-input"
                    value={form.descripcion}
                    onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Describe brevemente de que se encarga este rol"
                    rows={2}
                    disabled={saving}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Permisos de Acceso</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {MODULOS_SCOPES.map(scope => (
                      <label key={scope.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: form.permisos.includes(scope.value) ? 'rgba(var(--accent-rgb, 22,119,255), 0.08)' : 'transparent', transition: 'all .15s' }}>
                        <input
                          type="checkbox"
                          checked={form.permisos.includes(scope.value)}
                          onChange={() => togglePermiso(scope.value)}
                          disabled={saving}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{scope.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {formError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                    {formError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Rol')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionRoles;
