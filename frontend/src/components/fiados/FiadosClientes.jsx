import { useState, useEffect, useContext } from 'react';
import { clientesAPI, fiadosAPI } from '../../services/api';
import { HistoryOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { AuthContext } from '../../context/AuthContext';

// Simple inline historial modal using already-loaded fiados data
function ClienteHistorialSimple({ visible, onClose, cliente, fiados }) {
  if (!visible || !cliente) return null;

  const fiadosCliente = fiados
    .filter(f => String(f.cliente) === String(cliente.id))
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

  const totalDeuda = fiadosCliente
    .filter(f => ['PENDIENTE', 'PAGADO_PARCIAL'].includes(f.estado))
    .reduce((acc, f) => acc + Number(f.saldo_pendiente || 0), 0);

  const getEstadoBadge = (estado) => {
    const map = {
      PENDIENTE: 'badge-danger',
      PAGADO_PARCIAL: 'badge-warning',
      LIQUIDADO: 'badge-success',
      CANCELADO: 'badge-secondary',
    };
    const labels = {
      PENDIENTE: 'Pendiente',
      PAGADO_PARCIAL: 'Abono Parcial',
      LIQUIDADO: 'Liquidado',
      CANCELADO: 'Cancelado',
    };
    return <span className={`badge ${map[estado] || ''}`}>{labels[estado] || estado}</span>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Historial de Fiados — {cliente.nombre}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {cliente.numero_documento || ''} · {fiadosCliente.length} operaciones
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><CloseOutlined /></button>
        </div>
        <div className="modal-body">
          {totalDeuda > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>Deuda pendiente total</span>
              <span style={{ fontWeight: 'bold', fontSize: '20px', color: 'var(--color-danger, #ef4444)' }}>S/ {totalDeuda.toFixed(2)}</span>
            </div>
          )}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th>Fecha Límite</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {fiadosCliente.map(f => (
                  <tr key={f.id} style={{ opacity: f.estado === 'CANCELADO' ? 0.5 : 1 }}>
                    <td style={{ fontWeight: 600 }}>#{String(f.id).padStart(5, '0')}</td>
                    <td style={{ fontSize: '12px' }}>{new Date(f.creado_en).toLocaleDateString()}</td>
                    <td><span className="badge badge-info">{f.tipo}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>S/ {Number(f.total).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: f.saldo_pendiente > 0 ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #22c55e)' }}>
                      S/ {Number(f.saldo_pendiente).toFixed(2)}
                    </td>
                    <td style={{ fontSize: '12px', color: f.fecha_limite && new Date(f.fecha_limite) < new Date() && f.estado !== 'LIQUIDADO' ? 'var(--color-danger, #ef4444)' : 'var(--text-secondary)' }}>
                      {f.fecha_limite ? new Date(f.fecha_limite + 'T12:00:00').toLocaleDateString() : '-'}
                    </td>
                    <td>{getEstadoBadge(f.estado)}</td>
                  </tr>
                ))}
                {fiadosCliente.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No hay fiados registrados para este cliente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function FiadosClientes() {
  const { isVendedor } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [fiados, setFiados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [soloConDeuda, setSoloConDeuda] = useState(true);

  const [historialVisible, setHistorialVisible] = useState(false);
  const [clienteToHistorial, setClienteToHistorial] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, fRes] = await Promise.all([
        clientesAPI.getAll({ page_size: 999 }),
        fiadosAPI.getFiados(),
      ]);
      setClientes(cRes.data.results || cRes.data);
      setFiados(fRes.data.results || fRes.data);
    } catch (e) {
      message.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const resumenPorCliente = (clienteId) => {
    const fiadosCliente = fiados.filter(f => String(f.cliente) === String(clienteId));
    const activos = fiadosCliente.filter(f => ['PENDIENTE', 'PAGADO_PARCIAL'].includes(f.estado));
    const totalDeuda = activos.reduce((acc, f) => acc + Number(f.saldo_pendiente || 0), 0);
    const totalFiados = fiadosCliente.filter(f => f.estado !== 'CANCELADO').length;
    const ultimoFiado = fiadosCliente.length > 0
      ? fiadosCliente.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))[0]
      : null;
    return { activos: activos.length, totalDeuda, totalFiados, ultimoFiado };
  };

  const clientesConResumen = clientes.map(c => ({
    ...c,
    ...resumenPorCliente(c.id),
  }));

  const filtered = clientesConResumen.filter(c => {
    const term = searchTerm.toLowerCase();
    const textMatch = (c.nombre || '').toLowerCase().includes(term) ||
                      (c.numero_documento || '').toLowerCase().includes(term);
    const deudaMatch = soloConDeuda ? c.activos > 0 : true;
    return textMatch && deudaMatch;
  });

  const totalDeudaGlobal = clientesConResumen.reduce((acc, c) => acc + c.totalDeuda, 0);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Clientes con Fiados</h1>
          <p className="page-subtitle">Vista dinamica de deudores — desaparecen al liquidar</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total en Deuda</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-danger, #ef4444)' }}>
            S/ {totalDeudaGlobal.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Buscar cliente</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
            <input
              type="checkbox"
              id="soloConDeuda"
              checked={soloConDeuda}
              onChange={(e) => setSoloConDeuda(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="soloConDeuda" style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
              Solo con deuda activa
            </label>
          </div>
          <button className="btn btn-secondary" style={{ paddingTop: '18px' }} onClick={() => { setSearchTerm(''); setSoloConDeuda(true); }}>
            Limpiar
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Cargando...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th style={{ textAlign: 'center' }}>Fiados Activos</th>
                  <th style={{ textAlign: 'right' }}>Deuda Pendiente</th>
                  <th>Ultimo Fiado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.tipo_cliente || ''}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{c.numero_documento || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${c.activos > 0 ? 'badge-danger' : 'badge-secondary'}`}>{c.activos}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: c.totalDeuda > 0 ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #22c55e)' }}>
                      S/ {c.totalDeuda.toFixed(2)}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {c.ultimoFiado ? new Date(c.ultimoFiado.creado_en).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      {c.activos > 0 ? (
                        <span className="badge badge-danger">Con Deuda</span>
                      ) : c.totalFiados > 0 ? (
                        <span className="badge badge-success">Al dia</span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Sin fiados</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => { setClienteToHistorial(c); setHistorialVisible(true); }}
                        title="Ver historial de fiados"
                      >
                        <HistoryOutlined /> Historial
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      {soloConDeuda ? 'Ningun cliente tiene deudas activas.' : 'No se encontraron clientes.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClienteHistorialSimple
        visible={historialVisible}
        onClose={() => { setHistorialVisible(false); setClienteToHistorial(null); }}
        cliente={clienteToHistorial}
        fiados={fiados}
      />
    </div>
  );
}

export default FiadosClientes;