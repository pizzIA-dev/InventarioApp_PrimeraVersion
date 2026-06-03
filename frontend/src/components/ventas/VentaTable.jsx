import React from 'react';
import { 
  EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, 
  PlayCircleOutlined, OrderedListOutlined, EyeOutlined, HistoryOutlined,
  CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';

const VentaTable = ({ 
  activeTab, 
  data, 
  onViewDetail, 
  onEdit, 
  onDelete, 
  onConfirm, 
  onStart, 
  onComplete, 
  onCancel, 
  onViewHistory 
}) => {
  if (activeTab === 'PRODUCTOS') {
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Fecha</th>
              <th style={{ width: '120px' }}>Comprobante</th>
              <th>Cliente</th>
              <th>Producto</th>
              <th style={{ width: '110px' }}>Estado</th>
              <th style={{ textAlign: 'right', width: '90px' }}>Total</th>
              <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((venta) => (
              <tr key={venta.id}>
                <td>{new Date(venta.creado_en).toLocaleDateString()}</td>
                <td>
                  <div style={{ fontWeight: 'bold' }}>{venta.numero_comprobante_simple || 'S/N'}</div>
                  <div style={{ fontSize: '10px', color: '#8c8c8c' }}>COMPROBANTE SIMPLE</div>
                  {venta.tipo_comprobante && venta.tipo_comprobante !== 'SIMPLE' && (
                    <div style={{ marginTop: '4px', borderTop: '1px dashed #ddd', paddingTop: '2px' }}>
                      <div style={{ fontWeight: 'bold', color: '#1677ff' }}>{venta.numero_comprobante}</div>
                      <div style={{ fontSize: '10px', color: '#1677ff' }}>{venta.tipo_comprobante}</div>
                    </div>
                  )}
                </td>
                <td>{venta.cliente_nombre || 'Cliente General'}</td>
                <td style={{ textAlign: "center" }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => onViewDetail(venta)}
                    title="Ver Detalle de Productos"
                    style={{ padding: "4px 8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <OrderedListOutlined />
                    <span>Ver Productos</span>
                  </button>
                </td>
                <td>
                  <span className={`badge ${
                    venta.estado === "CONFIRMADA" ? "badge-success" :
                    venta.estado === "CANCELADA" ? "badge-danger" : "badge-warning"
                  }`}>
                    {venta.estado}
                  </span>
                </td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>S/. {Number(venta.total || 0).toFixed(2)}</td>
                <td style={{ whiteSpace: "nowrap" }}><div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <button className="btn btn-secondary btn-sm btn-icon" onClick={() => onViewHistory(venta, 'producto')} title="Ver Historial/Kardex">
                    <HistoryOutlined />
                  </button>
                  {venta.estado === "BORRADOR" && (
                    <button className="btn btn-success btn-sm btn-icon" onClick={() => onConfirm(venta.id)} title="Confirmar venta">
                      <CheckOutlined />
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm btn-icon" onClick={() => onEdit("edit", venta)} title="Editar">
                    <EditOutlined />
                  </button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(venta)} title="Eliminar">
                    <DeleteOutlined />
                  </button>
                </div></td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay ventas registradas que coincidan con los filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // SERVICIOS Table
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th style={{ width: '110px' }}>Fecha</th>
            <th style={{ width: '120px' }}>Comprobante</th>
            <th>Servicio</th>
            <th>Cliente</th>
            <th>F. Programada</th>
            <th>Estado</th>
            <th style={{ textAlign: 'right' }}>Total</th>
            <th style={{ width: '120px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((venta) => {
            if (!venta) return null;
            return (
              <tr key={venta.id}>
                <td>{venta.creado_en ? new Date(venta.creado_en).toLocaleDateString() : '-'}</td>
                <td>
                  <div style={{ fontWeight: 'bold' }}>{venta.numero_comprobante_simple || 'S/N'}</div>
                  <div style={{ fontSize: '10px', color: '#8c8c8c' }}>COMPROBANTE SIMPLE</div>
                  {venta.tipo_comprobante && venta.tipo_comprobante !== 'SIMPLE' && (
                    <div style={{ marginTop: '4px', borderTop: '1px dashed #ddd', paddingTop: '2px' }}>
                      <div style={{ fontWeight: 'bold', color: '#1677ff' }}>{venta.numero_comprobante}</div>
                      <div style={{ fontSize: '10px', color: '#1677ff' }}>{venta.tipo_comprobante}</div>
                    </div>
                  )}
                </td>
                <td>{venta.servicio_nombre || venta.servicio}</td>
                <td>{venta.cliente_nombre || 'Cliente General'}</td>
                <td>
                  {venta.fecha_programada ? (
                    <div>
                      <div style={{ fontWeight: '500' }}>{new Date(venta.fecha_programada).toLocaleDateString()}</div>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>{new Date(venta.fecha_programada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ) : '-'}
                </td>
                <td>
                  <span className={`badge ${
                    venta.estado === 'TERMINADO' ? 'badge-success' :
                    venta.estado === 'CANCELADO' ? 'badge-danger' :
                    venta.estado === 'EN_PROGRESO' ? 'badge-info' : 'badge-warning'
                  }`}>
                    {venta.estado}
                  </span>
                </td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>S/. {Number(venta.total || 0).toFixed(2)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => onViewHistory(venta, 'servicio')} title="Ver Historial/Kardex">
                      <HistoryOutlined />
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => onViewDetail(venta)} 
                      title="Ver Detalle"
                      style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <EyeOutlined />
                      <span>Ver Detalle</span>
                    </button>
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => onEdit(venta)} title="Editar"><EditOutlined /></button>
                    {venta.estado === 'PENDIENTE' && (
                      <button className="btn btn-primary btn-sm btn-icon" onClick={() => onStart(venta.id)} title="Iniciar"><PlayCircleOutlined /></button>
                    )}
                    {venta.estado === 'EN_PROGRESO' && (
                      <button className="btn btn-success btn-sm btn-icon" onClick={() => onComplete(venta.id)} title="Terminar"><CheckCircleOutlined /></button>
                    )}
                    {(venta.estado === 'PENDIENTE' || venta.estado === 'EN_PROGRESO') && (
                      <button className="btn btn-warning btn-sm btn-icon" onClick={() => onCancel(venta.id)} title="Cancelar"><CloseCircleOutlined /></button>
                    )}
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(venta)} title="Eliminar"><DeleteOutlined /></button>
                  </div>
                </td>
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr><td colSpan="8" style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No hay servicios registrados que coincidan con los filtros</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(VentaTable);
