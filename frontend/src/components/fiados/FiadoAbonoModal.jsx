import { useState } from 'react';

function FiadoAbonoModal({ visible, fiado, onClose, onSave }) {
  const [formData, setFormData] = useState({
    monto: fiado?.saldo_pendiente || 0,
    notas: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (Number(formData.monto) <= 0) {
      alert('El monto del abono debe ser mayor a 0');
      return;
    }
    if (Number(formData.monto) > Number(fiado.saldo_pendiente)) {
      alert('El abono no puede ser mayor al saldo pendiente');
      return;
    }
    onSave(formData);
  };

  if (!visible || !fiado) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '450px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Registrar Abono</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ marginBottom: '24px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Cliente: <strong>{fiado.cliente_nombre}</strong></p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Total Deuda</span>
                  <span style={{ fontWeight: '600', fontSize: '16px' }}>S/ {Number(fiado.total).toFixed(2)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Saldo Pendiente</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--danger-color)' }}>S/ {Number(fiado.saldo_pendiente).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Monto a Abonar (S/.) *</label>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                  onClick={() => setFormData(prev => ({ ...prev, monto: fiado.saldo_pendiente }))}
                >
                  💰 Saldo Total
                </button>
              </div>
              <input 
                type="number" 
                name="monto" 
                className="form-input" 
                value={formData.monto} 
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                min="0.01"
                max={fiado.saldo_pendiente}
                step="0.01"
                required
                style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Al completar el pago total (S/. {Number(fiado.saldo_pendiente).toFixed(2)}), se abrirá automáticamente el formulario de venta formal.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notas o Comentarios</label>
              <textarea 
                name="notas" 
                className="form-input" 
                value={formData.notas} 
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--success-color)' }}>Procesar Abono</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FiadoAbonoModal;
