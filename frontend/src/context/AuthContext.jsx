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

  // ─────────────────────────────────────────────────────────────────────────
  // platformLogin: login en el schema PUBLICO (landing "Acceder")
  // Guarda un Platform JWT en sessionStorage['platform_access_token']
  // ─────────────────────────────────────────────────────────────────────────
  const platformLogin = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login/`, { username: email, password });
      const { access, refresh } = res.data;
      sessionStorage.setItem('platform_access_token',  access);
      sessionStorage.setItem('platform_refresh_token', refresh);
      sessionStorage.setItem('platform_email',         email);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.detail || 'Credenciales incorrectas',
      };
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // accessTenant: acceso sin segundo login usando el Platform JWT
  // Llama a /api/public/tenant-token/ y guarda el Tenant JWT
  // ─────────────────────────────────────────────────────────────────────────
  const accessTenant = async (schema, remember = false) => {
    const platformToken = sessionStorage.getItem('platform_access_token');
    if (!platformToken) {
      return { success: false, message: 'Sesión de plataforma no encontrada. Inicia sesión primero.' };
    }
    try {
      const res = await axios.post(
        `${API_BASE}/api/public/tenant-token/`,
        { schema },
        { headers: { Authorization: `Bearer ${platformToken}` } }
      );
      const { access, refresh, user: userData, schema: tenantSchema } = res.data;
      const storage = remember ? localStorage : sessionStorage;

      // Limpiar sesiones anteriores
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

  // ─────────────────────────────────────────────────────────────────────────
  // login: login directo al tenant via /t/{schema}/api/auth/login/
  // Usado desde Login.jsx (/t/:schema/login)
  // ─────────────────────────────────────────────────────────────────────────
  const login = async (username, password, remember = false, schema = '') => {
    try {
      // Tenant-aware: si hay schema usamos /t/{schema}/api/auth/login/
      const loginUrl = schema
        ? `${API_BASE}/t/${schema}/api/auth/login/`
        : `${API_BASE}/api/auth/login/`;

      const response = await axios.post(loginUrl, { username, password });
      const { access, refresh, user: userData } = response.data;
      const storage = remember ? localStorage : sessionStorage;

      // Limpiar el otro storage para evitar conflictos
      ['access_token','refresh_token','user_data'].forEach(k => {
        localStorage.removeItem(k); sessionStorage.removeItem(k);
      });

      storage.setItem('access_token',  access);
      storage.setItem('refresh_token', refresh);
      storage.setItem('user_data',     JSON.stringify(userData));

      // Guardar schema para que api.js use /t/{schema}/api/ en todas las llamadas
      if (schema) {
        localStorage.setItem('tenant_schema', schema);
      }

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

  return (
    <TenantProvider>
      <AuthContext.Provider value={{
        user, login, logout, loading,
        platformLogin, accessTenant,
        isVendedor: user?.rol === 'VENDEDOR',
        isGerente:  user?.rol === 'GERENTE',
      }}>
        {!loading && children}
      </AuthContext.Provider>
    </TenantProvider>
  );
};