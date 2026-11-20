import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { panelAPI, panelStorage } from './panelApi';

const PanelAuthContext = createContext(null);

export function PanelAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const raw = panelStorage.get('user');
      return raw && panelStorage.get('access') ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const logout = useCallback(() => {
    panelStorage.clear();
    setAdmin(null);
  }, []);

  useEffect(() => {
    const onLogout = () => setAdmin(null);
    window.addEventListener('panel:logout', onLogout);
    return () => window.removeEventListener('panel:logout', onLogout);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await panelAPI.login({ username, password });
    panelStorage.set('access', data.access);
    panelStorage.set('refresh', data.refresh);
    panelStorage.set('user', JSON.stringify(data.user));
    setAdmin(data.user);
    return data.user;
  }, []);

  const value = useMemo(() => ({ admin, login, logout }), [admin, login, logout]);
  return <PanelAuthContext.Provider value={value}>{children}</PanelAuthContext.Provider>;
}

export const usePanelAuth = () => useContext(PanelAuthContext);
