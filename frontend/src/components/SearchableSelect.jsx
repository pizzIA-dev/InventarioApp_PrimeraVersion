import React, { useState, useRef, useEffect } from 'react';
import { SearchOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';

const SearchableSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  onActionClick, 
  actionLabel,
  error,
  disabled = false,
  customRender
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    String(opt.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(opt.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => String(opt.id) === String(value));

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    onChange(String(opt.id));
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`searchable-select-container ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      <div 
        className={`form-input searchable-select-trigger ${isOpen ? 'active' : ''} ${error ? 'input-error' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <div className="trigger-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span className={`selected-text ${!selectedOption ? 'placeholder' : ''}`} style={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            color: selectedOption ? 'inherit' : 'var(--text-secondary)'
          }}>
            {selectedOption ? (customRender ? customRender(selectedOption) : selectedOption.nombre) : placeholder}
          </span>
          <span className="arrow" style={{ fontSize: '10px', opacity: 0.5 }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="search-box">
            <SearchOutlined className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="options-list">
            {onActionClick && actionLabel && !searchTerm && (
              <div 
                className="option-item action-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onActionClick();
                  setIsOpen(false);
                }}
              >
                <PlusOutlined style={{ marginRight: '8px' }} />
                {actionLabel}
              </div>
            )}
            
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt.id}
                  className={`option-item ${String(opt.id) === String(value) ? 'selected' : ''} ${opt.disabled ? 'disabled-option' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt);
                  }}
                >
                  <div className="option-info">
                    <div className="option-label">{opt.nombre}</div>
                    {opt.subtitle && <div className="option-subtitle">{opt.subtitle}</div>}
                  </div>
                  {String(opt.id) === String(value) && <CheckOutlined className="selected-icon" />}
                </div>
              ))
            ) : (
              <div className="no-results">No se encontraron resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
