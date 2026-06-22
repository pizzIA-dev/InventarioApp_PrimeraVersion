import { useState, useEffect, useRef, useCallback } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { serviciosAPI } from '../services/api';

/**
 * Modal rápido para crear un Servicio nuevo desde ComprasServicios.
 * Props:
 *   visible  - boolean
 *   onClose  - () => void
 *   onSave   - (servicio) => void   recibe el servicio creado
 */
export default function ServicioFormModal({ visible, onClose, onSave }) {
  const EMPTY = { codigo: '', nombre: '', precio: '', descripcion: '' };
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [userEditedCode, setUserEditedCode] = useState(false);
  const timerRef = useRef(null);

  const generateCode = useCallback((nombre, existingCodes = []) => {
    clearTimeout(timerRef.current);
    setGenerando(true);
    timerRef.current = setTimeout(() => {
      const base = (nombre || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'SRV';
      let num = 1;
      let code = `SRV-${base}-${String(num).padStart(3, '0')}`;
      while (existingCodes.includes(code)) {
        num++;
        code = `SRV-${base}-${String(num).padStart(3, '0')}`;
      }
      setForm(f => ({ ...f, codigo: code }));
      setGenerando(false);
    }, 350);
  }, []);

  useEffect(() => {
    if (visible) {
      setForm(EMPTY);
      setErrors({});
      setUserEditedCode(false);
      // Auto-generate initial code:
      serviciosAPI.getAll({ page_size: 500 }).then(r => {
        const ex = (r.data.results || r.data).map(s => s.codigo).filter(Boolean);
        generateCode('', ex);
      }).catch(() => generateCode('', []));
    }
  }, [visible]);

  if (!visible) return null;

  const handleNombreChange = (e) => {
    const nombre = e.target.value;
    setForm(f => ({ ...f, nombre }));
    if (!userEditedCode) {
      serviciosAPI.getAll({ page_size: 500 }).then(r => {
        const ex = (r.data.results || r.data).map(s => s.codigo).filter(Boolean);
        generateCode(nombre, ex);
      }).catch(() => generateCode(nombre, []));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())                      e.nombre = 'El nombre es obligatorio';
    if (!form.precio || Number(form.precio) <= 0) e.precio = 'Ingresa un precio válido';
    if (!form.codigo.trim())                      e.codigo = 'El código es obligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await serviciosAPI.create({
        codigo:      form.codigo.trim(),
        nombre:      form.nombre.trim(),
        precio:      Number(form.precio),
        descripcion: form.descripcion.trim() || '',
        activo:      true,
      });
      onSave(res.data);
      onClose();
    } catch (e) {
      const msg = e.response?.data?.codigo?.[0]
               || e.response?.data?.nombre?.[0]
               || e.response?.data?.detail
               || 'Error al crear el servicio';
      setErrors({ general: msg });
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Nuevo Servicio</h3>
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
              <label className="form-label">Nombre *</label>
              <input
                type="text" className={`form-input${errors.nombre ? ' input-error' : ''}`}
                placeholder="Ej: Servicio de Delivery, Mantenimiento..."
                value={form.nombre}
                onChange={handleNombreChange}
                onFocus={e => e.target.select()}
                autoFocus
              />
              {errors.nombre && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>{errors.nombre}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Código *
                {!userEditedCode && (
                  <span style={{ fontSize: '10px', background: 'var(--color-primary)', color: '#fff',
                    padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>AUTO</span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className={`form-input${errors.codigo ? ' input-error' : ''}`}
                  value={form.codigo}
                  placeholder={generando ? 'Generando...' : 'SRV-NOMBRE-001'}
                  onChange={e => { setUserEditedCode(true); setForm(f => ({ ...f, codigo: e.target.value })); }}
                  onFocus={e => e.target.select()}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  title="Regenerar código"
                  onClick={() => {
                    setUserEditedCode(false);
                    serviciosAPI.getAll({ page_size: 500 }).then(r => {
                      const ex = (r.data.results || r.data).map(s => s.codigo).filter(Boolean);
                      generateCode(form.nombre, ex);
                    }).catch(() => generateCode(form.nombre, []));
                  }}
                  disabled={generando}
                  style={{ padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '16px' }}
                >🔄</button>
              </div>
              {errors.codigo && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>{errors.codigo}</div>}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Precio (S/.) *</label>
                <input
                  type="number" step="0.01" min="0" className={`form-input${errors.precio ? ' input-error' : ''}`}
                  placeholder="0.00"
                  value={form.precio}
                  onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                  onFocus={e => e.target.select()}
                />
                {errors.precio && <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>{errors.precio}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descripción <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span></label>
              <textarea
                className="form-input" rows={2} style={{ resize: 'vertical' }}
                placeholder="Descripción breve del servicio..."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando...' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}