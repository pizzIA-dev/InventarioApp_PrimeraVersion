import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Productos
export const productosAPI = {
  getAll: (params) => api.get('/productos/', { params }),
  getById: (id) => api.get(`/productos/${id}/`),
  create: (data) => api.post('/productos/', data),
  update: (id, data) => api.patch(`/productos/${id}/`, data),
  delete: (id) => api.delete(`/productos/${id}/`),
  getStockBajo: () => api.get('/productos/stock_bajo/'),
  getMovimientos: (id, params = {}) => api.get(`/productos/${id}/movimientos/`, { params }),
  exportar: (params) => api.get('/productos/exportar/', { params, responseType: 'blob' }),
  exportarMovimientos: (id) => api.get(`/productos/${id}/exportar_movimientos/`, { responseType: 'blob' }),
  exportarDiarioMovimientos: (params) => api.get('/productos/movimientos/exportar/', { params, responseType: 'blob' }),
};

// Categorias
export const categoriasAPI = {
  getAll: (params) => api.get('/productos/categorias/', { params }),
  create: (data) => api.post('/productos/categorias/', data),
};

// Proveedores
export const proveedoresAPI = {
  getAll: (params) => api.get('/proveedores/', { params }),
  getById: (id) => api.get(`/proveedores/${id}/`),
  create: (data) => api.post('/proveedores/', data),
  update: (id, data) => api.patch(`/proveedores/${id}/`, data),
  delete: (id) => api.delete(`/proveedores/${id}/`),
  getHistoricoPrecios: (id) => api.get(`/proveedores/${id}/historico_precios/`),
  getEstadisticas: (id) => api.get(`/proveedores/${id}/estadisticas/`),
  getMovimientos: (id, params = {}) => api.get(`/proveedores/${id}/historial/`, { params }),
  exportar: (params) => api.get('/proveedores/exportar/', { params, responseType: 'blob' }),
  exportarMovimientos: (id) => api.get(`/proveedores/${id}/exportar_historial/`, { responseType: 'blob' }),
  exportarDiarioMovimientos: (params) => api.get('/proveedores/movimientos/exportar/', { params, responseType: 'blob' }),
};

// Clientes
export const clientesAPI = {
  getAll: (params) => api.get('/clientes/', { params }),
  getById: (id) => api.get(`/clientes/${id}/`),
  create: (data) => api.post('/clientes/', data),
  update: (id, data) => api.patch(`/clientes/${id}/`, data),
  delete: (id) => api.delete(`/clientes/${id}/`),
  getEstadisticas: (id) => api.get(`/clientes/${id}/estadisticas/`),
  getTopClientes: () => api.get('/clientes/top_clientes/'),
  exportar: (params) => api.get('/clientes/exportar/', { params, responseType: 'blob' }),
};

// Ventas
export const ventasAPI = {
  getAll: (params) => api.get('/ventas/', { params }),
  getById: (id) => api.get(`/ventas/${id}/`),
  create: (data) => api.post('/ventas/', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  update: (id, data) => api.patch(`/ventas/${id}/`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  delete: (id) => api.delete(`/ventas/${id}/`),
  confirmar: (id) => api.post(`/ventas/${id}/confirmar/`),
  cancelar: (id) => api.post(`/ventas/${id}/cancelar/`),
  getResumen: () => api.get('/ventas/resumen/'),
  getProductosMasVendidos: () => api.get('/ventas/productos_mas_vendidos/'),
  exportar: (params) => api.get('/ventas/exportar/', { params, responseType: 'blob' }),
};

// Compras
export const comprasAPI = {
  getAll: (params) => api.get('/compras/', { params }),
  getById: (id) => api.get(`/compras/${id}/`),
  create: (data) => api.post('/compras/', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  update: (id, data) => api.patch(`/compras/${id}/`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  delete: (id) => api.delete(`/compras/${id}/`),
  confirmar: (id) => api.post(`/compras/${id}/confirmar/`),
  cancelar: (id) => api.post(`/compras/${id}/cancelar/`),
  getResumen: () => api.get('/compras/resumen/'),
  exportar: (params) => api.get('/compras/exportar/', { params, responseType: 'blob' }),
};

// Capital
export const capitalAPI = {
  getAll: (params) => api.get('/capital/', { params }),
  getById: (id) => api.get(`/capital/${id}/`),
  create: (data) => api.post('/capital/', data),
  update: (id, data) => api.patch(`/capital/${id}/`, data),
  delete: (id) => api.delete(`/capital/${id}/`),
  getResumen: () => api.get('/capital/resumen/'),
  getPorTipo: () => api.get('/capital/por_tipo/'),
  getTipos: () => api.get('/capital/tipos/'),
};

// Servicios
export const serviciosAPI = {
  getAll: (params) => api.get('/servicios/', { params }),
  getById: (id) => api.get(`/servicios/${id}/`),
  create: (data) => api.post('/servicios/', data),
  update: (id, data) => api.patch(`/servicios/${id}/`, data),
  delete: (id) => api.delete(`/servicios/${id}/`),
  getVentas: (params) => api.get('/servicios/ventas/', { params }),
  createVenta: (data) => api.post('/servicios/ventas/', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  updateVenta: (id, data) => api.patch(`/servicios/ventas/${id}/`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  deleteVenta: (id) => api.delete(`/servicios/ventas/${id}/`),
  completarVenta: (id) => api.post(`/servicios/ventas/${id}/completar/`),
  iniciarVenta: (id) => api.post(`/servicios/ventas/${id}/iniciar/`),
  cancelarVenta: (id) => api.post(`/servicios/ventas/${id}/cancelar/`),
  getCategorias: () => api.get('/servicios/categorias/'),
  exportarVentas: (params) => api.get('/servicios/ventas/exportar/', { params, responseType: 'blob' }),
};

// Transacciones
export const transaccionesAPI = {
  getAll: (params) => api.get('/transacciones/', { params }),
  getById: (id) => api.get(`/transacciones/${id}/`),
  create: (data) => api.post('/transacciones/', data),
  update: (id, data) => api.patch(`/transacciones/${id}/`, data),
  delete: (id) => api.delete(`/transacciones/${id}/`),
  getResumen: () => api.get('/transacciones/resumen/'),
  getPorCategoria: () => api.get('/transacciones/por_categoria/'),
  getCategorias: () => api.get('/transacciones/categorias/'),
  exportar: (params) => api.get('/transacciones/exportar/', { params, responseType: 'blob' }),
};

// Reportes
export const reportesAPI = {
  getBalance: (params) => api.get('/reportes/balance/', { params }),
  getDashboard: (params) => api.get('/reportes/dashboard/', { params }),
  getReporteMensual: (params) => api.get('/reportes/reporte-mensual/', { params }),
};

export default api;
