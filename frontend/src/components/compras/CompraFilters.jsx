import React from 'react';

const CompraFilters = ({
  searchProveedor,
  setSearchProveedor,
  searchComprobante,
  setSearchComprobante,
  filterFechaInicio,
  setFilterFechaInicio,
  filterFechaFin,
  setFilterFechaFin,
  filterEstado,
  setFilterEstado,
  onClear
}) => {
  return (
    <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Proveedor</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar proveedor..." 
            value={searchProveedor}
            onChange={(e) => setSearchProveedor(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Comprobante</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Nro comprobante..." 
            value={searchComprobante}
            onChange={(e) => setSearchComprobante(e.target.value)}
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
        <div style={{ width: '180px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Estado</label>
          <select 
            className="form-input" 
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="ALL">TODOS</option>
            <option value="CONFIRMADA">CONFIRMADA</option>
            <option value="BORRADOR">BORRADOR</option>
            <option value="CANCELADA">CANCELADA</option>
          </select>
        </div>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={onClear}
          title="Limpiar filtros"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
};

export default CompraFilters;
