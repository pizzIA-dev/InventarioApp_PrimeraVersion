import { useState, useEffect } from 'react';
import { ventasAPI, almacenesAPI } from '../../services/api';
import SearchableSelect from '../SearchableSelect';

function ServicioVentaFormModal({ 
  visible, 
  onClose, 
  onSave, 
  initialData, 
  clientes, 
  servicios,
  onOpenClienteModal,
  onOpenServicioModal
}) {
  const [formData, setFormData] = useState({
    servicio: '',
    servicio_nombre: '',
    cliente: '',
    cliente_nombre: '',
    precio: 0,
    descuento: 0,
    impuesto: 0,
    fecha_programada: '',
    tipo_comprobante: 'SIMPLE',
    numero_comprobante: '',
    numero_comprobante_simple: '',
    estado: 'PENDIENTE',
    notas: ''
  });

    const [almacenes, setAlmacenes] = useState([]);

  useEffect(() => {
    const fetchAlmacenes = async () => {
      try { const res = await almacenesAPI.getAll(); setAlmacenes(res.data.results || res.data); } catch (error) { console.error('Error fetching almacenes', error); }
    };
    fetchAlmacenes();
  }, []);
  const [errors, setErrors] = useState({});
  const [clienteAlias, setClienteAlias] = useState('');
  const [calcularIgv, setCalcularIgv] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        console.log("Initializing ServicioVentaFormModal with initialData:", initialData);
        setFormData({
            ...formData,
            servicio: initialData.servicio ? String(initialData.servicio) : '',
            servicio_nombre: initialData.servicio_nombre || '',
            cliente: initialData.cliente ? String(initialData.cliente) : '',
            cliente_nombre: initialData.cliente_nombre || '',
            precio: Number(initialData.precio || 0),
            descuento: Number(initialData.descuento || 0),
            impuesto: Number(initialData.impuesto || 0),
            fecha_programada: initialData.fecha_programada ? initialData.fecha_programada.substring(0, 16) : '',
            tipo_comprobante: initialData.tipo_comprobante || 'SIMPLE',
            numero_comprobante: initialData.numero_comprobante || '',
            numero_comprobante_simple: initialData.numero_comprobante_simple || '',
            estado: initialData.estado || 'PENDIENTE',
            notas: initialData.notas || ''
        });
        const nombreRaw = initialData.cliente_nombre || '';
        const aliasExtracted = nombreRaw.startsWith('Cliente General - ')
          ? nombreRaw.slice('Cliente General - '.length)
          : (nombreRaw === 'Cliente General' ? '' : nombreRaw);
        setClienteAlias(aliasExtracted);
        
        // If it's a new sale from Fiado (no ID yet), we fetch the number
        if (!initialData.id || (!initialData.numero_comprobante && !initialData.numero_comprobante_simple)) {
            fetchNextNumber(initialData.tipo_comprobante || 'SIMPLE');
        }
      } else {
        setFormData({
            servicio: '',
            servicio_nombre: '',
            cliente: '',
            cliente_nombre: '',
            precio: 0,
            descuento: 0,
            impuesto: 0,
            fecha_programada: '',
            tipo_comprobante: 'SIMPLE',
            numero_comprobante: '',
            numero_comprobante_simple: '',
            estado: 'PENDIENTE',
            notas: ''
        });
        setClienteAlias('');
        fetchNextNumber('SIMPLE');
      }
    }
  }, [visible, initialData]);

  const fetchNextNumber = async (tipo) => {
    setLoadingNumber(true);
    try {
      const res = await ventasAPI.getNextNumber(tipo);
      const nextNum = res.data.proximo_numero;
      setFormData(prev => ({
        ...prev,
        tipo_comprobante: tipo,
        numero_comprobante: tipo === 'SIMPLE' ? '' : nextNum,
        numero_comprobante_simple: tipo === 'SIMPLE' ? nextNum : prev.numero_comprobante_simple
      }));
    } catch (err) {
      console.error("Error fetching next number:", err);
    } finally {
      setLoadingNumber(false);
    }
  };

  const handleTypeChange = (val) => {
    fetchNextNumber(val);
  };

  const calculateTotals = () => {
    const subtotal = Number(formData.precio || 0) - Number(formData.descuento || 0);
    let currentImpuesto = formData.impuesto;
    if (calcularIgv) {
        currentImpuesto = Number((subtotal * 0.18).toFixed(2));
    }
    const total = subtotal + Number(currentImpuesto || 0);
    return { subtotal, impuesto: currentImpuesto, total };
  };

  const { subtotal, impuesto, total } = calculateTotals();

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.servicio) newErrors.servicio = 'El servicio es obligatorio';
    if (!formData.cliente) newErrors.cliente = 'El cliente es obligatorio';
    if (formData.precio <= 0) newErrors.precio = 'El precio debe ser mayor a 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build final cliente_nombre: use 'Cliente General - alias' format for consistency
    const isClienteGeneral = clientes.find(
      c => String(c.id) === String(formData.cliente)
    )?.numero_documento === '00000000';
    const finalClienteNombre = isClienteGeneral && clienteAlias.trim()
      ? `Cliente General - ${clienteAlias.trim()}`
      : formData.cliente_nombre;

    onSave({
      ...formData,
      fecha_programada: formData.fecha_programada === '' ? null : formData.fecha_programada,
      impuesto: impuesto,
      cliente_nombre: finalClienteNombre,
      total: total
    });
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {formData.id ? 'Editar Venta de Servicio' : 'Nueva Venta de Servicio'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Servicio</label>
                <SearchableSelect
                  options={servicios.map(s => ({
                    id: String(s.id),
                    nombre: s.nombre,
                    subtitle: `S/. ${Number(s.precio_base || 0).toFixed(2)}`
                  }))}
                  value={formData.servicio}
                  onChange={(val) => {
                    const serv = servicios.find(s => String(s.id) === String(val));
                    setFormData(prev => ({
                      ...prev,
                      servicio: val,
                      servicio_nombre: serv ? serv.nombre : '',
                      precio: serv ? Number(serv.precio_base || 0) : 0
                    }));
                    if (errors.servicio) setErrors(prev => ({ ...prev, servicio: null }));
                  }}
                  placeholder="Buscar servicio..."
                  onActionClick={onOpenServicioModal}
                  actionLabel="➕ Crear Nuevo Servicio"
                  error={errors.servicio}
                />
                {errors.servicio && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.servicio}</div>}
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Cliente</label>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                    onClick={() => {
                      const pg = clientes.find(c => c.numero_documento === '00000000');
                      if (pg) {
                        setFormData(prev => ({ 
                          ...prev, 
                          cliente: String(pg.id), 
                          cliente_nombre: pg.nombre,
                          tipo_comprobante: 'SIMPLE',
                          numero_comprobante: ''
                        }));
                      } else {
                        alert('Cliente General no encontrado.');
                      }
                    }}
                  >
                    👤 Cliente General
                  </button>
                </div>
                <SearchableSelect
                  options={clientes.map(c => ({
                    id: String(c.id),
                    nombre: c.nombre,
                    subtitle: c.numero_documento
                  }))}
                  value={formData.cliente}
                  onChange={(val) => {
                    const cli = clientes.find(c => String(c.id) === String(val));
                    setFormData(prev => ({
                      ...prev,
                      cliente: val,
                      cliente_nombre: cli ? cli.nombre : ''
                    }));
                  }}
                  placeholder="Buscar cliente..."
                  onActionClick={onOpenClienteModal}
                  actionLabel="➕ Crear Nuevo Cliente"
                />
                {/* Alias input for Cliente General */}
                {clientes.find(c => String(c.id) === String(formData.cliente))?.numero_documento === '00000000' && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Alias <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Nombre y Apellidos — opcional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Juan Pérez o Tienda Martínez"
                      value={clienteAlias}
                      onChange={(e) => setClienteAlias(e.target.value)}
                      style={{ borderColor: 'var(--accent, #1677ff)', transition: 'border-color 0.2s' }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Precio (S/.)</label>
                <input
                  type="number"
                  name="precio"
                  className={`form-input${errors.precio ? ' input-error' : ''}`}
                  value={formData.precio}
                  onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  step="0.01"
                />
                {errors.precio && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.precio}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Descuento (S/.)</label>
                <input
                  type="number"
                  name="descuento"
                  className="form-input"
                  value={formData.descuento}
                  onChange={(e) => setFormData(prev => ({ ...prev, descuento: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Programada</label>
              <input
                type="datetime-local"
                name="fecha_programada"
                className={`form-input${errors.fecha_programada ? ' input-error' : ''}`}
                value={formData.fecha_programada}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fecha_programada: e.target.value }));
                  if (errors.fecha_programada) setErrors(prev => ({ ...prev, fecha_programada: null }));
                }}
              />
              {errors.fecha_programada && <div className="error-message" style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{errors.fecha_programada}</div>}
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Tipo Comprobante</label>
                <select name="tipo_comprobante" className="form-input" value={formData.tipo_comprobante} onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    tipo_comprobante: val,
                    numero_comprobante: val === 'SIMPLE' ? prev.numero_comprobante_simple : ''
                  }));
                  handleTypeChange(val);
                }}>
                  <option value="SIMPLE">Comprobante Simple</option>
                  <option value="BOLETA">Boleta</option>
                  <option value="FACTURA">Factura</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nro Comprobante</label>
                <input type="text" name="numero_comprobante" className="form-input" value={formData.tipo_comprobante === 'SIMPLE' ? formData.numero_comprobante_simple : formData.numero_comprobante} readOnly style={{ background: 'var(--bg-input)', opacity: 0.8 }} />
              </div>
            </div>
            <div className="grid grid-2">
               
              <div className="form-group">
                <label className="form-label">Almacén/Caja</label>
                <select name="almacen" className="form-input" value={formData.almacen || ''} onChange={handleChange}>
                  <option value="">General (Sin Almacén)</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                  <select
                    name="estado"
                    className="form-input"
                    value={formData.estado}
                    onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROGRESO">En Progreso</option>
                    <option value="TERMINADO">Terminado</option>
                  </select>
              </div>
              <div className="form-group">
                <label className="form-label">Impuestos (IGV 18%)</label>
                <input
                  type="number"
                  name="impuesto"
                  className="form-input"
                  value={formData.impuesto}
                  readOnly={calcularIgv}
                  onChange={calcularIgv ? undefined : (e) => setFormData(prev => ({ ...prev, impuesto: parseFloat(e.target.value) || 0 }))}
                  onFocus={(e) => !calcularIgv && e.target.select()}
                  style={calcularIgv ? { background: 'var(--bg-input)', opacity: 0.7 } : {}}
                  min="0"
                  step="0.01"
                />
                <div style={{ marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={calcularIgv}
                      onChange={(e) => setCalcularIgv(e.target.checked)}
                      style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--accent, #1677ff)' }}
                    />
                    Agregar Cálculo de IGV
                  </label>
                  {!calcularIgv && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      IGV incluido en los precios ingresados
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea name="notas" className="form-input" value={formData.notas} onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Registrar Venta</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ServicioVentaFormModal;
