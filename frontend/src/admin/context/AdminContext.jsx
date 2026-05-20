import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApi, getAdminToken, setAdminToken as storeToken, removeAdminToken } from '../api/adminClient';

const AdminContext = createContext(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
};

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentAdminPage, setCurrentAdminPage] = useState('dashboard');
  const [adminPageParams, setAdminPageParams] = useState({});
  const [notifications, setNotifications] = useState({ pendingProducts: 0, openDisputes: 0, pendingVendors: 0 });

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      adminApi.get('/auth/me')
        .then(data => setAdmin(data))
        .catch(() => removeAdminToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!admin) return;
    try {
      const [products, disputes, vendors] = await Promise.all([
        adminApi.get('/products?isActive=false&limit=1'),
        adminApi.get('/orders/disputes'),
        adminApi.get('/vendors/applications'),
      ]);
      setNotifications({
        pendingProducts: products.total || 0,
        openDisputes: (disputes || []).filter(d => d.status === 'OPEN').length,
        pendingVendors: (vendors || []).filter(v => v.status === 'PENDING').length,
      });
    } catch {}
  }, [admin]);

  useEffect(() => {
    if (admin) loadNotifications();
  }, [admin, loadNotifications]);

  const setAdminToken = (token, user) => {
    storeToken(token);
    setAdmin(user);
  };

  const logout = () => {
    removeAdminToken();
    setAdmin(null);
    setCurrentAdminPage('dashboard');
  };

  const navigateAdmin = (page, params = {}) => {
    setCurrentAdminPage(page);
    setAdminPageParams(params);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{
      admin, setAdmin, setAdminToken, logout,
      currentAdminPage, adminPageParams, navigateAdmin,
      notifications, loadNotifications
    }}>
      {children}
    </AdminContext.Provider>
  );
};
