import { useState, useEffect, useContext } from 'react';
import { reportesAPI, productosAPI, serviciosAPI, coreAPI } from '../services/api';
import { 
  WarningOutlined } from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import LoadingScreen from '../components/LoadingScreen';
import { AuthContext } from '../context/AuthContext';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

function Dashboard() {

  // Crear Cliente/Proveedor General si no existen (idempotente)
  useEffect(() => {
    coreAPI.ensureDefaults().catch(() => {
      // Silencioso - no bloquear al usuario si falla
    });
  }, []);


  const { isVendedor, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [reporteMensual, setReporteMensual] = useState(null);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedProducto, setSelectedProducto] = useState('');
  const [selectedServicio, setSelectedServicio] = useState('');
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);

  // async-parallel: carga productos y servicios en paralelo al montar
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [productosRes, serviciosRes] = await Promise.all([
          productosAPI.getAll(),
          serviciosAPI.getAll(),
        ]);
        setProductos(productosRes.data.results || productosRes.data);
        setServicios(serviciosRes.data.results || serviciosRes.data);
      } catch (error) {
        console.error('Error fetching catalogos:', error);
      }
    };
    fetchCatalogos();
  }, []);

  // async-parallel: carga dashboard y reporte mensual en paralelo cuando cambian los filtros
  useEffect(() => {
    const fetchReportes = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedYear) params.anio = selectedYear;
        if (selectedMonth) params.mes = selectedMonth;
        if (selectedProducto) params.producto_id = selectedProducto;
        if (selectedServicio) params.servicio_id = selectedServicio;

        const [dashboardRes, reporteRes] = await Promise.all([
          reportesAPI.getDashboard(params),
          reportesAPI.getReporteMensual(params),
        ]);
        setDashboardData(dashboardRes.data);
        setReporteMensual(reporteRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isVendedor) {
      setLoading(false);
      return;
    }
    
    fetchReportes();
  }, [selectedYear, selectedMonth, selectedProducto, selectedServicio, isVendedor]);

  if (loading) {
    return <LoadingScreen message="ACTUALIZANDO DASHBOARD..." />;
  }

  if (isVendedor) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h1 className="page-title">Bienvenido, {user?.username}</h1>
        <p className="page-subtitle">Sistema de Ventas e Inventario Operativo</p>
        <div className="card" style={{ marginTop: '40px', padding: '40px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2>Accesos Rápidos</h2>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
            <a href="/ventas" className="btn btn-primary" style={{ padding: '10px 20px' }}>Ir a Ventas</a>
            <a href="/fiados" className="btn btn-primary" style={{ padding: '10px 20px' }}>Ir a Fiados</a>
            <a href="/clientes" className="btn btn-secondary" style={{ padding: '10px 20px' }}>Directorio de Clientes</a>
          </div>
        </div>
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
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
          <div style={{ width: '150px' }}>
            <label className="form-label" style={{ fontSize: '13px', marginBottom: '4px' }}>Mes</label>
            <select 
              className="form-input" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Todos los meses</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
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
          <button
            className="btn btn-secondary"
            style={{ height: '38px' }}
            onClick={() => {
              setSelectedYear(new Date().getFullYear());
              setSelectedMonth(String(new Date().getMonth() + 1));
              setSelectedProducto('');
              setSelectedServicio('');
            }}
            title="Limpiar filtros"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Ingresos del Periodo</div>
          <div className="stat-value">
            S/. {Number(dashboardData?.balance?.ingresos_mes || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px' }}>
            {dashboardData?.ventas?.cantidad_ventas || 0} venta de producto / {dashboardData?.servicios?.cantidad_servicios || 0} de servicio
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-label">Compras del Periodo</div>
          <div className="stat-value">
            S/. {Number(dashboardData?.compras?.total_mes || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px' }}>
            {dashboardData?.compras?.cantidad_compras || 0} compras a proveedores
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

        <div className="stat-card blue">
          <div className="stat-label">Clientes Totales</div>
          <div className="stat-value">
            {dashboardData?.clientes?.total || 0}
          </div>
          <div className="stat-label">
            {dashboardData?.proveedores?.total || 0} proveedores
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
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  formatter={(value, name) => [
                    `S/. ${Number(value).toFixed(2)}`, 
                    name.includes('Ingresos') ? 'Ingreso' : 'Compra'
                  ]}
                />
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
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-table-header)', color: 'var(--text-primary)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Balance']} 
                />
                <Legend />
                <Line type="monotone" dataKey="balance" stroke="#52c41a" name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}

export default Dashboard;
