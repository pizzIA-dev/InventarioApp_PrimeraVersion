import { useEffect } from 'react';
import { WarningOutlined, QuestionCircleOutlined } from '@ant-design/icons';

/**
 * Friendly confirmation dialog — theme-aware (light and dark).
 * Props: visible, title, message, onConfirm, onCancel, confirmText, danger
 */
function ConfirmDialog({ visible, title, message, onConfirm, onCancel, confirmText = 'Confirmar', danger = false }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && visible) onCancel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onCancel]);

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 2000 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', borderTop: danger ? '4px solid #ff4d4f' : '4px solid #1677ff' }}
      >
        <div className="modal-header">
          <h3 className="modal-title" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            color: danger ? '#ff4d4f' : 'var(--text-primary)'
          }}>
            {danger
              ? <WarningOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
              : <QuestionCircleOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            }
            {title}
          </h3>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
