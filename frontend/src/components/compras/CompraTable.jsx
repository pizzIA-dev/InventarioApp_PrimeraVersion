import { OrderedListOutlined, EyeOutlined, DownloadOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, HistoryOutlined } from '@ant-design/icons';
import Pagination from '../Pagination';

const CompraTable = ({ 
  data, 
  onViewDetail, 
  onViewHistory, 
  onEdit, 
  onDelete, 
  onConfirm, 
  onCancel,
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
              <th style={{ width: '110px' }}>Fecha</th>
              <th style={{ width: '130px' }}>Comprobante</th>
              <th>Proveedor</th>
              <th style={{ textAlign: 'center' }}>Productos</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Archivo</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ width: '130px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No se encontraron compras que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              data.map((compra) => (
                <tr key={compra.id}>
                  <td>{new Date(compra.creado_en).toLocaleDateString()}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{compra.numero_comprobante || 'S/N'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      {compra.tipo_comprobante || 'Sin tipo'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{compra.proveedor_nombre || 'Proveedor General'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <span style={{ opacity: 0.7 }}>Tipo:</span> {compra.tipo_compra}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => onViewDetail(compra)}
                      title="Ver Detalle de Productos"
                      style={{ margin: '0 auto', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <OrderedListOutlined />
                      <span>Ver Productos</span>
                    </button>
                  </td>
                  <td>
                    {compra.comprobante_archivo ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <a 
                          href={compra.comprobante_archivo} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-secondary btn-sm btn-icon" 
                          title="Ver Comprobante"
                          style={{ width: '28px', height: '28px' }}
                        >
                          <EyeOutlined />
                        </a>
                        <a 
                          href={compra.comprobante_archivo} 
                          download 
                          className="btn btn-secondary btn-sm btn-icon" 
                          title="Descargar Comprobante"
                          style={{ width: '28px', height: '28px' }}
                        >
                          <DownloadOutlined />
                        </a>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px', fontStyle: 'italic' }}>
                        Sin archivo
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      compra.estado === 'CONFIRMADA' ? 'badge-success' :
                      compra.estado === 'CANCELADA' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {compra.estado}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>S/. {Number(compra.total || 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => onViewHistory(compra)} title="Ver Historial/Kardex">
                        <HistoryOutlined />
                      </button>
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => onEdit(compra)} title="Editar">
                        <EditOutlined />
                      </button>
                      {compra.estado === 'BORRADOR' && (
                        <button className="btn btn-success btn-sm btn-icon" onClick={() => onConfirm(compra)} title="Confirmar Compra">
                          <CheckOutlined />
                        </button>
                      )}
                      {compra.estado === 'CONFIRMADA' && (
                        <button className="btn btn-warning btn-sm btn-icon" onClick={() => onCancel(compra)} title="Cancelar/Anular Compra">
                          <CloseOutlined />
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(compra)} title="Eliminar Compra">
                        <DeleteOutlined />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
      />
    </div>
  );
};

export default CompraTable;
