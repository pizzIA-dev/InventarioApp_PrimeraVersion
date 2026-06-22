import React, { createContext, useContext, useState, useCallback } from 'react';

export const TenantContext = createContext({});

export const TenantProvider = ({ children }) => {
  const [tenantSchema, setTenantSchemaState] = useState(
    () => localStorage.getItem('tenant_schema') || ''
  );

  const setTenantSchema = useCallback((schema) => {
    if (schema) {
      localStorage.setItem('tenant_schema', schema);
    } else {
      localStorage.removeItem('tenant_schema');
    }
    setTenantSchemaState(schema || '');
  }, []);

  const clearTenant = useCallback(() => {
    localStorage.removeItem('tenant_schema');
    setTenantSchemaState('');
  }, []);

  const apiBase = tenantSchema
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/t/${tenantSchema}`
    : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

  return (
    <TenantContext.Provider value={{ tenantSchema, setTenantSchema, clearTenant, apiBase }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);