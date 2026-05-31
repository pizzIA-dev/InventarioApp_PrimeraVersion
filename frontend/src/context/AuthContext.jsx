import React, { createContext, useState, useEffect } from 'react';
import { TenantProvider } from './TenantContext';
import axios from 'axios';


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check both localStorage (remember=true) and sessionStorage (remember=false)
    const token    = localStorage.getItem('access_token')    || sessionStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data')       || sessionStorage.getItem('user_data');

    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (username, password, remember = false) => {
    try {
      // Multi-tenant: usar el hostname actual del navegador (ej: emprendedor.localhost)
      // para que la petición vaya al subdominio correcto del backend
      const host    = window.location.hostname;
      const port    = import.meta.env.VITE_API_PORT || '8000';
      const apiBase = import.meta.env.VITE_API_URL  || `http://${host}:${port}`;
      const response = await axios.post(`${apiBase}/api/auth/login/`, {
        username,
        password
      });

      const { access, refresh, user: userData } = response.data;

      // Si remember=true → localStorage (persiste entre sesiones)
      // Si remember=false → sessionStorage (se borra al cerrar el navegador)
      const storage = remember ? localStorage : sessionStorage;

      // Limpiar el otro storage para evitar conflictos
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('user_data');

      storage.setItem('access_token', access);
      storage.setItem('refresh_token', refresh);
      storage.setItem('user_data', JSON.stringify(userData));

      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login failed', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Credenciales inválidas'
      };
    }
  };

  const logout = () => {
    ['access_token','refresh_token','user_data'].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    localStorage.removeItem('tenant_schema');
    setUser(null);
  };

  return (
    <TenantProvider>
      <AuthContext.Provider value={{ user, login, logout, loading, isVendedor: user?.rol === 'VENDEDOR', isGerente: user?.rol === 'GERENTE' }}>
      {!loading && children}
      </AuthContext.Provider>
    </TenantProvider>
  );
};
