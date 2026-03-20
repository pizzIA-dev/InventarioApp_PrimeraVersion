import { useEffect } from 'react';

/**
 * Friendly visual confirmation dialog instead of browser window.confirm()
 * Usage: 
 *    <ConfirmDialog
 *      visible={confirmVisible}
 *      title="Eliminar Producto"
 *      message="¿Estás seguro de que deseas eliminar 'Laptop HP'? Esta acción no se puede deshacer."
 *      onConfirm={() => { doDelete(); setConfirmVisible(false); }}
 *      onCancel={() => setConfirmVisible(false)}
 *      confirmText="Sí, eliminar"
 *      danger={true}
 *    />
 */
function ConfirmDialog({ visible, title, message, onConfirm, onCancel, confirmText = 'Confirmar', danger = false }) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && visible) onCancel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onCancel]);

  if (!visible) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      style={{ zIndex: 2000 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', borderTop: danger ? '4px solid #ff4d4f' : '4px solid #1890ff' }}
      >
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: danger ? '#ff4d4f' : 'inherit' }}>
            {danger ? '⚠️ ' : 'ℹ️ '}{title}
          </h3>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, color: '#555', lineHeight: 1.6, fontSize: '15px' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
