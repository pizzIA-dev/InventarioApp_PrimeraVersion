import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { WarningOutlined, SelectOutlined, CloseOutlined} from '@ant-design/icons';

const AjusteStockModal = ({ visible, onClose, producto, onSubmit }) => {
  const { isGerente, user } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    almacen_id: '',
    cantidad_ajuste: '',
    tipo: 'SALIDA',
    origen: 'MERMA',
    notas: ''
  });
  
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && isGerente) {
      fetchAlmacenes();
    }
    if (visible) {
      setFormData({
        almacen_id: '',
        cantidad_ajuste: '',
        tipo: 'SALIDA',
        origen: 'MERMA',
        notas: ''
      });
      setError(null);
    }
  }, [visible, isGerente]);

  const fetchAlmacenes = async () => {
    setLoadingAlmacenes(true);
    try {
      setAlmacenes(res.data.results || res.data);
    } catch (err) {
    } finally {
      setLoadingAlmacenes(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cantidad_ajuste || parseFloat(formData.cantidad_ajuste) <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      return;
    }
    if (isGerente && !formData.almacen_id) {
      setError("Por favor selecciona un almacén.");
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      await onSubmit(formData); // Ejecutará la llamada a API desde Productos.jsx
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Ocurrió un error al procesar el ajuste.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !producto) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: '480px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <h3 className="modal-title" style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WarningOutlined /> Ajuste de Inventario
          </h3>
          <button className="modal-close" onClick={onClose} disabled={saving}><CloseOutlined /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px' }}>
            <p style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Estás a punto de registrar un ajuste manual para <strong>{producto.nombre}</strong>.
            </p>

            {isGerente ? (
              <div className="form-group">
                <label className="form-label">Almacén Afectado <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="form-input" 
                  value={formData.almacen_id}
                  onChange={(e) => setFormData({...formData, almacen_id: e.target.value})}
                  disabled={loadingAlmacenes || saving}
                >
                  <option value="">-- Selecciona un Almacén --</option>
                    <option key={a.id} value={a.id}>{a.es_general ? '' : ''}{a.nombre}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: '16px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Caja afectada:</span>
                <div style={{ fontWeight: 'bold' }}>
                  {user?.almacen?.nombre || 'Almacén General (Por defecto)'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Operación <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="form-input"
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  disabled={saving}
                >
                  <option value="SALIDA">Disminuir Stock (Salida)</option>
                  <option value="ENTRADA">Aumentar Stock (Entrada)</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Motivo <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="form-input"
                  value={formData.origen}
                  onChange={(e) => setFormData({...formData, origen: e.target.value})}
                  disabled={saving}
                >
                  <option value="MERMA">Merma General</option>
                  <option value="CADUCIDAD">Caducidad</option>
                  <option value="EXTRAVIO">Extravío / Robo</option>
                  <option value="ROTURA">Rotura o Daño</option>
                  <option value="AJUSTE">Ajuste por Conteo</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cantidad a ajustar <span style={{ color: 'red' }}>*</span></label>
              <input 
                type="number" 
                min="0.01" 
                step="0.01" 
                className="form-input" 
                value={formData.cantidad_ajuste}
                onChange={(e) => setFormData({...formData, cantidad_ajuste: e.target.value})}
                placeholder="Ej. 2.00"
                disabled={saving}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notas o Respaldo</label>
              <textarea 
                className="form-input"
                rows="2"
                placeholder="Explicación detallada del por qué..."
                value={formData.notas}
                onChange={(e) => setFormData({...formData, notas: e.target.value})}
                disabled={saving}
              ></textarea>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,77,79,0.1)', color: 'var(--danger-color)', padding: '10px', borderRadius: '6px', fontSize: '13px', marginTop: '10px' }}>
                {error}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-danger" disabled={saving}>
              {saving ? 'Procesando...' : 'Aplicar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjusteStockModal;
