import { useState, useEffect } from 'react';
import { productsApi, sellersApi, ordersApi } from '../api/client';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { fmt, Stars, SkeletonCard, Spinner } from '../components/ui';
import Icon from '../components/Icon';

// ── Wishlist Page
export const WishlistPage = () => {
  const { wishlist, navigate, addToCart, toggleWishlist } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (wishlist.length === 0) { setLoading(false); return; }
    Promise.all(wishlist.map(id => productsApi.get(id).catch(()=>null)))
      .then(ps => { setProducts(ps.filter(Boolean)); setLoading(false); });
  }, [wishlist]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
        <Icon name="heart" className="text-red-500 fill-current" size={26} />
        Mes Favoris ({products.length})
      </h1>
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="text-8xl mb-4">❤️</div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Votre liste de favoris est vide</h2>
          <p className="text-gray-500 mb-6">Enregistrez les produits que vous aimez pour les retrouver facilement</p>
          <button onClick={() => navigate('home')} className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">
            Découvrir des produits
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 hover-lift overflow-hidden">
              <div onClick={() => navigate('product', { id: p.id })}
                className="bg-blue-50 aspect-square flex items-center justify-center text-7xl cursor-pointer">
                {p.images?.[0] || '📦'}
              </div>
              <div className="p-3">
                <div className="text-xs text-blue-600 font-semibold">{p.brand}</div>
                <div className="text-sm font-medium text-slate-800 line-clamp-2 mt-1 min-h-[40px]">{p.title}</div>
                <div className="price-text text-lg text-blue-600 mt-1">{fmt(p.price)}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => addToCart(p)} className="flex-1 py-2 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700">
                    Ajouter
                  </button>
                  <button onClick={() => toggleWishlist(p.id)} className="px-3 py-2 border border-red-200 text-red-500 rounded-full hover:bg-red-50">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Seller Page
export const SellerPage = ({ slug }) => {
  const { navigate } = useApp();
  const [seller, setSeller]   = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([sellersApi.get(slug), sellersApi.products(slug)])
      .then(([s, ps]) => { setSeller(s); setProducts(ps); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;
  if (!seller) return <div className="p-12 text-center">Vendeur introuvable</div>;

  return (
    <div>
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white py-12">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-6">
          <div className="w-28 h-28 rounded-full flex items-center justify-center text-6xl shadow-2xl bg-white text-5xl">
            {seller.logo}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold flex items-center gap-3 text-shadow">{seller.name}
              {seller.verified && (
                <span className="bg-blue-300 text-blue-900 text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Icon name="check" size={14} />Vérifié
                </span>
              )}
            </h1>
            <div className="flex items-center gap-4 mt-2 opacity-90">
              <Stars rating={seller.rating} size={16} />
              <span className="font-semibold">{seller.rating}/5</span>
              <span>·</span>
              <span>{seller.reviewsCount?.toLocaleString('fr-FR')} avis</span>
              <span>·</span>
              <span>Répond {seller.responseTime}</span>
            </div>
            <div className="text-sm opacity-80 mt-1">📍 {seller.location} · Membre depuis {seller.joinedYear}</div>
          </div>
          <button className="px-6 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">
            Suivre
          </button>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[{ l:'Produits', v:products.length }, { l:'Avis', v:seller.reviewsCount?.toLocaleString('fr-FR') }, { l:'Note', v:`${seller.rating}/5` }].map(s => (
            <div key={s.l} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-extrabold text-blue-600">{s.v}</div>
              <div className="text-xs text-gray-500">{s.l}</div>
            </div>
          ))}
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Tous les produits ({products.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
};

// ── Search Results Page
export const SearchPage = ({ query }) => {
  const { navigate } = useApp();
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const q = query || '';

  useEffect(() => {
    setLoading(true);
    productsApi.list({ search: q, limit: 40 })
      .then(r => { setProducts(r.products); setTotal(r.total); setLoading(false); });
  }, [q]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="text-sm text-gray-500 mb-2">
        <span onClick={() => navigate('home')} className="cursor-pointer hover:text-blue-600">Accueil</span>
        <span className="mx-2">/</span>Résultats de recherche
      </div>
      <h1 className="text-2xl font-extrabold text-slate-800 mb-1">
        {q ? `Résultats pour "${q}"` : 'Tous les produits'}
      </h1>
      <div className="text-gray-500 mb-6">{total} produits trouvés</div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_,i) => <SkeletonCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-xl font-bold text-slate-800">Aucun résultat pour "{q}"</div>
          <div className="text-gray-500 mt-2">Essayez un autre terme de recherche</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};

// ── Account Page
export const AccountPage = () => {
  const { user, logout, navigate } = useApp();
  if (!user) return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <h2 className="text-xl font-bold mb-4">Connectez-vous pour accéder à votre compte</h2>
    </div>
  );
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-4">Mon Compte</h1>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-2xl">
            {user.name?.[0] || 'U'}
          </div>
          <div>
            <div className="font-bold text-xl">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { l:'Mes commandes', p:'orders' },
            { l:'Mes favoris', p:'wishlist' },
            { l:'Adresses', p:'account' },
            { l:'Centre d\'aide', p:'account' },
          ].map(o => (
            <button key={o.l} onClick={() => navigate(o.p)}
              className="px-4 py-3 bg-blue-50 rounded-xl text-sm font-semibold text-slate-700 hover:bg-blue-100 text-left">
              {o.l} →
            </button>
          ))}
        </div>
        <button onClick={logout} className="mt-6 px-6 py-2 border border-red-300 text-red-500 rounded-full font-bold hover:bg-red-50">
          Déconnexion
        </button>
      </div>
    </div>
  );
};

// ── Orders Page
export const OrdersPage = () => {
  const { navigate } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const STATUS_LABELS = {
    EN_ATTENTE:'En attente', CONFIRMEE:'Confirmée', EN_PREPARATION:'En préparation',
    EXPEDIEE:'Expédiée', LIVREE:'Livrée', ANNULEE:'Annulée',
  };
  const STATUS_COLORS = {
    EN_ATTENTE:'bg-yellow-100 text-yellow-700', CONFIRMEE:'bg-blue-100 text-blue-700',
    EN_PREPARATION:'bg-purple-100 text-purple-700', EXPEDIEE:'bg-indigo-100 text-indigo-700',
    LIVREE:'bg-green-100 text-green-700', ANNULEE:'bg-red-100 text-red-700',
  };

  useEffect(() => {
    ordersApi.list().then(o => { setOrders(o); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
        <Icon name="package" size={24} className="text-blue-600" />Mes Commandes
      </h1>
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-3">📦</div>
          <div className="text-lg font-bold mb-1">Aucune commande</div>
          <div className="text-sm text-gray-500 mb-4">Passez votre première commande !</div>
          <button onClick={() => navigate('home')} className="px-6 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">
            Découvrir
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-800">Commande #{String(o.id).padStart(6,'0')}</div>
                  <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'})}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[o.status] || o.status}
                </span>
              </div>
              <div className="text-sm text-slate-700 mb-2">{o.items?.length} article(s)</div>
              <div className="font-bold text-blue-600 text-lg">{fmt(o.total)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
