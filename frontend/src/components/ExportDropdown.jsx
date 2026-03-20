import React, { useState, useRef, useEffect } from 'react';
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';

/**
 * Reusable Export Dropdown button.
 * 
 * Props:
 *   - onExport(periodo, anio) → called when user picks a period
 *   - label (optional, default: "Exportar Histórico")
 */
const PERIODS = [
  { key: 'trimestre1', label: '📊 Trimestre 1  (Ene – Mar)' },
  { key: 'trimestre2', label: '📊 Trimestre 2  (Abr – Jun)' },
  { key: 'trimestre3', label: '📊 Trimestre 3  (Jul – Sep)' },
  { key: 'trimestre4', label: '📊 Trimestre 4  (Oct – Dic)' },
  null, // separator
  { key: 'semestre1', label: '📁 1er Semestre (Ene – Jun)' },
  { key: 'semestre2', label: '📁 2do Semestre (Jul – Dic)' },
  null,
  { key: 'anual', label: '📅 Año Completo' },
  { key: 'todo',  label: '📋 Historial Completo (todo)' },
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

export default function ExportDropdown({ onExport, label = 'Exportar Histórico' }) {
  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = async (periodKey) => {
    setOpen(false);
    setLoading(true);
    try {
      await onExport(periodKey, periodKey === 'todo' ? undefined : selectedYear);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        className="btn btn-secondary"
        onClick={() => setOpen(!open)}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {loading ? (
          <span style={{ fontSize: '13px' }}>⏳ Generando...</span>
        ) : (
          <>
            <FileExcelOutlined style={{ color: '#1d6f42' }} />
            {label}
            <span style={{ fontSize: '10px', marginLeft: '2px' }}>▼</span>
          </>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          zIndex: 999,
          background: 'var(--card-background, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          minWidth: '260px',
          overflow: 'hidden',
        }}>
          {/* Year selector */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color, #334155)', background: 'rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginRight: '8px' }}>Año:</span>
            {YEARS.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                style={{
                  marginRight: '4px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  background: selectedYear === y ? 'var(--primary, #2563eb)' : 'rgba(255,255,255,0.08)',
                  color: selectedYear === y ? '#fff' : 'var(--text-muted, #94a3b8)',
                  fontWeight: selectedYear === y ? 600 : 400,
                }}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Period options */}
          <div style={{ padding: '6px 0' }}>
            {PERIODS.map((p, i) => p === null ? (
              <div key={`sep-${i}`} style={{ height: '1px', background: 'var(--border-color, #334155)', margin: '4px 10px' }} />
            ) : (
              <button
                key={p.key}
                onClick={() => handleSelect(p.key)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 16px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'var(--text-primary, #e2e8f0)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-color, #334155)', fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
            <DownloadOutlined style={{ marginRight: '4px' }} /> Descarga en formato Excel (.xlsx)
          </div>
        </div>
      )}
    </div>
  );
}
