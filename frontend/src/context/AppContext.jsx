import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi, wishlistApi, authApi, getToken, setToken, removeToken } from '../api/client';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const AppProvider = ({ children }) => {
  const [user, setUser]             = useState(null);
  const [cart, setCart]             = useState([]);
  const [wishlist, setWishlist]     = useState([]);   // array of productIds
  const [toasts, setToasts]         = useState([]);
  const [currentPage, setCurrentPage] = useState('home');
  const [pageParams, setPageParams] = useState({});
  const [recentlyViewed, setRecently] = useState([]);
  const [promoCode, setPromoCode]   = useState(null);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [loginOpen, setLoginOpen]   = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);

  // ── Navigation
  const navigate = (page, params = {}) => {
    setCurrentPage(page); setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Toasts
  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  // ── Auth
  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    toast(`Bienvenue, ${data.user.name} ! 🎉`);
    await loadCart();
    await loadWishlist();
    return data.user;
  };

  const register = async (name, email, password) => {
    const data = await authApi.register({ name, email, password });
    setToken(data.token);
    setUser(data.user);
    toast(`Compte créé ! Bienvenue, ${data.user.name} 🎉`);
    return data.user;
  };

  const logout = () => {
    removeToken();
    setUser(null); setCart([]); setWishlist([]); setPromoCode(null);
    toast('Déconnecté', 'info');
    navigate('home');
  };

  // ── Bootstrap
  useEffect(() => {
    const init = async () => {
      if (getToken()) {
        try {
          const me = await authApi.me();
          setUser(me);
          await Promise.all([loadCart(), loadWishlist()]);
        } catch {
          removeToken();
        }
      }
    };
    init();
  }, []);

  // ── Cart
  const loadCart = async () => {
    if (!getToken()) return;
    const items = await cartApi.list();
    setCart(items);
  };

  const addToCart = async (product, opts = {}) => {
    if (!user) { setLoginOpen(true); return; }
    try {
      setLoadingCart(true);
      await cartApi.add(product.id, opts.qty || 1, opts.variant || {});
      await loadCart();
      toast(`✓ "${product.title.slice(0, 30)}..." ajouté au panier`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoadingCart(false);
    }
  };

  const updateCartQty = async (productId, qty) => {
    await cartApi.update(productId, qty);
    await loadCart();
  };

  const removeFromCart = async (productId) => {
    await cartApi.remove(productId);
    setCart(c => c.filter(it => it.productId !== productId));
  };

  const clearCart = async () => {
    await cartApi.clear();
    setCart([]);
  };

  // ── Wishlist
  const loadWishlist = async () => {
    if (!getToken()) return;
    const ids = await wishlistApi.ids();
    setWishlist(ids);
  };

  const toggleWishlist = async (productId) => {
    if (!user) { setLoginOpen(true); return; }
    const was = wishlist.includes(productId);
    setWishlist(w => was ? w.filter(x => x !== productId) : [...w, productId]);
    const res = await wishlistApi.toggle(productId);
    toast(res.added ? '❤ Ajouté aux favoris' : 'Retiré des favoris', res.added ? 'success' : 'info');
  };

  // ── Recently Viewed
  const addToRecently = (productId) => {
    setRecently(r => [productId, ...r.filter(x => x !== productId)].slice(0, 12));
  };

  // ── Promo
  const applyPromo = async (code) => {
    try {
      const { promoApi } = await import('../api/client');
      const promo = await promoApi.validate(code);
      setPromoCode(promo);
      toast(`✓ Code "${promo.code}" appliqué — ${promo.percent}% de remise`);
      return true;
    } catch (e) {
      toast(e.message || 'Code promo invalide', 'error');
      return false;
    }
  };

  const cartCount = cart.reduce((s, it) => s + it.qty, 0);

  return (
    <AppCtx.Provider value={{
      user, login, register, logout, loginOpen, setLoginOpen,
      cart, cartCount, addToCart, updateCartQty, removeFromCart, clearCart, loadingCart,
      wishlist, toggleWishlist,
      toasts, toast,
      currentPage, pageParams, navigate,
      recentlyViewed, addToRecently,
      promoCode, setPromoCode, applyPromo,
      miniCartOpen, setMiniCartOpen,
    }}>
      {children}
    </AppCtx.Provider>
  );
};
