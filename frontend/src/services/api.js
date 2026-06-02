import axios from 'axios';

// Multi-tenant: construir la URL del API desde el hostname actual del navegador
// Ej: emprendedor.localhost:5173 Ã¢â€ â€™ emprendedor.localhost:8000/api
const _host    = window.location.hostname;
const _port    = import.meta.env.VITE_API_PORT || '8000';
const _apiBase = import.meta.env.VITE_API_URL  || `http://${_host}:${_port}`;

const api = axios.create({
  baseURL: `${_apiBase}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Opcionalmente redirigir al login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      const schema = localStorage.getItem('tenant_schema');
        const loginPath = schema ? `/t/${schema}/login` : '/planes';
        if (!window.location.pathname.includes('/login')) {
          window.location.href = loginPath;
        }
    }
    return Promise.reject(error);
  }
);

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
  getHistoryEstados: (id, params) => api.get(`/clientes/${id}/historial_estados/`, { params }),
  getKardexProductos: (id, params) => api.get(`/clientes/${id}/kardex_productos/`, { params }),
  getKardexServicios: (id, params) => api.get(`/clientes/${id}/kardex_servicios/`, { params }),
  exportar: (params) => api.get('/clientes/exportar/', { params, responseType: 'blob' }),
  exportarHistorial: (id, params) => api.get(`/clientes/${id}/exportar_historial/`, { params, responseType: 'blob' }),
  exportarHistorialGlobal: (params) => api.get('/clientes/exportar_historial_global/', { params, responseType: 'blob' }),
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
  getHistoryEstados: (id, params) => api.get(`/ventas/${id}/history_estados/`, { params }),
  getKardexProductos: (id, params) => api.get(`/ventas/${id}/kardex_productos/`, { params }),
  getKardexGlobalProductos: (params) => api.get('/ventas/kardex_global_productos/', { params }),
  exportar: (params) => api.get('/ventas/exportar/', { params, responseType: 'blob' }),
  exportarHistorial: (id) => api.get(`/ventas/${id}/exportar_historial/`, { responseType: 'blob' }),
  exportarHistorialGlobal: (params) => api.get('/ventas/exportar_historial_global/', { params, responseType: 'blob' }),
  getNextNumber: (tipo) => api.get('/ventas/proximo_numero/', { params: { tipo } }),
};

// Compras de Servicios
export const comprasServiciosAPI = {
  getAll: (params) => api.get('/servicios/compras/', { params }),
  getById: (id) => api.get(`/servicios/compras/${id}/`),
  create: (data) => api.post('/servicios/compras/', data),
  update: (id, data) => api.patch(`/servicios/compras/${id}/`, data),
  delete: (id) => api.delete(`/servicios/compras/${id}/`),
  completar: (id) => api.post(`/servicios/compras/${id}/completar/`),
  iniciar: (id) => api.post(`/servicios/compras/${id}/iniciar/`),
  exportar: (params) => api.get('/servicios/compras/exportar/', { params, responseType: 'blob' }),
};

export const comprasAPI = {
  getAll: (params) => api.get('/compras/', { params }),
  getById: (id) => api.get(`/compras/${id}/`),
  create: (data) => api.post('/compras/', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  update: (id, data) => api.patch(`/compras/${id}/`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  delete: (id) => api.delete(`/compras/${id}/`),
  confirmar: (id) => api.post(`/compras/${id}/confirmar/`),
  cancelar: (id) => api.post(`/compras/${id}/cancelar/`),
  getResumen: () => api.get('/compras/resumen/'),
  getHistoryEstados: (id, params) => api.get(`/compras/${id}/historial_estados/`, { params }),
  getKardexProductos: (id, params) => api.get(`/compras/${id}/kardex_productos/`, { params }),
  getKardexGlobalProductos: (params) => api.get('/compras/kardex_global_productos/', { params }),
  exportar: (params) => api.get('/compras/exportar/', { params, responseType: 'blob' }),
  exportarHistorialIndividual: (id, params) => api.get(`/compras/${id}/exportar_historial/`, { params, responseType: 'blob' }),
  exportarHistorialGlobal: (params) => api.get('/compras/exportar_historial_global/', { params, responseType: 'blob' }),
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
  createTipo: (data) => api.post('/capital/tipos/', data),
  updateTipo: (id, data) => api.patch(`/capital/tipos/${id}/`, data),
  deleteTipo: (id) => api.delete(`/capital/tipos/${id}/`),
  // Historial / Kardex
  getHistorial: (id, params) => api.get(`/capital/${id}/historial/`, { params }),
  exportarHistorial: (id) => api.get(`/capital/${id}/exportar_historial/`, { responseType: 'blob' }),
  // Export lists
  exportar: (params) => api.get('/capital/exportar/', { params, responseType: 'blob' }),
  exportarHistorialGlobal: (params) => api.get('/capital/exportar_historial_global/', { params, responseType: 'blob' }),
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
  getVentaDetail: (id) => api.get(`/servicios/ventas/${id}/`),
  completarVenta: (id) => api.post(`/servicios/ventas/${id}/completar/`),
  iniciarVenta: (id) => api.post(`/servicios/ventas/${id}/iniciar/`),
  cancelarVenta: (id) => api.post(`/servicios/ventas/${id}/cancelar/`),
  getHistoryEstadosVenta: (id, params) => api.get(`/servicios/ventas/${id}/history_estados/`, { params }),
  getCategorias: () => api.get('/servicios/categorias/'),
  createCategoria: (data) => api.post('/servicios/categorias/', data),
  updateCategoria: (id, data) => api.patch(`/servicios/categorias/${id}/`, data),
  deleteCategoria: (id) => api.delete(`/servicios/categorias/${id}/`),
  exportar: (params) => api.get('/servicios/exportar/', { params, responseType: 'blob' }),
  exportarVentas: (params) => api.get('/servicios/ventas/exportar/', { params, responseType: 'blob' }),
  exportarHistorialVenta: (id) => api.get(`/servicios/ventas/${id}/exportar_historial/`, { responseType: 'blob' }),
  getHistoryDetalleVenta: (id) => api.get(`/servicios/ventas/${id}/history_detalle/`),
  exportarHistorialGlobalVentas: (params) => api.get(`/servicios/ventas/exportar_historial_global/`, { params, responseType: 'blob' }),
  getKardex: (id, params) => api.get(`/servicios/${id}/kardex/`, { params }),
  exportarKardex: (id, params) => api.get(`/servicios/${id}/exportar_kardex/`, { params, responseType: 'blob' }),
  exportarHistorialGlobal: (params) => api.get('/servicios/exportar_historial_global/', { params, responseType: 'blob' }),
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
  createCategoria: (data) => api.post('/transacciones/categorias/', data),
  updateCategoria: (id, data) => api.patch(`/transacciones/categorias/${id}/`, data),
  deleteCategoria: (id) => api.delete(`/transacciones/categorias/${id}/`),
  getCategoriaHistorial: (id, params) => api.get(`/transacciones/categorias/${id}/historial/`, { params }),
  exportarCategoriaHistorial: (id, params) => api.get(`/transacciones/categorias/${id}/exportar_historial/`, { params, responseType: 'blob' }),
  getHistorial: (id, params) => api.get(`/transacciones/${id}/historial/`, { params }),
  exportarHistorial: (id, params) => api.get(`/transacciones/${id}/exportar_historial/`, { params, responseType: 'blob' }),
  exportar: (params) => api.get('/transacciones/exportar/', { params, responseType: 'blob' }),
  exportarHistorialGlobal: (params) => api.get('/transacciones/exportar_historial_global/', { params, responseType: 'blob' }),
};

// Reportes
export const reportesAPI = {
  getBalance: (params) => api.get('/reportes/balance/', { params }),
  getDashboard: (params) => api.get('/reportes/dashboard/', { params }),
  getReporteMensual: (params) => api.get('/reportes/reporte-mensual/', { params }),
  exportarReporteMensualDetalle: (params) => api.get('/reportes/reporte-mensual/exportar/', { params, responseType: 'blob' }),
};

// Fiados (CrÃƒÂ©ditos)
export const fiadosAPI = {
  // Clientes Fiados
  getClientes: (params) => api.get('/fiados/clientes-fiados/', { params }),
  getClienteById: (id) => api.get(`/fiados/clientes-fiados/${id}/`),
  createCliente: (data) => api.post('/fiados/clientes-fiados/', data),
  updateCliente: (id, data) => api.patch(`/fiados/clientes-fiados/${id}/`, data),
  deleteCliente: (id) => api.delete(`/fiados/clientes-fiados/${id}/`),
  getHistorialCliente: (id, params) => api.get(`/fiados/clientes-fiados/${id}/historial/`, { params }),
  exportarHistorialCliente: (id) => api.get(`/fiados/clientes-fiados/${id}/exportar_historial/`, { responseType: 'blob' }),
  exportarClientes: (params) => api.get('/fiados/clientes-fiados/exportar/', { params, responseType: 'blob' }),
  
  // Operaciones Fiado
  getFiados: (params) => api.get('/fiados/fiados/', { params }),
  getFiadoById: (id) => api.get(`/fiados/fiados/${id}/`),
  createFiado: (data) => api.post('/fiados/fiados/', data),
  updateFiado: (id, data) => api.patch(`/fiados/fiados/${id}/`, data),
  deleteFiado: (id) => api.delete(`/fiados/fiados/${id}/`),
  cancelarFiado: (id) => api.post(`/fiados/fiados/${id}/cancelar/`),
  reactivarFiado: (id) => api.post(`/fiados/fiados/${id}/reactivar/`),
  abonarFiado: (id, data) => api.post(`/fiados/fiados/${id}/abonar/`, data),
  getHistorialFiado: (id, params) => api.get(`/fiados/fiados/${id}/historial/`, { params }),
  exportarHistorialFiado: (id) => api.get(`/fiados/fiados/${id}/exportar_historial/`, { responseType: 'blob' }),
  exportar: (params) => api.get('/fiados/fiados/exportar/', { params, responseType: 'blob' }),
  exportarHistorialGlobal: (params) => api.get('/fiados/fiados/exportar_historial_global/', { params, responseType: 'blob' }),
};


// GestiÃƒÂ³n de Usuarios (solo Gerente)
export const usuariosAPI = {
  listar: () => api.get('/auth/usuarios/'),
  crear: (data) => api.post('/auth/usuarios/crear/', data),
  toggle: (id) => api.patch(`/auth/usuarios/${id}/toggle/`),
  cambiarPassword: (id, data) => api.put(`/auth/usuarios/${id}/password/`, data),
};

export const rolesAPI = {
  listar: () => api.get('/core/roles/'),
  crear: (data) => api.post('/core/roles/', data),
  actualizar: (id, data) => api.put(`/core/roles/${id}/`, data),
  eliminar: (id) => api.delete(`/core/roles/${id}/`),
};


export const backupsAPI = {
  // Configuracion de backups automaticos
  getConfig:  () => api.get('/core/backup-config/'),
  saveConfig: (data) => api.post('/core/backup-config/', data),
  // Lista de backups guardados
  listar: () => api.get('/core/backups/'),
  // Restaurar desde un backup existente
  restaurar: (data) => api.post('/core/backups/restore/', data),
};


// Core / Empresa
export const coreAPI = {
  ensureDefaults: () => api.post('/core/ensure-defaults/'),
  actualizarEmpresa: (data) => api.patch('/core/empresa/update/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
};

export default api;

