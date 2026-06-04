import { useState, useEffect, useContext } from 'react';
import { clientesAPI, fiadosAPI } from '../../services/api';
import { HistoryOutlined } from '@ant-design/icons';
import ClienteFiadoHistorialModal from './ClienteFiadoHistorialModal';
import { message } from 'antd';
import { AuthContext } from '../../context/AuthContext';

function FiadosClientes() {
  const { isVendedor } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [fiados, setFiados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [soloConDeuda, setSoloConDeuda] = useState(true);

  const [kardexVisible, setKardexVisible] = useState(false);
  const [clienteToKardex, setClienteToKardex] = useState(null);

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

  // Build per-client fiado summary:
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
    const deudaMatch = soloConDeuda ? c.activos > 0 : c.totalFiados > 0 || !soloConDeuda;
    return textMatch && deudaMatch;
  });

  const totalDeudaGlobal = clientesConResumen.reduce((acc, c) => acc + c.totalDeuda, 0);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Clientes con Fiados</h1>
          <p className="page-subtitle">Vista de clientes con deudas activas — desaparecen al liquidar</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total en Deuda</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-danger, #ef4444)' }}>
              S/ {totalDeudaGlobal.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
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

      {/* Table */}
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
                      <span className={adge }>
                        {c.activos}
                      </span>
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
                        title="Ver historial de fiados"
                        onClick={() => { setClienteToKardex(c); setKardexVisible(true); }}
                      >
                        <HistoryOutlined /> Historial
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      {soloConDeuda ? 'Ningun cliente tiene deudas activas actualmente.' : 'No se encontraron clientes.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClienteFiadoHistorialModal
        visible={kardexVisible}
        onClose={() => { setKardexVisible(false); setClienteToKardex(null); }}
        cliente={clienteToKardex}
      />
    </div>
  );
}

export default FiadosClientes;