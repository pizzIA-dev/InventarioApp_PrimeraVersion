import React, { createContext, useState, useEffect } from 'react';
import { TenantProvider } from './TenantContext';
import axios from 'axios';

export const AuthContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token    = localStorage.getItem('access_token')    || sessionStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data')       || sessionStorage.getItem('user_data');
    if (token && userData) {
      try { setUser(JSON.parse(userData)); } catch {}
    }
    setLoading(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // tenantLookup: valida que el código de negocio exista y tiene suscripción activa.
  // Usado en el tab Colaborador para mostrar confirmación antes del login.
  // ─────────────────────────────────────────────────────────────────────
  const tenantLookup = async (code) => {
    try {
      const res = await axios.get(`${API_BASE}/api/public/tenant-lookup/`, {
        params: { code: code.trim().toLowerCase() }
      });
      return { success: true, ...res.data };
    } catch (err) {
      const data = err.response?.data || {};
      return {
        success: false,
        found: data.found || false,
        nombre: data.nombre || null,
        suscripcion_activa: data.suscripcion_activa,
        message: data.error || 'Código de negocio no válido.',
      };
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // platformLogin: autentica GERENTES contra los schemas de tenant.
  // Devuelve Platform JWT + lista de negocios. No requiere usuario en schema publico.
  // ─────────────────────────────────────────────────────────────────────
  const platformLogin = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/api/public/platform-login/`, { email, password });
      const { access, refresh, negocios } = res.data;
      sessionStorage.setItem('platform_access_token',  access);
      sessionStorage.setItem('platform_refresh_token', refresh);
      sessionStorage.setItem('platform_email',         email);
      return { success: true, negocios };
    } catch (err) {
      const data = err.response?.data || {};
      return {
        success: false,
        suscripcion_inactiva: data.suscripcion_inactiva || false,
        message: data.error || 'Credenciales incorrectas',
      };
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // colaboradorLogin: login DIRECTO para colaboradores/vendedores.
  // Recibe: schema (código de negocio), username, password.
  // Llama al endpoint del tenant /t/:schema/api/auth/login/ directamente.
  // ─────────────────────────────────────────────────────────────────────
  const colaboradorLogin = async (schema, username, password, remember = false) => {
    try {
      const loginUrl = `${API_BASE}/t/${schema}/api/auth/login/`;
      const response = await axios.post(loginUrl, { username, password });
      const { access, refresh, user: userData } = response.data;
      const storage = remember ? localStorage : sessionStorage;

      ['access_token', 'refresh_token', 'user_data'].forEach(k => {
        localStorage.removeItem(k); sessionStorage.removeItem(k);
      });

      storage.setItem('access_token',  access);
      storage.setItem('refresh_token', refresh);
      storage.setItem('user_data',     JSON.stringify(userData));
      localStorage.setItem('tenant_schema', schema);

      setUser(userData);
      return { success: true, schema };
    } catch (err) {
      const data = err.response?.data || {};
      return {
        success: false,
        message: data.detail || data.error || 'Credenciales incorrectas.',
      };
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // accessTenant: accede a un negocio sin segundo login usando Platform JWT
  // ─────────────────────────────────────────────────────────────────────
  const accessTenant = async (schema, remember = false) => {
    const platformToken = sessionStorage.getItem('platform_access_token');
    if (!platformToken) {
      return { success: false, message: 'Sesion de plataforma no encontrada.' };
    }
    try {
      const res = await axios.post(
        `${API_BASE}/api/public/tenant-token/`,
        { schema },
        { headers: { Authorization: `Bearer ${platformToken}` } }
      );
      const { access, refresh, user: userData, schema: tenantSchema } = res.data;
      const storage = remember ? localStorage : sessionStorage;

      ['access_token','refresh_token','user_data'].forEach(k => {
        localStorage.removeItem(k); sessionStorage.removeItem(k);
      });

      storage.setItem('access_token',  access);
      storage.setItem('refresh_token', refresh);
      storage.setItem('user_data',     JSON.stringify(userData));
      localStorage.setItem('tenant_schema', tenantSchema);

      setUser(userData);
      return { success: true, schema: tenantSchema };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.error || 'No se pudo acceder al negocio.',
      };
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // login: login directo al tenant via /t/{schema}/api/auth/login/
  // Mantenido por compatibilidad con el flujo de Reset Password, etc.
  // ─────────────────────────────────────────────────────────────────────
  const login = async (username, password, remember = false, schema = '') => {
    try {
      const loginUrl = schema
        ? `${API_BASE}/t/${schema}/api/auth/login/`
        : `${API_BASE}/api/auth/login/`;

      const response = await axios.post(loginUrl, { username, password });
      const { access, refresh, user: userData } = response.data;
      const storage = remember ? localStorage : sessionStorage;

      ['access_token','refresh_token','user_data'].forEach(k => {
        localStorage.removeItem(k); sessionStorage.removeItem(k);
      });

      storage.setItem('access_token',  access);
      storage.setItem('refresh_token', refresh);
      storage.setItem('user_data',     JSON.stringify(userData));
      if (schema) localStorage.setItem('tenant_schema', schema);

      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Credenciales incorrectas',
      };
    }
  };

  const logout = () => {
    ['access_token','refresh_token','user_data','tenant_schema'].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k);
    });
    ['platform_access_token','platform_refresh_token','platform_email'].forEach(k => {
      sessionStorage.removeItem(k);
    });
    setUser(null);
  };

  const isGerente     = user?.rol === 'GERENTE';
  // Detectar colaborador: tanto el rol nuevo como el legacy 'VENDEDOR'
  const isColaborador = user?.rol === 'COLABORADOR' || user?.rol === 'VENDEDOR';

  return (
    <TenantProvider>
      <AuthContext.Provider value={{
        user, login, logout, loading,
        platformLogin, accessTenant,
        colaboradorLogin, tenantLookup,
        isVendedor:     isColaborador,  // alias legacy — preferir isColaborador
        isColaborador,
        isGerente,
      }}>
        {!loading && children}
      </AuthContext.Provider>
    </TenantProvider>
  );
};