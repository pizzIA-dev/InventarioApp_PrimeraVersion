import React, { useState } from 'react';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined, 
  StopOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import Pagination from '../Pagination';

const CategoryManagerModal = ({ 
  visible, 
  onClose, 
  categorias, 
  activeTab, 
  onSave, 
  onEdit, 
  onDelete, 
  onToggleActive,
  onViewHistory
}) => {
  const [formData, setFormData] = useState({ nombre: '', tipo: activeTab, descripcion: '', activo: true });
  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const filteredCats = categorias.filter(c => c.tipo === activeTab);
  const totalPages = Math.ceil(filteredCats.length / PAGE_SIZE);
  const paginatedCats = filteredCats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, id: editingId }, mode);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ nombre: '', tipo: activeTab, descripcion: '', activo: true });
    setMode('create');
    setEditingId(null);
  };

  const handleEdit = (cat) => {
    setFormData({ 
      nombre: cat.nombre, 
      tipo: cat.tipo, 
      descripcion: cat.descripcion || '', 
      activo: cat.activo 
    });
    setMode('edit');
    setEditingId(cat.id);
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Gestionar Categorías - {activeTab === 'INGRESO' ? 'Ingresos' : 'Gastos'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Formulario de Creación/Edición */}
          <form onSubmit={handleSubmit} className="card" style={{ padding: '16px', marginBottom: '20px', background: 'var(--bg-secondary)' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>{mode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'}</h4>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input 
                  required 
                  className="form-input" 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                  placeholder="Ej: Alquiler, Préstamos, etc."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select 
                  className="form-input" 
                  value={formData.activo ? 'true' : 'false'}
                  onChange={(e) => setFormData({...formData, activo: e.target.value === 'true'})}
                >
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea 
                className="form-input" 
                value={formData.descripcion} 
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                rows={2}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {mode === 'edit' && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>}
              <button type="submit" className="btn btn-primary">
                {mode === 'create' ? <PlusOutlined /> : <EditOutlined />} 
                {mode === 'create' ? 'Crear Categoría' : 'Guardar Cambios'}
              </button>
            </div>
          </form>

          {/* Tabla de Categorías */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCats.map(cat => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 600 }}>{cat.nombre}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cat.descripcion || '—'}</td>
                    <td>
                      <span className={`status-badge ${cat.activo ? 'status-confirmed' : 'status-cancelled'}`}>
                        {cat.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-secondary" onClick={() => onViewHistory(cat)} title="Ver Historial"><HistoryOutlined /></button>
                        <button className="btn btn-secondary" onClick={() => handleEdit(cat)} title="Editar"><EditOutlined /></button>
                        <button 
                          className={`btn ${cat.activo ? 'btn-secondary' : 'btn-primary'}`} 
                          onClick={() => onToggleActive(cat)} 
                          title={cat.activo ? 'Desactivar' : 'Activar'}
                        >
                          {cat.activo ? <StopOutlined /> : <CheckCircleOutlined />}
                        </button>
                        <button className="btn btn-danger" onClick={() => onDelete(cat)} title="Eliminar"><DeleteOutlined /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            totalItems={filteredCats.length}
            itemName="categorías"
          />
        </div>
      </div>
    </div>
  );
};

export default CategoryManagerModal;
