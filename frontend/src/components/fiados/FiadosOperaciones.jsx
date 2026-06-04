import { useState, useEffect, useContext } from 'react';
import { fiadosAPI, ventasAPI, serviciosAPI, productosAPI, clientesAPI } from '../../services/api';
import { PlusOutlined, EditOutlined, DollarOutlined, EyeOutlined, CheckCircleOutlined, DeleteOutlined, CloseOutlined, HistoryOutlined } from '@ant-design/icons';
import { message } from 'antd';
import FiadoOperacionFormModal from './FiadoOperacionFormModal';
import FiadoAbonoModal from './FiadoAbonoModal';
import ConfirmDialog from '../ConfirmDialog';
import VentaFormModal from '../ventas/VentaFormModal';
import ServicioVentaFormModal from '../ventas/ServicioVentaFormModal';
import ClienteFormModal from '../ClienteFormModal';
import ProductFormModal from '../ProductFormModal';
import FiadoHistorialModal from './FiadoHistorialModal';
import FiadoDetailModal from './FiadoDetailModal';
import ExportDropdown from '../ExportDropdown';
import { AuthContext } from '../../context/AuthContext';

function FiadosOperaciones() {
  const { isVendedor } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [fiados, setFiados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clientesRegulares, setClientesRegulares] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [filterTipo, setFilterTipo] = useState('ALL');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  
  // Historial Kardex Modal
  const [historialModalVisible, setHistorialModalVisible] = useState(false);
  const [fiadoForHistorial, setFiadoForHistorial] = useState(null);
  
  // Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [fiadoForDetail, setFiadoForDetail] = useState(null);
  
  // Modals
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [abonoModalVisible, setAbonoModalVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  
  const [selectedFiado, setSelectedFiado] = useState(null);
  const [fiadoToDelete, setFiadoToDelete] = useState(null);
  const [fiadoToCancel, setFiadoToCancel] = useState(null);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  
  // Sales Formalization Modals
  const [ventaModalVisible, setVentaModalVisible] = useState(false);
  const [servicioModalVisible, setServicioModalVisible] = useState(false);
  const [initialVentaData, setInitialVentaData] = useState(null);
  const [clienteModalVisible, setClienteModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Keep clientesRegulares in sync with clientes (same table now):
  useEffect(() => {
    setClientesRegulares(clientes);
  }, [clientes]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch independently so a failure in one does not block the others:
    try {
      const fiadosRes = await fiadosAPI.getFiados();
      setFiados(fiadosRes.data.results || fiadosRes.data);
    } catch (e) { console.error('Error fetching fiados:', e); }

    try {
      const clientesRes = await clientesAPI.getAll({ page_size: 999 });
      setClientes(clientesRes.data.results || clientesRes.data);
    } catch (e) { console.error('Error fetching clientes:', e); }

    try {
      const productosRes = await productosAPI.getAll({ page_size: 999 });
      setProductos(productosRes.data.results || productosRes.data);
    } catch (e) { console.error('Error fetching productos:', e); }

    try {
      const serviciosRes = await serviciosAPI.getAll({ page_size: 999 });
      setServicios(serviciosRes.data.results || serviciosRes.data);
    } catch (e) { console.error('Error fetching servicios:', e); }

    // clientesRegulares = same as clientes (unified client table)
    // setClientesRegulares is handled above via setClientes

    setLoading(false);
  };

  const openFormModal = (fiado = null) => {
    setSelectedFiado(fiado);
    setFormModalVisible(true);
  };

  const closeFormModal = () => {
    setFormModalVisible(false);
    setSelectedFiado(null);
  };

  const openAbonoModal = (fiado) => {
    setSelectedFiado(fiado);
    setAbonoModalVisible(true);
  };

  const closeAbonoModal = () => {
    setAbonoModalVisible(false);
    setSelectedFiado(null);
  };

  const handleFormSubmit = async (data) => {
    try {
      if (selectedFiado) {
        await fiadosAPI.updateFiado(selectedFiado.id, data);
        message.success('Fiado actualizado correctamente');
      } else {
        await fiadosAPI.createFiado(data);
        message.success('Operación de fiado registrada correctamente');
      }
      closeFormModal();
      fetchData();
    } catch (error) {
      console.error('Error creating/updating fiado:', error);
      message.error(error.response?.data?.error || 'Error al procesar el fiado.');
    }
  };

  const handleDeleteClick = (fiado) => {
    setFiadoToDelete(fiado);
    setConfirmDeleteVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fiadoToDelete) return;
    try {
      await fiadosAPI.deleteFiado(fiadoToDelete.id);
      message.success('Operación de fiado eliminada y stock revertido si aplicaba');
      setConfirmDeleteVisible(false);
      setFiadoToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting fiado:', error);
      message.error(error.response?.data?.error || 'Error al eliminar el fiado.');
    }
  };

  const handleCancelClick = (fiado) => {
    setFiadoToCancel(fiado);
    setConfirmCancelVisible(true);
  };

  const handleCancelConfirm = async () => {
    if (!fiadoToCancel) return;
    try {
      await fiadosAPI.cancelarFiado(fiadoToCancel.id);
      message.success('Operación cancelada y stock revertido correctamente');
      setConfirmCancelVisible(false);
      setFiadoToCancel(null);
      fetchData();
    } catch (error) {
      console.error('Error cancelando fiado:', error);
      message.error(error.response?.data?.error || 'Error al cancelar el fiado.');
    }
  };

  const handleReactivar = async (id) => {
    try {
      await fiadosAPI.reactivarFiado(id);
      message.success('Operación reactivada y stock descontado correctamente');
      closeFormModal();
      fetchData();
    } catch (error) {
      console.error('Error reactivando fiado:', error);
      message.error(error.response?.data?.error || 'Error al reactivar el fiado.');
    }
  };

  const handleAbonoSubmit = async (fiadoId, data) => {
    try {
      const response = await fiadosAPI.abonarFiado(fiadoId, data);
      const updatedFiado = response.data;
      message.success('Abono registrado con éxito');
      closeAbonoModal();
      fetchData();

      // AUTO-FORMALIZATION: If liquidated, open the sale form modal
      if (updatedFiado.estado === 'LIQUIDADO') {
        const fiado = updatedFiado;
        if (fiado.tipo === 'PRODUCTO') {
          // Construct initial data for VentaFormModal
          const cg = clientesRegulares.find(c => c.numero_documento === '00000000');
          const saleData = {
            fromFiado: fiado.id,
            cliente: cg ? String(cg.id) : '',
            cliente_nombre: fiado.cliente_nombre || (cg ? cg.nombre : ''),
            tipo_comprobante: 'SIMPLE',
            estado: 'CONFIRMADA',
            descuento: 0,
            impuesto: 0,
            notas: fiado.notas || '',
            detalle: (fiado.detalles_producto || []).map(d => ({
              producto: String(d.producto),
              cantidad: Number(d.cantidad),
              precio_venta: Number(d.precio_unidad),
              descuento: 0
            }))
          };
          setInitialVentaData(saleData);
          setVentaModalVisible(true);
        } else if (fiado.tipo === 'SERVICIO') {
          // Construct initial data for ServicioVentaFormModal
          if (fiado.detalles_servicio && fiado.detalles_servicio.length > 0) {
            const srv = fiado.detalles_servicio[0];
            const cg = clientesRegulares.find(c => c.numero_documento === '00000000');
            const saleData = {
              fromFiado: fiado.id,
              cliente: cg ? String(cg.id) : '',
              cliente_nombre: fiado.cliente_nombre || (cg ? cg.nombre : ''),
              servicio: String(srv.servicio),
              servicio_nombre: srv.servicio_nombre,
              precio: Number(fiado.total),
              descuento: 0,
              impuesto: 0,
              tipo_comprobante: 'SIMPLE',
              estado: 'TERMINADO',
              notas: fiado.notas || ''
            };
            setInitialVentaData(saleData);
            setServicioModalVisible(true);
          }
        }
      }
    } catch (error) {
      console.error('Error procesando abono:', error);
      message.error(error.response?.data?.error || 'Error al procesar el abono.');
    }
  };

  const handleManualRegistrarVenta = (fiado) => {
    // Reusing the same automatic logic for manual button click
    if (fiado.estado !== 'LIQUIDADO') {
      message.warning('Primero liquide el fiado para formalizar la venta.');
      return;
    }

    if (fiado.tipo === 'PRODUCTO') {
       const cg = clientesRegulares.find(c => c.numero_documento === '00000000');
       setInitialVentaData({
          fromFiado: fiado.id,
          cliente: cg ? String(cg.id) : '',
          cliente_nombre: fiado.cliente_nombre || (cg ? cg.nombre : ''),
          tipo_comprobante: 'SIMPLE',
          estado: 'CONFIRMADA',
          descuento: 0,
          impuesto: 0,
          notas: fiado.notas || '',
          detalle: (fiado.detalles_producto || []).map(d => ({
            producto: String(d.producto),
            cantidad: Number(d.cantidad),
            precio_venta: Number(d.precio_unidad),
            descuento: 0
          }))
       });
       setVentaModalVisible(true);
    } else {
       if (fiado.detalles_servicio && fiado.detalles_servicio.length > 0) {
          const srv = fiado.detalles_servicio[0];
          const cg = clientesRegulares.find(c => c.numero_documento === '00000000');
          setInitialVentaData({
             fromFiado: fiado.id,
             cliente: cg ? String(cg.id) : '',
             cliente_nombre: fiado.cliente_nombre || (cg ? cg.nombre : ''),
             servicio: String(srv.servicio),
             servicio_nombre: srv.servicio_nombre,
             precio: Number(fiado.total),
             descuento: 0,
             impuesto: 0,
             tipo_comprobante: 'SIMPLE',
             estado: 'TERMINADO',
             notas: fiado.notas || ''
          });
          setServicioModalVisible(true);
       }
    }
  };

  const handleRegistrarVenta = async (fiado) => {
    if (fiado.estado !== 'LIQUIDADO' && fiado.estado !== 'PAGADO_TOTAL') {
      message.warning('Solo se pueden registrar como venta los fiados liquidados al 100%');
      return;
    }
    
    if (fiado.venta_ref || fiado.venta_servicio_ref) {
      message.info('Este fiado ya fue registrado como venta formal.');
      return;
    }
    
    if (window.confirm(`¿Convertir este fiado liquidado de ${fiado.cliente_nombre} en una Venta Formal?`)) {
      try {
        if (fiado.tipo === 'PRODUCTO') {
          // Preparamos payload de venta regular
          const detalleVentas = fiado.detalles_producto.map(d => ({
            producto: d.producto,
            cantidad: d.cantidad,
            precio_venta: d.precio_unidad,
            descuento: 0,
            subtotal: d.subtotal
          }));
          
          const payload = {
            origen_fiado_id: fiado.id, // Para enlazar en backend y saltar descuento stock
            tipo_comprobante: 'SIMPLE',
            metodo_pago: 'EFECTIVO', // O podría ser MULTIPLE si consideramos los abonos
            total: fiado.total,
            estado: 'BORRADOR',
            detalles: detalleVentas
          };
          
          await ventasAPI.create(payload);
          message.success('Venta procesada exitosamente.');
          
        } else if (fiado.tipo === 'SERVICIO') {
          // ... (existing logic)
          if (fiado.detalles_servicio.length > 0) {
            const srv = fiado.detalles_servicio[0];
            const payload = {
              origen_fiado_id: fiado.id,
              servicio: srv.servicio,
              tipo_comprobante: 'SIMPLE',
              estado: 'PENDIENTE',
              precio: fiado.total,
              descuento: 0,
              impuesto: 0
            };
            await serviciosAPI.createVenta(payload);
            message.success('Venta de Servicio procesada exitosamente.');
          }
        }
        fetchData();
      } catch (error) {
        console.error('Error registrando venta formal', error);
        message.error('Hubo un error al registrar la venta formal.');
      }
    }
  };

  const filteredFiados = fiados.filter(f => {
    const term = searchTerm.toLowerCase();
    const clienteMatch = (f.cliente_nombre || '').toLowerCase().includes(term);
    const idMatch = f.id.toString().includes(term);
    const estadoMatch = filterEstado === 'ALL' ? true : f.estado === filterEstado;
    const tipoMatch = filterTipo === 'ALL' ? true : f.tipo === filterTipo;
    const clienteFiltroMatch = !filterCliente || String(f.cliente) === String(filterCliente);
    
    // Filtro por Fechas
    const saleDate = f.creado_en ? new Date(f.creado_en).toISOString().split('T')[0] : null;
    const dateMatch = (!filterFechaInicio || (saleDate && saleDate >= filterFechaInicio)) &&
                      (!filterFechaFin || (saleDate && saleDate <= filterFechaFin));
    
    return (clienteMatch || idMatch) && estadoMatch && tipoMatch && dateMatch && clienteFiltroMatch;
  });

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case 'PENDIENTE': return <span className="badge badge-danger">Pendiente</span>;
      case 'PAGADO_PARCIAL': return <span className="badge badge-warning">Abono Parcial</span>;
      case 'LIQUIDADO': return <span className="badge badge-success">Liquidado</span>;
      default: return <span className="badge">{estado}</span>;
    }
  };

  const handleExportFiados = async (periodo, anio) => {
    try {
      const response = await fiadosAPI.exportar({ periodo, anio });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_fiados_${periodo}_${anio || 'todo'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exportando fiados', error);
      message.error('No se pudo generar el reporte de fiados.');
    }
  };

  const handleExportHistorialGlobal = async (periodo, anio) => {
    try {
      const response = await fiadosAPI.exportarHistorialGlobal({ periodo, anio });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kardex_global_fiados_${periodo}_${anio || 'todo'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exportando historial global', error);
      message.error('No se pudo generar el historial global.');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isVendedor && (
            <>
              <ExportDropdown 
                label="Exportar Historial Global"
                onExport={handleExportHistorialGlobal}
              />
              <ExportDropdown 
                label="Exportar Fiados"
                onExport={handleExportFiados}
              />
            </>
          )}
          <button className="btn btn-primary" onClick={() => openFormModal()}>
            <PlusOutlined /> Nuevo Fiado
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Buscar</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por cliente o ID fiado..." 
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

          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Estado</label>
            <select className="form-input" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="ALL">Todos los Estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="PAGADO_PARCIAL">Abono Parcial</option>
              <option value="LIQUIDADO">Liquidados</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>

          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Tipo</label>
            <select className="form-input" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
              <option value="ALL">Todos los Tipos</option>
              <option value="PRODUCTO">Productos</option>
              <option value="SERVICIO">Servicios</option>
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Cliente</label>
            <select className="form-input" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
              <option value="">Todos los Clientes</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setSearchTerm('');
              setFilterEstado('ALL');
              setFilterTipo('ALL');
              setFilterFechaInicio('');
              setFilterFechaFin('');
              setFilterCliente('');
            }}
            title="Limpiar Filtros"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Fecha Ingreso</th>
                <th>Cliente Fiado</th>
                <th>Tipo</th>
                <th>Total Deuda</th>
                <th>Saldo Pendiente</th>
                <th>Fecha Límite</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiados.map((fiado) => (
                <tr key={fiado.id}>
                  <td style={{ fontWeight: '500' }}>{fiado.id.toString().padStart(6, '0')}</td>
                  <td>{new Date(fiado.creado_en).toLocaleDateString()}</td>
                  <td>{fiado.cliente_nombre}</td>
                  <td>
                    <span className="badge badge-info">{fiado.tipo}</span>
                  </td>
                  <td style={{ fontWeight: '600' }}>S/ {Number(fiado.total).toFixed(2)}</td>
                  <td style={{ fontWeight: 'bold', color: fiado.saldo_pendiente > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                    S/ {Number(fiado.saldo_pendiente).toFixed(2)}
                  </td>
                  <td style={{ color: fiado.fecha_limite && new Date(fiado.fecha_limite) < new Date() && fiado.estado !== 'LIQUIDADO' ? 'var(--danger-color)' : 'inherit', fontWeight: '500' }}>
                    {fiado.fecha_limite ? new Date(fiado.fecha_limite + 'T12:00:00').toLocaleDateString() : '-'}
                  </td>
                  <td>{getEstadoBadge(fiado.estado)}</td>
                   <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" onClick={() => { setFiadoForDetail(fiado); setDetailModalVisible(true); }} title="Ver Detalle de Productos/Servicios">
                        <EyeOutlined />
                      </button>

                      <button className="btn btn-secondary" onClick={() => { setFiadoForHistorial(fiado); setHistorialModalVisible(true); }} title="Ver Historial (Kardex)">
                        <HistoryOutlined />
                      </button>

                      {fiado.estado !== 'LIQUIDADO' && fiado.estado !== 'CANCELADO' && (
                        <button className="btn btn-primary" onClick={() => openAbonoModal(fiado)} title="Registrar Abono">
                          <DollarOutlined /> Abonar
                        </button>
                      )}
                      
                      <button className="btn btn-secondary" onClick={() => openFormModal(fiado)} title="Editar Detalles">
                        <EditOutlined />
                      </button>

                      {(!fiado.venta_ref && !fiado.venta_servicio_ref && fiado.estado !== 'CANCELADO') && (
                        <button className="btn btn-warning" onClick={() => handleCancelClick(fiado)} title="Cancelar Operación" style={{ color: 'white' }}>
                          <CloseOutlined />
                        </button>
                      )}

                      {!isVendedor && (!fiado.venta_ref && !fiado.venta_servicio_ref) && (
                        <button className="btn btn-danger" onClick={() => handleDeleteClick(fiado)} title="Eliminar Operación">
                          <DeleteOutlined />
                        </button>
                      )}

                      {(fiado.venta_ref || fiado.venta_servicio_ref) ? (
                        <span className="badge badge-success" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircleOutlined /> Venta #{fiado.venta_ref || fiado.venta_servicio_ref}
                        </span>
                      ) : fiado.estado === 'LIQUIDADO' ? (
                        <span className="badge badge-success" style={{ fontSize: '11px' }}>
                          Liquidado
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFiados.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                    No se encontraron operaciones de fiados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FiadoDetailModal 
        visible={detailModalVisible}
        onClose={() => { setDetailModalVisible(false); setFiadoForDetail(null); }}
        fiado={fiadoForDetail}
      />

      <FiadoHistorialModal 
        visible={historialModalVisible}
        onClose={() => { setHistorialModalVisible(false); setFiadoForHistorial(null); }}
        fiado={fiadoForHistorial}
      />

      {formModalVisible && (
        <FiadoOperacionFormModal 
          visible={formModalVisible}
          clientes={clientes}
          initialData={selectedFiado}
          onClose={closeFormModal}
          onSave={handleFormSubmit}
          onReactivar={handleReactivar}
          onNewCliente={(newCliente) => {
            setClientes(prev => 
              prev.find(c => c.id === newCliente.id) ? prev : [...prev, newCliente]
            );
          }}
        />
      )}

      {abonoModalVisible && selectedFiado && (
        <FiadoAbonoModal 
          visible={abonoModalVisible}
          fiado={selectedFiado}
          onClose={closeAbonoModal}
          onSave={(data) => handleAbonoSubmit(selectedFiado.id, data)}
        />
      )}

      <ConfirmDialog 
        visible={confirmDeleteVisible}
        title="Eliminar Operación de Fiado"
        message={`¿Estás seguro de que deseas eliminar la operación #${fiadoToDelete?.id?.toString().padStart(6, '0')}? Esta acción revertirá cualquier salida de stock asociada y borrará el registro de la vista.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setConfirmDeleteVisible(false); setFiadoToDelete(null); }}
        confirmText="Sí, eliminar y revertir"
        danger={true}
      />

      <ConfirmDialog 
        visible={confirmCancelVisible}
        title="Cancelar Operación de Fiado"
        message={`¿Estás seguro de que deseas cancelar la operación #${fiadoToCancel?.id?.toString().padStart(6, '0')}? Su registro se mantendrá como CANCELADO y se revertirá cualquier salida de stock.`}
        onConfirm={handleCancelConfirm}
        onCancel={() => { setConfirmCancelVisible(false); setFiadoToCancel(null); }}
        confirmText="Sí, cancelar y revertir"
        danger={true}
      />

      {/* Sales Portals */}
      <VentaFormModal 
        visible={ventaModalVisible}
        onClose={() => setVentaModalVisible(false)}
        initialData={initialVentaData}
        clientes={clientesRegulares}
        productos={productos}
        onOpenClienteModal={() => setClienteModalVisible(true)}
        onOpenProductModal={() => setProductModalVisible(true)}
        onSave={async (data) => {
          try {
            // Include reference to fiado so backend knows it's a liquidation formalization
            await ventasAPI.create({ ...data, origen_fiado_id: initialVentaData.fromFiado });
            message.success('Venta formalizada exitosamente');
            setVentaModalVisible(false);
            fetchData();
          } catch (err) {
            message.error('Error formalizando venta');
          }
        }}
      />

      <ServicioVentaFormModal
        visible={servicioModalVisible}
        onClose={() => setServicioModalVisible(false)}
        initialData={initialVentaData}
        clientes={clientesRegulares}
        servicios={servicios}
        onOpenClienteModal={() => setClienteModalVisible(true)}
        onSave={async (data) => {
          try {
             await serviciosAPI.createVenta({ ...data, origen_fiado_id: initialVentaData.fromFiado });
             message.success('Servicio formalizado exitosamente');
             setServicioModalVisible(false);
             fetchData();
          } catch (err) {
             message.error('Error formalizando servicio');
          }
        }}
      />

      <ClienteFormModal visible={clienteModalVisible} onClose={() => setClienteModalVisible(false)} onSave={fetchData} />
      <ProductFormModal visible={productModalVisible} onClose={() => setProductModalVisible(false)} onSave={fetchData} />
    </div>
  );
}

export default FiadosOperaciones;