import { useState, useEffect } from 'react';
import { reportesAPI } from '../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#52c41a'];

function Reportes() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [reporteMensual, setReporteMensual] = useState(null);
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(firstDay);
  const [fechaFin, setFechaFin] = useState(lastDay);
  const [reporteAnio, setReporteAnio] = useState(now.getFullYear());

  useEffect(() => {
    fetchBalance();
    fetchReporteMensual();
  }, [reporteAnio]);

  const fetchBalance = async () => {
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      const response = await reportesAPI.getBalance(params);
      setBalance(response.data);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReporteMensual = async () => {
    try {
      const response = await reportesAPI.getReporteMensual({ anio: reporteAnio });
      setReporteMensual(response.data);
    } catch (error) {
      console.error('Error fetching reporte mensual:', error);
    }
  };

  const handleFiltrar = () => {
    fetchBalance();
  };

  const dataPieIngresos = balance ? [
    { name: 'Ventas Productos', value: balance.ingresos.desglose.ventas_productos },
    { name: 'Ventas Servicios', value: balance.ingresos.desglose.ventas_servicios },
    { name: 'Ingresos no Operativos', value: balance.ingresos.desglose.ingresos_extra },
  ] : [];

  const dataPieEgresos = balance ? [
    { name: 'Compras', value: balance.egresos.desglose.compras },
    { name: 'Gastos', value: balance.egresos.desglose.egresos_extra },
  ] : [];

  const renderCustomizedLabel = (props) => {
    const { cx, cy, midAngle, outerRadius, value, fill, index } = props;
    if (!value || value <= 0) return null;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    
    const mx = cx + (outerRadius + 20) * cos;
    const verticalSpacing = (index % 2 === 0) ? -14 : 14;
    const my = cy + (outerRadius + 20) * sin + verticalSpacing;
    
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" opacity={0.8} />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" opacity={0.8} />
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 8} 
          y={ey} 
          dy={4} 
          textAnchor={textAnchor} 
          fill={fill} 
          fontSize={14}
          fontWeight={500}
        >
          {`S/. ${value.toFixed(2)}`}
        </text>
      </g>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reportes y Balance</h1>
        <p className="page-subtitle">Análisis financiero del negocio</p>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="grid grid-4">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Año (Reporte Mensual)</label>
            <select 
              className="form-input" 
              value={reporteAnio}
              onChange={(e) => setReporteAnio(e.target.value)}
            >
              {[...Array(6)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fecha Inicio (Balance)</label>
            <input
              type="date"
              className="form-input"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fecha Fin (Balance)</label>
            <input
              type="date"
              className="form-input"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleFiltrar} style={{ flex: 1 }}>
              Filtrar
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                const resetNow = new Date();
                const resetFirstDay = new Date(resetNow.getFullYear(), resetNow.getMonth(), 1).toISOString().split('T')[0];
                const resetLastDay = new Date(resetNow.getFullYear(), resetNow.getMonth() + 1, 0).toISOString().split('T')[0];
                
                setReporteAnio(resetNow.getFullYear());
                setFechaInicio(resetFirstDay);
                setFechaFin(resetLastDay);
                // Trigger fetch manual if needed, but since unreportedAnio is likely current, 
                // we might need to call fetchBalance manually here because useEffect only listens to reporteAnio
                fetchBalance(); 
              }} 
              style={{ flex: 1 }}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" style={{ margin: '40px auto' }}></div>
      ) : balance && (
        <>
          {/* Tarjetas de Balance */}
          <div className="grid grid-4" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Ingresos Totales</div>
              <div className="stat-value">S/. {balance.ingresos.total?.toFixed(2)}</div>
            </div>
            <div className="stat-card orange">
              <div className="stat-label">Egresos Totales</div>
              <div className="stat-value">S/. {balance.egresos.total?.toFixed(2)}</div>
            </div>
            <div className={`stat-card ${balance.balance.total >= 0 ? 'green' : 'blue'}`}>
              <div className="stat-label">Balance</div>
              <div className="stat-value">S/. {balance.balance.total?.toFixed(2)}</div>
              <div className="stat-label">{balance.balance.estado}</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-label">Margen</div>
              <div className="stat-value">{balance.balance.margen_porcentaje?.toFixed(2)}%</div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            {/* Composición de Ingresos */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Composición de Ingresos</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dataPieIngresos}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderCustomizedLabel}
                    labelLine={false}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataPieIngresos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `S/. ${value?.toFixed(2)}`} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Composición de Egresos */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Composición de Egresos</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dataPieEgresos}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderCustomizedLabel}
                    labelLine={false}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataPieEgresos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `S/. ${value?.toFixed(2)}`} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Desglose Detallado */}
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Desglose de Ingresos</h3>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span>Ventas de Productos:</span>
                  <strong>S/. {balance.ingresos.desglose.ventas_productos?.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span>Ventas de Servicios:</span>
                  <strong>S/. {balance.ingresos.desglose.ventas_servicios?.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span>Ingresos no Operativos:</span>
                  <strong>S/. {balance.ingresos.desglose.ingresos_extra?.toFixed(2)}</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  paddingTop: '12px',
                  borderTop: '2px solid #e8e8e8',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  <span>Total Ingresos:</span>
                  <strong style={{ color: '#52c41a' }}>S/. {balance.ingresos.total?.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Desglose de Egresos</h3>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span>Compras a Proveedores:</span>
                  <strong>S/. {balance.egresos.desglose.compras?.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span>Gastos:</span>
                  <strong>S/. {balance.egresos.desglose.egresos_extra?.toFixed(2)}</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  paddingTop: '12px',
                  borderTop: '2px solid #e8e8e8',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  <span>Total Egresos:</span>
                  <strong style={{ color: '#ff4d4f' }}>S/. {balance.egresos.total?.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Reporte Mensual */}
          {reporteMensual && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h3 className="card-title">Reporte Mensual Detallado</h3>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Mes</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Venta de Productos</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Venta de Servicios</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Ingresos no Operativos</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Compras</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Gastos</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Ingresos</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Egresos</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteMensual.datos.map((mes) => (
                      <tr key={mes.mes}>
                        <td style={{ whiteSpace: 'nowrap' }}>{mes.nombre_mes}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>S/. {mes.ventas?.toFixed(2)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>S/. {mes.servicios?.toFixed(2)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>S/. {mes.ingresos_extra?.toFixed(2) || '0.00'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>S/. {mes.compras?.toFixed(2)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>S/. {mes.egresos_extra?.toFixed(2) || '0.00'}</td>
                        <td style={{ color: '#52c41a', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          S/. {mes.ingresos?.toFixed(2)}
                        </td>
                        <td style={{ color: '#ff4d4f', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          S/. {mes.egresos?.toFixed(2)}
                        </td>
                        <td style={{ 
                          color: mes.balance >= 0 ? '#52c41a' : '#ff4d4f', 
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap'
                        }}>
                          S/. {mes.balance?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Reportes;
