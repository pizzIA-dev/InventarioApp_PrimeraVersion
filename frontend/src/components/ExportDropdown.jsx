import React, { useState, useRef, useEffect } from 'react';
import { DownloadOutlined, FileExcelOutlined, CaretDownOutlined } from '@ant-design/icons';

/**
 * Reusable Export Dropdown button — theme-aware (light & dark).
 *
 * Props:
 *   - onExport(periodo, anio)  called when user picks a period
 *   - label (optional, default: "Exportar Historico")
 */

const PERIODS = [
  { key: 'trimestre1', label: 'T1 — Trimestre 1  (Ene – Mar)' },
  { key: 'trimestre2', label: 'T2 — Trimestre 2  (Abr – Jun)' },
  { key: 'trimestre3', label: 'T3 — Trimestre 3  (Jul – Sep)' },
  { key: 'trimestre4', label: 'T4 — Trimestre 4  (Oct – Dic)' },
  null,
  { key: 'semestre1', label: 'S1 — 1er Semestre (Ene – Jun)' },
  { key: 'semestre2', label: 'S2 — 2do Semestre (Jul – Dic)' },
  null,
  { key: 'anual', label: 'Año Completo' },
  { key: 'todo',  label: 'Historial Completo (todo)'  },
];

const currentYear  = new Date().getFullYear();
const YEARS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

export default function ExportDropdown({ onExport, label = 'Exportar Historico' }) {
  const [open, setOpen]           = useState(false);
  const [selectedYear, setYear]   = useState(currentYear);
  const [loading, setLoading]     = useState(false);
  const ref = useRef(null);

  /* close on outside click */
  useEffect(() => {
    const onOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
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

      {/* Trigger button */}
      <button
        className="btn btn-secondary"
        onClick={() => setOpen(!open)}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {loading ? (
          <span style={{ fontSize: '13px' }}>Generando…</span>
        ) : (
          <>
            <FileExcelOutlined style={{ color: '#1d6f42' }} />
            {label}
            <CaretDownOutlined style={{
              fontSize: 10, marginLeft: 2,
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </>
        )}
      </button>

      {/* Dropdown panel — uses --bg-card which is defined for BOTH light and dark */}
      {open && (
        <div
          className="export-dropdown-panel"
          style={{
            position:     'absolute',
            top:          'calc(100% + 6px)',
            right:        0,
            zIndex:       9999,
            minWidth:     '262px',
            borderRadius: '10px',
            overflow:     'hidden',
            /* theme-aware: --bg-card is #ffffff light / #0b1121 dark */
            background:   'var(--bg-card)',
            border:       '1px solid var(--border-color)',
            boxShadow:    '0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          {/* Year selector row */}
          <div style={{
            padding:      '10px 14px',
            borderBottom: '1px solid var(--border-color)',
            background:   'var(--bg-table-header)',
            display:      'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: 4 }}>
              Año:
            </span>
            {YEARS.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                style={{
                  padding:      '3px 9px',
                  borderRadius: '4px',
                  border:       'none',
                  cursor:       'pointer',
                  fontSize:     '12px',
                  fontWeight:   selectedYear === y ? 700 : 400,
                  background:   selectedYear === y ? '#1677ff' : 'var(--bg-table-header)',
                  color:        selectedYear === y ? '#fff' : 'var(--text-secondary)',
                  outline:      selectedYear === y ? 'none' : '1px solid var(--border-color)',
                  transition:   'all 0.15s',
                }}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Period options */}
          <div style={{ padding: '6px 0' }}>
            {PERIODS.map((p, i) =>
              p === null ? (
                <div
                  key={`sep-${i}`}
                  style={{ height: '1px', background: 'var(--border-color)', margin: '4px 12px', opacity: 0.6 }}
                />
              ) : (
                <button
                  key={p.key}
                  onClick={() => handleSelect(p.key)}
                  style={{
                    display:    'block',
                    width:      '100%',
                    padding:    '9px 16px',
                    textAlign:  'left',
                    background: 'transparent',
                    border:     'none',
                    cursor:     'pointer',
                    fontSize:   '13px',
                    color:      'var(--text-primary)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-row-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {p.label}
                </button>
              )
            )}
          </div>

          {/* Footer hint */}
          <div style={{
            padding:      '8px 14px',
            borderTop:    '1px solid var(--border-color)',
            background:   'var(--bg-table-header)',
            fontSize:     '11px',
            color:        'var(--text-muted)',
            display:      'flex', alignItems: 'center', gap: 6,
          }}>
            <DownloadOutlined />
            Descarga en formato Excel (.xlsx)
          </div>
        </div>
      )}
    </div>
  );
}
