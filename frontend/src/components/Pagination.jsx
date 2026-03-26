import React from 'react';

/**
 * Componente de Paginación Estandarizado
 * Basado en la estética del módulo de Proveedores.
 */
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  pageSize, 
  totalItems, 
  itemName = 'registros' 
}) => {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const showPages = 1; // Páginas alrededor de la actual

    // Siempre incluir la primera y última
    pages.push(1);
    
    // Rango alrededor de la actual
    for (let i = Math.max(2, currentPage - showPages); i <= Math.min(totalPages - 1, currentPage + showPages); i++) {
      pages.push(i);
    }
    
    pages.push(totalPages);

    const uniquePages = [...new Set(pages)].sort((a, b) => a - b);
    const result = [];
    
    for (let i = 0; i < uniquePages.length; i++) {
      if (i > 0 && uniquePages[i] !== uniquePages[i - 1] + 1) {
        result.push('...');
      }
      result.push(uniquePages[i]);
    }
    
    return result;
  };

  return (
    <div style={{ 
      padding: '16px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderTop: '1px solid var(--border-color, #e2e8f0)'
    }}>
      <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
        Mostrando <span style={{ fontWeight: 600 }}>{start}–{end}</span> de <span style={{ fontWeight: 600 }}>{totalItems}</span> {itemName}
      </div>
      
      {/* Controls: Always show if we have items, to maintain aesthetic consistency across modules */}
      {totalItems > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{ padding: '4px 12px', fontSize: '12px' }}
          >
            Anterior
          </button>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            {getPageNumbers().map((pg, index) => (
              pg === '...' ? (
                <span key={`sep-${index}`} style={{ color: 'var(--text-muted)', alignSelf: 'center', padding: '0 4px' }}>...</span>
              ) : (
                <button
                  key={pg}
                  className={`btn ${pg === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onPageChange(pg)}
                  style={{ padding: '4px 10px', fontSize: '12px', minWidth: '34px', fontWeight: pg === currentPage ? 600 : 400 }}
                >
                  {pg}
                </button>
              )
            ))}
          </div>
          
          <button
            className="btn btn-secondary"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{ padding: '4px 12px', fontSize: '12px' }}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
