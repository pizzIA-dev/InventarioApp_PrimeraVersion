import React from 'react';
import { 
  HistoryOutlined, 
  EditOutlined, 
  DeleteOutlined 
} from '@ant-design/icons';
import Pagination from '../Pagination';

const MovimientoTable = ({ 
  data, 
  activeTab, 
  onViewAudit, 
  onEdit, 
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems
}) => {
  return (
    <div className="card">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha de Creación</th>
              <th>{activeTab === 'INGRESO' ? 'Nombre del Ingreso' : 'Nombre del Gasto'}</th>
              <th>Descripción</th>
              <th>Método de Pago</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id}>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>#{t.id}</td>
                <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {t.creado_en ? new Date(t.creado_en).toLocaleString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date(t.fecha).toLocaleDateString()}
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: t.tipo === 'INGRESO' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {t.categoria_nombre || '—'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {t.descripcion || '—'}
                </td>
                <td>
                  <span style={{ fontSize: '12px' }}>{t.metodo_pago}</span>
                </td>
                <td style={{ fontWeight: 'bold', textAlign: 'right', color: t.tipo === 'INGRESO' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {t.tipo === 'INGRESO' ? '+' : '-'}S/. {Number(t.monto || 0).toFixed(2)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onViewAudit(t)}
                      title="Ver Historial"
                      style={{ padding: '6px 10px' }}
                    >
                      <HistoryOutlined />
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onEdit(t)}
                      title="Editar"
                      style={{ padding: '6px 10px' }}
                    >
                      <EditOutlined />
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => onDelete(t)}
                      title="Eliminar"
                      style={{ padding: '6px 10px' }}
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                </td>

              </tr>
            ))}
            {totalItems === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: '#aaa', padding: '40px' }}>
                  No hay {activeTab === 'INGRESO' ? 'ingresos no operativos' : 'gastos'} registrados que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        totalItems={totalItems}
        itemName={activeTab === 'INGRESO' ? 'ingresos' : 'gastos'}
      />
    </div>
  );
};

export default MovimientoTable;
