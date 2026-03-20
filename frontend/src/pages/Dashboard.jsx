import { useState, useEffect } from 'react';
import { reportesAPI, productosAPI, serviciosAPI } from '../services/api';
import { 
  WarningOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [reporteMensual, setReporteMensual] = useState(null);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedProducto, setSelectedProducto] = useState('');
  const [selectedServicio, setSelectedServicio] = useState('');
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);

  useEffect(() => {
    fetchProductos();
    fetchServicios();
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchReporteMensual();
  }, [selectedYear, selectedProducto, selectedServicio]);

  const fetchProductos = async () => {
    try {
      const response = await productosAPI.getAll();
      setProductos(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching productos:', error);
    }
  };

  const fetchServicios = async () => {
    try {
      const response = await serviciosAPI.getAll();
      setServicios(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching servicios:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedYear) params.anio = selectedYear;
      if (selectedProducto) params.producto_id = selectedProducto;
      if (selectedServicio) params.servicio_id = selectedServicio;
      
      const response = await reportesAPI.getDashboard(params);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReporteMensual = async () => {
    try {
      const params = {};
      if (selectedYear) params.anio = selectedYear;
      if (selectedProducto) params.producto_id = selectedProducto;
      if (selectedServicio) params.servicio_id = selectedServicio;
      
      const response = await reportesAPI.getReporteMensual(params);
      setReporteMensual(response.data);
    } catch (error) {
      console.error('Error fetching reporte mensual:', error);
    }
  };

  if (loading) {
    return (
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div className="spinner" style={{ margin: '40px auto' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen general del negocio</p>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ width: '150px' }}>
            <label className="form-label" style={{ fontSize: '13px', marginBottom: '4px' }}>Año</label>
            <select 
              className="form-input" 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {[...Array(6)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label" style={{ fontSize: '13px', marginBottom: '4px' }}>Filtrar por Producto</label>
            <select 
              className="form-input" 
              value={selectedProducto}
              onChange={(e) => {
                setSelectedProducto(e.target.value);
                if (e.target.value) setSelectedServicio(''); // Clear servicio if producto selected
              }}
            >
              <option value="">Todos los productos</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label" style={{ fontSize: '13px', marginBottom: '4px' }}>Filtrar por Servicio</label>
            <select 
              className="form-input" 
              value={selectedServicio}
              onChange={(e) => {
                setSelectedServicio(e.target.value);
                if (e.target.value) setSelectedProducto(''); // Clear producto if servicio selected
              }}
            >
              <option value="">Todos los servicios</option>
              {servicios.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Ingresos del Periodo</div>
          <div className="stat-value">
            S/. {Number(dashboardData?.balance?.ingresos_mes || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
            {dashboardData?.ventas?.cantidad_ventas || 0} vnt de prod / {dashboardData?.servicios?.cantidad_servicios || 0} de serv
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-label">Balance del Periodo</div>
          <div className="stat-value">
            S/. {Number(dashboardData?.balance?.balance_mes || 0).toFixed(2)}
          </div>
          <div className="stat-label">
            {dashboardData?.balance?.estado || 'EQUILIBRIO'}
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-label">Clientes Totales</div>
          <div className="stat-value">
            {dashboardData?.clientes?.total || 0}
          </div>
          <div className="stat-label">
            {dashboardData?.proveedores?.total || 0} proveedores
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-label">Valor en Stock</div>
          <div className="stat-value">
            S/. {Number(dashboardData?.inventario?.valor_stock || 0).toFixed(2)}
          </div>
          <div className="stat-label">
            {dashboardData?.inventario?.productos_stock_bajo || 0} productos con stock bajo
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-2">
        {/* Gráfico de barras - Ventas vs Compras */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ventas vs Compras (Mensual)</h3>
          </div>
          {reporteMensual && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reporteMensual.datos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre_mes" />
                <YAxis />
                <Tooltip formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Monto']} />
                <Legend />
                <Bar dataKey="ingresos" fill="#1890ff" name="Ingresos (Prod + Serv)" />
                <Bar dataKey="compras" fill="#faad14" name="Compras" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de línea - Balance */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Balance Mensualizado</h3>
          </div>
          {reporteMensual && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reporteMensual.datos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre_mes" />
                <YAxis />
                <Tooltip formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Monto']} />
                <Legend />
                <Line type="monotone" dataKey="balance" stroke="#52c41a" name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Alertas de stock bajo */}
      {dashboardData?.inventario?.productos_stock_bajo > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: '#ff4d4f' }}>
              <WarningOutlined /> Productos con Stock Bajo
            </h3>
          </div>
          <p style={{ color: '#8c8c8c' }}>
            Hay {dashboardData.inventario.productos_stock_bajo} productos con stock por debajo del mínimo recomendado.
          </p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
