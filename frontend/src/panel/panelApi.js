/**
 * Cliente HTTP del Panel de Control.
 * Separado del `api.js` de los negocios: otra baseURL (/api/panel, sin /t/{schema}),
 * otras claves de almacenamiento y su propio manejo de expiración.
 */
import axios from 'axios';

const _host = window.location.hostname;
const _port = import.meta.env.VITE_API_PORT || '8000';
const API_BASE = import.meta.env.VITE_API_URL || `http://${_host}:${_port}`;

export const PANEL_KEYS = {
  access: 'panel_access_token',
  refresh: 'panel_refresh_token',
  user: 'panel_user',
};

// sessionStorage: la sesión del panel muere al cerrar la pestaña/navegador.
export const panelStorage = {
  get: (k) => sessionStorage.getItem(PANEL_KEYS[k]),
  set: (k, v) => sessionStorage.setItem(PANEL_KEYS[k], v),
  clear: () => Object.values(PANEL_KEYS).forEach((k) => sessionStorage.removeItem(k)),
};

const panelApi = axios.create({
  baseURL: `${API_BASE}/api/panel`,
  headers: { 'Content-Type': 'application/json' },
});

panelApi.interceptors.request.use((config) => {
  const token = panelStorage.get('access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresco transparente del access token (una sola petición de refresh a la vez)
let refreshEnCurso = null;

const cerrarSesion = () => {
  panelStorage.clear();
  window.dispatchEvent(new Event('panel:logout'));
};

panelApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const esAuth = original?.url?.includes('/auth/');
    if (status !== 401 || esAuth || original?._reintento) return Promise.reject(error);

    const refresh = panelStorage.get('refresh');
    if (!refresh) {
      cerrarSesion();
      return Promise.reject(error);
    }
    try {
      refreshEnCurso = refreshEnCurso || axios
        .post(`${API_BASE}/api/panel/auth/refresh/`, { refresh })
        .then((r) => {
          panelStorage.set('access', r.data.access);
          return r.data.access;
        })
        .finally(() => { refreshEnCurso = null; });
      const nuevo = await refreshEnCurso;
      original._reintento = true;
      original.headers.Authorization = `Bearer ${nuevo}`;
      return panelApi(original);
    } catch (e) {
      cerrarSesion();
      return Promise.reject(error);
    }
  },
);

export const panelAPI = {
  login: (data) => panelApi.post('/auth/login/', data),
  me: () => panelApi.get('/auth/me/'),

  metricas: (params) => panelApi.get('/metricas/', { params }),
  planes: () => panelApi.get('/planes/'),

  empresas: (params) => panelApi.get('/empresas/', { params }),
  empresa: (id) => panelApi.get(`/empresas/${id}/`),
  activar: (id, data) => panelApi.post(`/empresas/${id}/activar/`, data),
  extender: (id, data) => panelApi.post(`/empresas/${id}/extender/`, data),
  suspender: (id, data) => panelApi.post(`/empresas/${id}/suspender/`, data),
  reactivar: (id, data) => panelApi.post(`/empresas/${id}/reactivar/`, data),
  cambiarPlan: (id, data) => panelApi.post(`/empresas/${id}/cambiar-plan/`, data),

  pagos: (params) => panelApi.get('/pagos/', { params }),
  crearPago: (data) => panelApi.post('/pagos/', data),
  editarPago: (id, data) => panelApi.patch(`/pagos/${id}/`, data),
  revertirPago: (id, data) => panelApi.post(`/pagos/${id}/revertir/`, data),

  gastos: (params) => panelApi.get('/gastos/', { params }),
  crearGasto: (data) => panelApi.post('/gastos/', data),
  editarGasto: (id, data) => panelApi.patch(`/gastos/${id}/`, data),
  eliminarGasto: (id) => panelApi.delete(`/gastos/${id}/`),

  movimientos: (params) => panelApi.get('/movimientos/', { params }),
};

/** Extrae un mensaje legible de un error de DRF. */
export const mensajeError = (err, fallback = 'Ocurrió un error inesperado.') => {
  const d = err?.response?.data;
  if (!d) return err?.message === 'Network Error' ? 'No se pudo conectar con el servidor.' : fallback;
  if (typeof d === 'string') return fallback;
  if (d.detail) return d.detail;
  if (d.non_field_errors) return d.non_field_errors.join(' ');
  const primero = Object.entries(d)[0];
  if (primero) {
    const [campo, val] = primero;
    const texto = Array.isArray(val) ? val.join(' ') : String(val);
    return campo === 'non_field_errors' ? texto : `${campo}: ${texto}`;
  }
  return fallback;
};

export default panelApi;
