import React from 'react';
import SearchableSelect from '../SearchableSelect';

const VentaFilters = ({
  activeTab,
  searchTerm,
  onSearchChange,
  filterFechaInicio,
  onFilterFechaInicio,
  filterFechaFin,
  onFilterFechaFin,
  filterEstado,
  onFilterEstadoChange,
  filterServicio,
  onFilterServicioChange,
  servicios = [],
  onClear
}) => {
  return (
    <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Buscar</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar por cliente o comprobante..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div style={{ width: '150px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Desde</label>
          <input 
            type="date" 
            className="form-input" 
            value={filterFechaInicio}
            onChange={(e) => onFilterFechaInicio(e.target.value)}
          />
        </div>
        <div style={{ width: '150px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Hasta</label>
          <input 
            type="date" 
            className="form-input" 
            value={filterFechaFin}
            onChange={(e) => onFilterFechaFin(e.target.value)}
          />
        </div>
        <div style={{ width: '200px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Estado</label>
          <select 
            className="form-input" 
            value={filterEstado}
            onChange={(e) => onFilterEstadoChange(e.target.value)}
          >
            <option value="ALL">Todos los estados</option>
            {activeTab === 'PRODUCTOS' ? (
              <>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="BORRADOR">Borrador</option>
                <option value="CANCELADA">Cancelada</option>
              </>
            ) : (
              <>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROGRESO">En Progreso</option>
                <option value="TERMINADO">Terminado</option>
                <option value="CANCELADO">Cancelado</option>
              </>
            )}
          </select>
        </div>
        {activeTab === 'SERVICIOS' && (
          <div style={{ width: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Servicio</label>
            <SearchableSelect
              options={[{id: 'ALL', nombre: 'Todos los servicios'}, ...servicios]}
              value={filterServicio}
              onChange={(val) => onFilterServicioChange(val)}
              placeholder="Todos los servicios"
            />
          </div>
        )}
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

export default React.memo(VentaFilters);
