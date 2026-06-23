import { useState, useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { serviciosContratadosAPI } from '../services/api';

/**
 * Modal rapido para crear/editar un ServicioContratado
 * (catalogo de servicios que el negocio COMPRA a proveedores).
 * Diferente del catalogo de servicios que el negocio OFRECE a clientes.
 */
export default function ServicioContratadoFormModal({ visible, onClose, onSave, initialData = null }) {
  const EMPTY = { nombre: '', descripcion: '', precio_referencia: '' };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(initialData
        ? { nombre: initialData.nombre || '', descripcion: initialData.descripcion || '', precio_referencia: initialData.precio_referencia || '' }
        : EMPTY
      );
      setErrors({});
    }
  }, [visible, initialData]);

  if (!visible) return null;

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || '',
        precio_referencia: form.precio_referencia !== '' ? Number(form.precio_referencia) : null,
        activo: true,
      };
      const res = initialData
        ? await serviciosContratadosAPI.update(initialData.id, payload)
        : await serviciosContratadosAPI.create(payload);
      onSave(res.data);
      onClose();
    } catch (e) {
      const msg = e.response?.data?.nombre?.[0] || e.response?.data?.detail || 'Error al guardar';
      setErrors({ general: msg });
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{initialData ? 'Editar' : 'Nuevo'} Servicio Contratado</h3>
          <button className="modal-close" onClick={onClose}><CloseOutlined /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.general && (
              <div style={{ color: 'var(--color-danger)', fontSize: '13px', background: '#fff1f0',
                padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffccc7', marginBottom: '16px' }}>
                {errors.general}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Nombre del servicio *</label>
              <input
                type="text" className={`form-input${errors.nombre ? ' input-error' : ''}`}
                placeholder="Ej: Servicio de Internet, Limpieza, Contabilidad..."
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                onFocus={e => e.target.select()}
                autoFocus
              />
              {errors.nombre && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">
                  Precio referencia (S/.)
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 4 }}>(opcional)</span>
                </label>
                <input
                  type="number" step="0.01" min="0" className="form-input"
                  placeholder="0.00"
                  value={form.precio_referencia}
                  onChange={e => setForm(f => ({ ...f, precio_referencia: e.target.value }))}
                  onFocus={e => e.target.select()}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Se pre-rellena en cada compra (editable)
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                Descripcion
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 4 }}>(opcional)</span>
              </label>
              <textarea
                className="form-input" rows={2} style={{ resize: 'vertical' }}
                placeholder="Descripcion del servicio contratado..."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}