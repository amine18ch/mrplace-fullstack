import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApi, getAdminToken, setAdminToken as storeToken, removeAdminToken } from '../api/adminClient';

const AdminContext = createContext(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
};

const PERMISSIONS = {
  MODERATEUR: [
    'vendors.read', 'vendors.write',
    'products.read', 'products.write',
    'orders.read', 'orders.write',
    'disputes.write',
    'customers.read',
    'marketing.read',
    'logs.read',
    'dashboard.read',
  ],
  SUPPORT: [
    'orders.read', 'orders.write',
    'disputes.write',
    'customers.read', 'customers.write',
    'dashboard.read',
  ],
  COMPTABLE: [
    'dashboard.read',
    'finance.read', 'finance.write',
    'vendors.read',
    'orders.read',
  ],
  MARKETING: [
    'dashboard.read',
    'marketing.read', 'marketing.write',
    'products.read',
  ],
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

  const can = useCallback((action) => {
    if (!admin) return false;
    if (admin.role === 'SUPER_ADMIN') return true;
    return (PERMISSIONS[admin.role] || []).includes(action);
  }, [admin]);

  const loadNotifications = useCallback(async () => {
    if (!admin) return;
    try {
      const promises = [];
      if (can('products.read')) promises.push(adminApi.get('/products?isActive=false&limit=1').catch(() => ({ total: 0 })));
      else promises.push(Promise.resolve({ total: 0 }));

      if (can('disputes.write')) promises.push(adminApi.get('/orders/disputes').catch(() => []));
      else promises.push(Promise.resolve([]));

      if (can('vendors.read')) promises.push(adminApi.get('/vendors/applications').catch(() => []));
      else promises.push(Promise.resolve([]));

      const [products, disputes, vendors] = await Promise.all(promises);
      setNotifications({
        pendingProducts: products.total || 0,
        openDisputes: (disputes || []).filter(d => d.status === 'OPEN').length,
        pendingVendors: (vendors || []).filter(v => v.status === 'PENDING').length,
      });
    } catch {}
  }, [admin, can]);

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
      notifications, loadNotifications,
      can,
    }}>
      {children}
    </AdminContext.Provider>
  );
};
