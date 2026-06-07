import { createContext, useContext, useState, useEffect } from 'react';
import { driverApi, getDriverToken, setDriverToken, removeDriverToken } from '../api/driverClient';

const DriverCtx = createContext(null);

export const useDriver = () => useContext(DriverCtx);

export function DriverProvider({ children }) {
  const [driver, setDriver] = useState(null);
  const [page, setPage]     = useState('tour');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getDriverToken();
    if (!token) { setLoading(false); return; }
    driverApi.get('/auth/me').then(d => setDriver(d)).catch(() => removeDriverToken()).finally(() => setLoading(false));
  }, []);

  const login = async (cin, password) => {
    const { token, driver: d } = await driverApi.post('/auth/login', { cin, password });
    setDriverToken(token);
    setDriver(d);
  };

  const logout = () => {
    removeDriverToken();
    setDriver(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400">Chargement...</div>
    </div>
  );

  return (
    <DriverCtx.Provider value={{ driver, login, logout, page, setPage }}>
      {children}
    </DriverCtx.Provider>
  );
}
