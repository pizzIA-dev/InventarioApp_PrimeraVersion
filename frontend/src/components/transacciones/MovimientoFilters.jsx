import React from 'react';
import SearchableSelect from '../SearchableSelect';

const MovimientoFilters = ({ 
  searchTerm, 
  setSearchTerm, 
  filterFechaInicio, 
  setFilterFechaInicio, 
  filterFechaFin, 
  setFilterFechaFin, 
  filterCategoria, 
  setFilterCategoria, 
  categorias, 
  activeTab, 
  onClear 
}) => {
  return (
    <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>
            {activeTab === 'INGRESO' ? 'Nombre del Ingreso' : 'Nombre del Gasto'}
          </label>
          <input
            type="text"
            className="form-input"
            placeholder={activeTab === 'INGRESO' ? 'Buscar por nombre...' : 'Buscar por nombre...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ width: '150px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Desde</label>
          <input
            type="date"
            className="form-input"
            value={filterFechaInicio}
            onChange={(e) => setFilterFechaInicio(e.target.value)}
          />
        </div>
        <div style={{ width: '150px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Hasta</label>
          <input
            type="date"
            className="form-input"
            value={filterFechaFin}
            onChange={(e) => setFilterFechaFin(e.target.value)}
          />
        </div>
        <div style={{ width: '200px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Categoría</label>
          <SearchableSelect
              options={[{id: 'ALL', nombre: 'Todas las categorías'}, ...categorias]}
              value={filterCategoria}
              onChange={(val) => setFilterCategoria(val)}
              placeholder="Todas las categorías"
            />
        </div>
        <button
          className="btn btn-secondary"
          style={{ height: '38px' }}
          onClick={onClear}
          title="Limpiar filtros"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
};

export default MovimientoFilters;
