import { useState, useEffect } from 'react';
import { reportesAPI } from '../services/api';
import { 
  WarningOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [reporteMensual, setReporteMensual] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchReporteMensual();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await reportesAPI.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReporteMensual = async () => {
    try {
      const response = await reportesAPI.getReporteMensual();
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

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Ventas del Mes</div>
          <div className="stat-value">
            S/. {Number(dashboardData?.ventas?.total_mes || 0).toFixed(2)}
          </div>
          <div className="stat-label">
            {dashboardData?.ventas?.cantidad_ventas || 0} ventas
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-label">Balance del Mes</div>
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
                <Bar dataKey="ventas" fill="#1890ff" name="Ventas" />
                <Bar dataKey="compras" fill="#faad14" name="Compras" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de línea - Balance */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Balance Mensual</h3>
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
