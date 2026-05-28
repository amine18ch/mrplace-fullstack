import { createContext, useContext, useState, useEffect } from 'react';
import { sellerApi, getSellerToken, setSellerToken as storeToken, removeSellerToken } from '../api/sellerClient';

const Ctx = createContext(null);
export const useSeller = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSeller must be inside SellerProvider');
  return c;
};

export const SellerProvider = ({ children }) => {
  const [seller, setSeller]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState('dashboard');
  const [pageParams, setPageParams] = useState({});
  const [notifications, setNotifs]  = useState({ pendingProducts: 0, pendingOrders: 0, unreadMessages: 0, pendingReturns: 0 });

  useEffect(() => {
    if (getSellerToken()) {
      sellerApi.get('/auth/me').then(setSeller).catch(removeSellerToken).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  useEffect(() => {
    if (!seller) return;
    sellerApi.get('/orders?status=EN_ATTENTE&limit=1').then(d => {
      setNotifs(n => ({ ...n, pendingOrders: d.total || 0 }));
    }).catch(() => {});
    sellerApi.get('/products?status=inactive&limit=1').then(d => {
      setNotifs(n => ({ ...n, pendingProducts: d.total || 0 }));
    }).catch(() => {});
    sellerApi.get('/messages').then(convs => {
      const unread = convs.reduce((s, c) => s + (c.unread || 0), 0);
      setNotifs(n => ({ ...n, unreadMessages: unread }));
    }).catch(() => {});
    sellerApi.get('/returns').then(returns => {
      const pending = returns.filter(r => r.status === 'PENDING').length;
      setNotifs(n => ({ ...n, pendingReturns: pending }));
    }).catch(() => {});
  }, [seller]);

  const login = async (email, password) => {
    const data = await sellerApi.post('/auth/login', { email, password });
    storeToken(data.token);
    setSeller(data.seller);
    return data.seller;
  };

  const logout = () => {
    removeSellerToken();
    setSeller(null);
    setPage('dashboard');
  };

  const navigate = (p, params = {}) => {
    setPage(p);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <Ctx.Provider value={{ seller, setSeller, login, logout, page, pageParams, navigate, notifications }}>
      {children}
    </Ctx.Provider>
  );
};
