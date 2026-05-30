const fs = require('fs');
const filePath = 'frontend/src/services/api.js';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = 'exportarHistorialGlobal: (params) => api.get(\\'/fiados/fiados/exportar_historial_global/\\', { params, responseType: \\'blob\\' }),\\n};';
const idx = content.indexOf(targetStr);

if (idx !== -1) {
    content = content.substring(0, idx + targetStr.length);
}

const newApis = \

// Gestion de Usuarios (solo Gerente)
export const usuariosAPI = {
  listar: () => api.get('/auth/usuarios/'),
  crear: (data) => api.post('/auth/usuarios/crear/', data),
  toggle: (id) => api.patch(\\\/auth/usuarios/\\\/toggle/\\\),
  cambiarPassword: (id, data) => api.put(\\\/auth/usuarios/\\\/password/\\\, data),
  asignarAlmacen: (id, almacenId) => api.patch(\\\/auth/usuarios/\\\/asignar-almacen/\\\, { almacen_id: almacenId }),
};

export const rolesAPI = {
  listar: () => api.get('/auth/roles/'),
  crear: (data) => api.post('/auth/roles/', data),
  actualizar: (id, data) => api.put(\\\/auth/roles/\\\/\\\, data),
  eliminar: (id) => api.delete(\\\/auth/roles/\\\/\\\),
};

export const almacenesAPI = {
  listar: (params) => api.get('/productos/almacenes/', { params }),
  getById: (id) => api.get(\\\/productos/almacenes/\\\/\\\),
  crear: (data) => api.post('/productos/almacenes/', data),
  actualizar: (id, data) => api.patch(\\\/productos/almacenes/\\\/\\\, data),
  desactivar: (id) => api.delete(\\\/productos/almacenes/\\\/\\\),
  miAlmacen: () => api.get('/productos/almacenes/mi-almacen/'),
  getStockAlmacen: (params) => api.get('/productos/stock-almacen/', { params }),
  getTraslados: (params) => api.get('/productos/traslados/', { params }),
  crearTraslado: (data) => api.post('/productos/traslados/', data),
};

export const backupsAPI = {
  generar: () => api.post('/backups/generar/'),
  listar: () => api.get('/backups/listar/'),
  descargar: (filename) => api.get(\\\/backups/descargar/?filename=\\\\\\, { responseType: 'blob' }),
  restaurar: (data) => api.post('/backups/restaurar/', data),
};

export default api;
\;

content += newApis;
fs.writeFileSync(filePath, content, 'utf8');

