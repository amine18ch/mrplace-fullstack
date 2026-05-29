import { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { productsApi, categoriesApi } from '../api/client';
import { fmt } from './ui';
import Icon from './Icon';

// Cache global des catégories pour éviter les rechargements
let _catCache = null;
const getCats = async () => {
  if (_catCache) return _catCache;
  _catCache = await categoriesApi.list();
  return _catCache;
};

// ── Search Bar
const SearchBar = () => {
  const { navigate } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [cats, setCats] = useState([]);
  const timer = useRef(null);

  useEffect(() => {
    getCats().then(setCats).catch(() => {});
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      const res = await productsApi.suggestions(q, cat);
      setSuggestions(res);
    }, 300);
  }, [q, cat]);

  const submit = () => {
    if (q.trim()) { navigate('search', { query: q }); setFocused(false); }
  };

  return (
    <div className="flex-1 relative max-w-3xl">
      <div className="flex items-center bg-white rounded-full overflow-hidden shadow-lg ring-2 ring-transparent focus-within:ring-blue-300 transition">
        <select value={cat} onChange={e => setCat(e.target.value)}
          className="bg-gray-50 text-sm font-medium text-slate-700 px-3 py-3 border-r border-gray-200 outline-none cursor-pointer">
          <option value="all">Tout</option>
          {cats.map(c => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
        </select>
        <input value={q} onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Rechercher produits, marques et plus..."
          className="flex-1 px-4 py-3 text-sm outline-none text-slate-800" />
        <button onClick={submit} className="px-5 py-3 bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2">
          <Icon name="search" size={18} />
          <span className="hidden md:inline text-sm font-semibold">Chercher</span>
        </button>
      </div>

      {focused && suggestions.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 anim-fadeIn">
          <div className="p-2 text-xs uppercase text-gray-500 font-semibold border-b">Suggestions</div>
          {suggestions.map(p => (
            <div key={p.id}
              onMouseDown={() => { navigate('product', { id: p.id }); setQ(''); setFocused(false); }}
              className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer transition border-b last:border-0">
              <div className="text-3xl">{p.images?.[0] || '📦'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{p.title}</div>
                <div className="text-xs text-gray-500">{p.brand} · {p.category?.name}</div>
              </div>
              <div className="text-sm font-bold text-blue-600">{fmt(p.price)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Mini Cart
const MiniCart = () => {
  const { cart, navigate, setMiniCartOpen } = useApp();
  const total = cart.reduce((s, it) => s + it.product.price * it.qty, 0);
  return (
    <div onMouseEnter={() => setMiniCartOpen(true)} onMouseLeave={() => setMiniCartOpen(false)}
      className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 w-96 z-50 anim-fadeIn">
      <div className="p-4 border-b font-bold text-slate-800">Panier ({cart.length})</div>
      <div className="max-h-72 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">🛒</div>
            <div className="text-sm">Votre panier est vide</div>
          </div>
        ) : cart.slice(0, 4).map(it => (
          <div key={it.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b">
            <div className="text-3xl">{it.product.images?.[0] || '📦'}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-700 truncate">{it.product.title}</div>
              <div className="text-xs text-gray-500">Qté: {it.qty}</div>
            </div>
            <div className="text-sm font-bold text-blue-600">{fmt(it.product.price * it.qty)}</div>
          </div>
        ))}
      </div>
      {cart.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between mb-3">
            <span className="text-sm text-gray-600">Sous-total</span>
            <span className="font-bold text-blue-600">{fmt(total)}</span>
          </div>
          <button onClick={() => navigate('cart')}
            className="w-full py-2.5 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
            Voir le panier
          </button>
        </div>
      )}
    </div>
  );
};

// ── Top Bar
export const TopBar = () => (
  <div className="bg-[#0A1F44] text-white text-xs h-8 flex items-center px-4">
    <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span>🇹🇳 Livrer en Tunisie</span>
        <span className="opacity-50">|</span>
        <span className="cursor-pointer hover:underline">Français</span>
      </div>
      <div className="hidden md:flex items-center gap-5">
        {['Vendre sur MARKET', 'Suivre commande', 'Aide', "Télécharger l'app"].map(t => (
          <span key={t} className="cursor-pointer hover:underline">{t}</span>
        ))}
      </div>
    </div>
  </div>
);

// ── Header
export const Header = () => {
  const { cart, cartCount, wishlist, navigate, setLoginOpen, user, logout, miniCartOpen, setMiniCartOpen } = useApp();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="gradient-header text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-[1400px] mx-auto px-4 h-20 flex items-center gap-4">
        <div onClick={() => navigate('home')} className="flex items-center gap-1 cursor-pointer shrink-0">
          <span className="text-3xl font-extrabold tracking-tight text-shadow">MARKET</span>
          <span className="w-3 h-3 rounded-full bg-blue-300 anim-pulse" />
        </div>
        <div className="hidden lg:flex items-center gap-1 text-sm cursor-pointer hover:bg-white/10 px-3 py-2 rounded-lg transition shrink-0">
          <Icon name="pin" size={18} />
          <div>
            <div className="text-[10px] opacity-80">Livrer à</div>
            <div className="font-semibold flex items-center gap-1">Tunis <Icon name="chevD" size={14} /></div>
          </div>
        </div>

        <SearchBar />

        <div className="flex items-center gap-2 shrink-0">
          {/* Account */}
          <div className="relative">
            <div onClick={() => user ? setUserMenuOpen(!userMenuOpen) : setLoginOpen(true)}
              className="hidden md:flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer transition text-sm">
              <Icon name="user" size={20} />
              <div>
                <div className="text-[10px] opacity-80">Bonjour, {user ? user.name.split(' ')[0] : 'Connectez-vous'}</div>
                <div className="font-semibold">Compte</div>
              </div>
            </div>
            {userMenuOpen && user && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 w-48 z-50 overflow-hidden anim-fadeIn">
                {[
                  { label: 'Mon compte', page: 'account' },
                  { label: 'Mes commandes', page: 'orders' },
                  { label: 'Ma wishlist', page: 'wishlist' },
                ].map(item => (
                  <div key={item.label}
                    onClick={() => { navigate(item.page); setUserMenuOpen(false); }}
                    className="px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer border-b last:border-0">
                    {item.label}
                  </div>
                ))}
                <div onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="px-4 py-3 text-sm text-red-500 hover:bg-red-50 cursor-pointer font-semibold">
                  Déconnexion
                </div>
              </div>
            )}
          </div>

          {/* Wishlist */}
          <div onClick={() => navigate('wishlist')} className="relative hover:bg-white/10 p-2 rounded-lg cursor-pointer transition">
            <Icon name="heart" size={24} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </div>

          {/* Cart */}
          <div className="relative" onMouseEnter={() => setMiniCartOpen(true)} onMouseLeave={() => setMiniCartOpen(false)}>
            <div onClick={() => navigate('cart')}
              className="relative hover:bg-white/10 p-2 rounded-lg cursor-pointer transition flex items-center gap-2">
              <Icon name="cart" size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center anim-pulse">
                  {cartCount}
                </span>
              )}
              <span className="hidden md:inline text-sm font-semibold">Panier</span>
            </div>
            {miniCartOpen && <MiniCart />}
          </div>
        </div>
      </div>
    </header>
  );
};

// ── Category Bar avec mega-menu dynamique
export const CategoryBar = () => {
  const { navigate } = useApp();
  const [cats, setCats]         = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered]   = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    getCats().then(tree => {
      setCats(tree);
      if (tree.length) setHovered(tree[0]);
    }).catch(() => {});
  }, []);

  const closeMenu = () => { setMenuOpen(false); };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm relative z-40">
      {/* overflow-visible ici pour que les dropdowns ne soient pas coupés */}
      <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center gap-1" style={{ overflowX: 'visible', overflowY: 'visible' }}>

        {/* Bouton "Toutes catégories" */}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onMouseEnter={() => { setMenuOpen(true); if (cats.length) setHovered(cats[0]); }}
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition whitespace-nowrap">
            <Icon name="menu" size={16} />Catégories<Icon name="chevD" size={14} />
          </button>

          {/* Mega-menu */}
          {menuOpen && (
            <div
              className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex anim-fadeIn"
              style={{ width: 560 }}
              onMouseLeave={closeMenu}>
              {/* Colonne gauche — catégories parentes */}
              <div className="w-52 border-r border-gray-100 py-2 overflow-y-auto" style={{ maxHeight: 420 }}>
                {cats.map(c => (
                  <div key={c.id}
                    onMouseEnter={() => setHovered(c)}
                    onClick={() => { navigate('category', { slug: c.slug }); closeMenu(); }}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition ${hovered?.id === c.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-slate-700'}`}>
                    <span className="text-xl flex-shrink-0">{c.icon}</span>
                    <span className="text-sm font-medium flex-1 leading-tight">{c.name}</span>
                    {c.children?.length > 0 && <Icon name="chevR" size={14} className="text-gray-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>

              {/* Colonne droite — sous-catégories */}
              <div className="flex-1 p-4 overflow-y-auto" style={{ maxHeight: 420 }}>
                {hovered && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{hovered.icon}</span>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{hovered.name}</div>
                        <button onClick={() => { navigate('category', { slug: hovered.slug }); closeMenu(); }}
                          className="text-xs text-blue-600 hover:underline">Voir tout →</button>
                      </div>
                    </div>
                    {hovered.children?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1">
                        {hovered.children.map(sub => (
                          <div key={sub.id}
                            onClick={() => { navigate('category', { slug: sub.slug }); closeMenu(); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer transition group">
                            <span className="text-base flex-shrink-0">{sub.icon}</span>
                            <span className="text-xs text-slate-600 group-hover:text-blue-600 leading-tight">{sub.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Pas de sous-catégories</div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Raccourcis horizontaux avec sous-catégories au survol */}
        {cats.map(c => (
          <CatItem key={c.slug} cat={c} navigate={navigate} />
        ))}
      </div>
    </div>
  );
};

const CatItem = ({ cat, navigate }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ left: 0, top: 0 });
  const btnRef = useRef(null);
  const timerRef = useRef(null);

  const show = () => {
    clearTimeout(timerRef.current);
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + window.scrollY });
    }
    setOpen(true);
  };
  const hide = () => { timerRef.current = setTimeout(() => setOpen(false), 120); };

  return (
    <div className="relative flex-shrink-0" onMouseEnter={show} onMouseLeave={hide}>
      <button ref={btnRef}
        onClick={() => navigate('category', { slug: cat.slug })}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-full transition whitespace-nowrap ${open ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:text-blue-600 hover:bg-blue-50'}`}>
        <span>{cat.icon}</span>
        <span>{cat.name}</span>
        {cat.children?.length > 0 && <Icon name="chevD" size={11} className="opacity-40 ml-0.5" />}
      </button>

      {open && cat.children?.length > 0 && (
        <div
          onMouseEnter={() => clearTimeout(timerRef.current)}
          onMouseLeave={hide}
          style={{ position: 'fixed', left: pos.left, top: pos.top, minWidth: 220, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-2xl border border-gray-200 py-2 anim-fadeIn">
          <div className="px-4 py-1.5 mb-1 border-b border-gray-100">
            <button onClick={() => { navigate('category', { slug: cat.slug }); setOpen(false); }}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5">
              <span>{cat.icon}</span> Tout — {cat.name}
            </button>
          </div>
          {cat.children.map(sub => (
            <button key={sub.id}
              onClick={() => { navigate('category', { slug: sub.slug }); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 transition text-left group">
              <span className="text-lg flex-shrink-0">{sub.icon}</span>
              <span className="text-sm text-slate-700 group-hover:text-blue-600">{sub.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Footer
export const Footer = () => {
  const { navigate } = useApp();
  return (
    <footer className="bg-[#0F172A] text-gray-300 mt-16">
      <div className="max-w-[1400px] mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-1 mb-4">
            <span className="text-3xl font-extrabold text-white">MARKET</span>
            <span className="w-3 h-3 rounded-full bg-blue-400" />
          </div>
          <p className="text-sm mb-4 opacity-80">Votre marketplace de confiance en Tunisie. Des millions de produits, des vendeurs vérifiés et une livraison express.</p>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Icon name="bell" size={16} />Newsletter
            </div>
            <div className="flex gap-2">
              <input placeholder="Votre email" className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm outline-none text-white placeholder:text-white/50" />
              <button className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">S'inscrire</button>
            </div>
          </div>
        </div>
        {[
          { t: 'Société', items: ['À propos', 'Carrières', 'Presse', 'Partenaires'] },
          { t: 'Service Client', items: ['Centre d\'aide', 'Nous contacter', 'Retours', 'Suivre commande'] },
          { t: 'Vendre', items: ['Devenir vendeur', 'Centre vendeur', 'Publicité', 'Logistique'] },
        ].map(col => (
          <div key={col.t}>
            <div className="font-bold text-white mb-3">{col.t}</div>
            <div className="space-y-2 text-sm opacity-80">
              {col.items.map(i => <div key={i} className="hover:text-white hover:underline cursor-pointer">{i}</div>)}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs opacity-70">© 2026 MARKET Inc. Tous droits réservés.</div>
          <div className="flex items-center gap-3">
            <span className="text-xs opacity-70">Nous acceptons:</span>
            {['VISA','MC','D17','CIB','Espèces'].map(p => (
              <div key={p} className="bg-white/10 px-3 py-1 rounded text-xs font-bold text-white">{p}</div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

// ── Toast Notifications
export const Toasts = () => {
  const { toasts } = useApp();
  return (
    <div className="fixed bottom-6 right-6 z-[200] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`anim-slideIn px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 ${
          t.type === 'error' ? 'bg-red-500' : t.type === 'info' ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-600 to-blue-500'
        }`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
};

// ── Login Modal
export const LoginModal = () => {
  const { loginOpen, setLoginOpen, login, register, toast } = useApp();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!loginOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      setLoginOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={() => setLoginOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 anim-fadeIn">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="gradient-hero-1 text-white p-6 relative">
          <button onClick={() => setLoginOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <Icon name="x" />
          </button>
          <h2 className="text-2xl font-extrabold">{mode === 'login' ? 'Bon retour !' : 'Créer un compte'}</h2>
          <p className="text-sm opacity-80 mt-1">
            {mode === 'login' ? 'Connectez-vous à votre compte' : 'Rejoignez MARKET en quelques secondes'}
          </p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          {mode === 'register' && (
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nom complet" required
              className="w-full px-4 py-3 border border-gray-200 rounded-full outline-none focus:border-blue-400" />
          )}
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="Email" required
            className="w-full px-4 py-3 border border-gray-200 rounded-full outline-none focus:border-blue-400" />
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Mot de passe" required
            className="w-full px-4 py-3 border border-gray-200 rounded-full outline-none focus:border-blue-400" />
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
          <div className="text-center text-sm text-gray-600 mt-3">
            {mode === 'login'
              ? <>Nouveau ? <span onClick={() => setMode('register')} className="text-blue-600 font-bold cursor-pointer hover:underline">Créer un compte</span></>
              : <>Déjà inscrit ? <span onClick={() => setMode('login')} className="text-blue-600 font-bold cursor-pointer hover:underline">Se connecter</span></>}
          </div>
        </form>
      </div>
    </div>
  );
};
