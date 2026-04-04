import { useState, useEffect } from 'react';
import { reportesAPI } from '../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import LoadingScreen from '../components/LoadingScreen';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#52c41a'];

// rendering-hoist-jsx: función pura de render sin dependencias de estado/props
// Se eleva al nivel de módulo para evitar re-creación en cada render de Reportes
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

  const handleExportarDetalle = async (mes) => {
    try {
      const response = await reportesAPI.exportarReporteMensualDetalle({ 
        anio: reporteAnio, 
        mes: mes 
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const monthName = monthNames[mes - 1];
      link.setAttribute('download', `reporte_detalle_${monthName}_${reporteAnio}.xlsx`);
      
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error exporting reporte detalle:', error);
      alert('Error al descargar el reporte detallado.');
    }
  };

  // Pre-mapeo de datos para gráficos horizontales (evita errores en formatters de Recharts)
  const topProdCant = balance?.analiticas?.top_productos?.map(item => ({
    ...item,
    formatted_label: `${item.cantidad} ${item.producto__unidad_medida || ''}`
  })) || [];

  const topProdIng = balance?.analiticas?.top_productos_ingresos?.map(item => ({
    ...item,
    formatted_label: `S/. ${Number(item.ingresos).toFixed(2)}`
  })) || [];

  const topServCant = balance?.analiticas?.top_servicios?.map(item => ({
    ...item,
    formatted_label: `${item.cantidad}`
  })) || [];

  const topServIng = balance?.analiticas?.top_servicios_ingresos?.map(item => ({
    ...item,
    formatted_label: `S/. ${Number(item.ingresos).toFixed(2)}`
  })) || [];

  const topProdCompradosCant = balance?.analiticas?.top_productos_comprados?.map(item => ({
    ...item,
    formatted_label: `${item.cantidad} ${item.producto__unidad_medida || ''}`
  })) || [];

  const topProdCompradosGasto = balance?.analiticas?.top_productos_gastos?.map(item => ({
    ...item,
    formatted_label: `S/. ${Number(item.egresos).toFixed(2)}`
  })) || [];

  const topIngExtra = balance?.analiticas?.top_ingresos_extra?.map(item => ({
    ...item,
    formatted_label: `S/. ${Number(item.total).toFixed(2)}`
  })) || [];

  const topGastos = balance?.analiticas?.top_gastos?.map(item => ({
    ...item,
    formatted_label: `S/. ${Number(item.total).toFixed(2)}`
  })) || [];

  if (loading) {
    return <LoadingScreen message="GENERANDO REPORTES Y ESTADÍSTICAS..." />;
  }

  return (
    <div className="reportes-container">
      <div className="page-header">
        <h1 className="page-title">Reportes y Estadísticas</h1>
        <p className="page-subtitle">Análisis detallado de movimientos contables</p>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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

      {balance && (
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
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    formatter={(value) => `S/. ${value?.toFixed(2)}`} 
                  />
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
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    formatter={(value) => `S/. ${value?.toFixed(2)}`} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* FILA 1: Top 10 Productos y Servicios por Cantidad */}
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top 10 Productos Más Vendidos</h3>
              </div>
              <div style={{ padding: '16px', height: '420px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topProdCant} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="producto__nombre" type="category" width={110} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value) => [value, 'Cant.']} 
                    />
                    <Bar dataKey="cantidad" fill="#1890ff" radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList 
                        dataKey="formatted_label" 
                        position="right" 
                        fill="var(--text-primary)" 
                        style={{ fontWeight: 'bold', fontSize: '11px' }} 
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top 10 Servicios Más Vendidos</h3>
              </div>
              <div style={{ padding: '16px', height: '420px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topServCant} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="servicio__nombre" type="category" width={110} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value) => [value, 'Veces']} 
                    />
                    <Bar dataKey="cantidad" fill="#52c41a" radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList dataKey="formatted_label" position="right" fill="var(--text-primary)" style={{ fontWeight: 'bold', fontSize: '11px' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* FILA 2: Top 10 Productos y Servicios por Recaudación */}
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top 10 Productos que más dinero han recolectado</h3>
              </div>
              <div style={{ padding: '16px', height: '420px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topProdIng} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="producto__nombre" type="category" width={110} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Recaudado']} 
                    />
                    <Bar dataKey="ingresos" fill="#1890ff" radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList dataKey="formatted_label" position="right" fill="var(--text-primary)" style={{ fontWeight: 'bold', fontSize: '11px' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top 10 Servicios que más dinero han recolectado</h3>
              </div>
              <div style={{ padding: '16px', height: '420px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topServIng} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="servicio__nombre" type="category" width={110} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Recaudado']} 
                    />
                    <Bar dataKey="ingresos" fill="#52c41a" radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList dataKey="formatted_label" position="right" fill="var(--text-primary)" style={{ fontWeight: 'bold', fontSize: '11px' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* FILA 3: Top 10 Productos Comprados y Compras Gastadas */}
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top 10 Productos Más Comprados</h3>
              </div>
              <div style={{ padding: '16px', height: '420px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topProdCompradosCant} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="producto__nombre" type="category" width={110} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value) => [value, 'Cant.']} 
                    />
                    <Bar dataKey="cantidad" fill="#faad14" radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList 
                        dataKey="formatted_label" 
                        position="right" 
                        fill="var(--text-primary)" 
                        style={{ fontWeight: 'bold', fontSize: '11px' }} 
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top 10 Productos en los que más se ha gastado</h3>
              </div>
              <div style={{ padding: '16px', height: '420px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topProdCompradosGasto} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="producto__nombre" type="category" width={110} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Gastado']} 
                    />
                    <Bar dataKey="egresos" fill="#faad14" radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList dataKey="formatted_label" position="right" fill="var(--text-primary)" style={{ fontWeight: 'bold', fontSize: '11px' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* FILA 4: Top 5 Ingresos No Operativos y Gastos */}
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top 5 Ingresos no Operativos</h3>
              </div>
              <div style={{ padding: '16px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topIngExtra} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="categoria__nombre" type="category" width={110} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Monto Total']} 
                    />
                    <Bar dataKey="total" fill="#722ed1" radius={[0, 4, 4, 0]} barSize={25}>
                      <LabelList dataKey="formatted_label" position="right" fill="var(--text-primary)" style={{ fontSize: 11, fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top 5 Gastos</h3>
              </div>
              <div style={{ padding: '16px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topGastos} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="categoria__nombre" type="category" width={110} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Monto Total']} 
                    />
                    <Bar dataKey="total" fill="#f5222d" radius={[0, 4, 4, 0]} barSize={25}>
                      <LabelList dataKey="formatted_label" position="right" fill="var(--text-primary)" style={{ fontSize: 11, fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* FILA 4: Productos y Servicios Sin Rotación */}
          <div className="grid grid-2" style={{ marginBottom: '24px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '300px' }}>
              <div className="card-header">
                <h3 className="card-title">Productos sin rotación</h3>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px' }}>
                {balance.analiticas?.productos_sin_rotacion?.length === 0 ? (
                  <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Todos los productos han tenido salida.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {balance.analiticas?.productos_sin_rotacion?.map((item, idx) => (
                      <li key={idx} style={{ padding: '12px 0', borderBottom: '1px solid var(--bg-table-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500 }}>{item.nombre}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'block' }}>Vendido: 0 {item.unidad_medida || 'UN'}</span>
                          <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold' }}>Stock: {Number(item.stock_actual).toString().replace(/\.00$/, '')} {item.unidad_medida || 'UN'}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '300px' }}>
              <div className="card-header">
                <h3 className="card-title">Servicios sin rotación</h3>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px' }}>
                {balance.analiticas?.servicios_sin_rotacion?.length === 0 ? (
                  <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Todos los servicios activos han sido contratados.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {balance.analiticas?.servicios_sin_rotacion?.map((item, idx) => (
                      <li key={idx} style={{ padding: '12px 0', borderBottom: '1px solid var(--bg-table-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500 }}>{item.nombre}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Vendido: 0</span>
                      </li>
                    ))}
                  </ul>
                )}
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
                      <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones</th>
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
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleExportarDetalle(mes.mes)}
                            title="Descargar detalle del mes en Excel"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Ver Detalle
                          </button>
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
