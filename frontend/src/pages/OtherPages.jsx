import { useState, useEffect, useRef } from 'react';
import { productsApi, sellersApi, ordersApi, messagesApi, returnsApi } from '../api/client';
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
            { l:'Mes messages', p:'messages' },
            { l:'Adresses', p:'account' },
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
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [returning, setReturning] = useState(null);
  const [returnForm, setReturnForm] = useState({ reason: '', description: '' });
  const [retLoading, setRetLoading] = useState(false);
  const [retSuccess, setRetSuccess] = useState('');
  const [retError, setRetError]     = useState('');

  const STATUS_LABELS = {
    EN_ATTENTE:'En attente', CONFIRMEE:'Confirmée', EN_PREPARATION:'En préparation',
    EXPEDIEE:'Expédiée', LIVREE:'Livrée', ANNULEE:'Annulée',
    RETOUR_DEMANDE:'Retour demandé',
  };
  const STATUS_COLORS = {
    EN_ATTENTE:'bg-yellow-100 text-yellow-700 border-yellow-200',
    CONFIRMEE:'bg-blue-100 text-blue-700 border-blue-200',
    EN_PREPARATION:'bg-purple-100 text-purple-700 border-purple-200',
    EXPEDIEE:'bg-indigo-100 text-indigo-700 border-indigo-200',
    LIVREE:'bg-green-100 text-green-700 border-green-200',
    ANNULEE:'bg-red-100 text-red-700 border-red-200',
    RETOUR_DEMANDE:'bg-orange-100 text-orange-700 border-orange-200',
  };
  const STATUS_ICONS = {
    EN_ATTENTE:'⏳', CONFIRMEE:'✅', EN_PREPARATION:'🔧',
    EXPEDIEE:'🚚', LIVREE:'📦', ANNULEE:'❌',
  };

  const RETURN_REASONS = [
    'Produit défectueux','Produit non conforme','Produit endommagé',
    'Mauvaise taille/couleur','Produit non reçu','Changement d\'avis','Autre',
  ];

  useEffect(() => {
    ordersApi.list()
      .then(o => { setOrders(o); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const submitReturn = async () => {
    if (!returnForm.reason) return setRetError('Veuillez choisir une raison');
    setRetLoading(true); setRetError('');
    try {
      await returnsApi.create({ orderId: returning.id, reason: returnForm.reason, description: returnForm.description });
      setRetSuccess('Demande de retour envoyée ✓');
      setOrders(os => os.map(o => o.id === returning.id ? { ...o, returnRequest: { status:'PENDING' } } : o));
      setTimeout(() => { setReturning(null); setRetSuccess(''); }, 2000);
    } catch (e) { setRetError(e.message); }
    setRetLoading(false);
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
        <Icon name="package" size={24} className="text-blue-600" />Mes Commandes
        <span className="ml-auto text-sm font-normal text-gray-400">{orders.length} commande(s)</span>
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
          {orders.map(o => {
            const addr = typeof o.shippingAddress === 'object' ? o.shippingAddress : {};
            const canReturn = o.status === 'LIVREE' && !o.returnRequest;
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <span className="font-bold text-slate-800">#{String(o.id).padStart(6,'0')}</span>
                    <span className="text-gray-400 text-xs ml-3">
                      {new Date(o.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="px-5 py-3">
                  <div className="flex gap-2 mb-3">
                    {(o.items || []).slice(0,4).map(item => (
                      <div key={item.id} className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        {(() => { try { const imgs = JSON.parse(item.product?.images||'[]'); return imgs[0]||'📦'; } catch { return item.product?.images||'📦'; } })()}
                      </div>
                    ))}
                    {(o.items?.length || 0) > 4 && (
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xs font-bold text-gray-500">
                        +{o.items.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500">{o.items?.length} article(s)</span>
                      {o.trackingNumber && (
                        <div className="text-xs text-blue-600 font-medium mt-0.5">
                          📍 Suivi: <span className="font-mono">{o.trackingNumber}</span>
                        </div>
                      )}
                      {o.returnRequest && (
                        <div className="text-xs mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full ${
                            o.returnRequest.status==='APPROVED' ? 'bg-green-100 text-green-700' :
                            o.returnRequest.status==='REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            Retour: {o.returnRequest.status==='APPROVED'?'Approuvé':o.returnRequest.status==='REJECTED'?'Refusé':'En attente'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600 text-lg">{fmt(o.total)}</div>
                    </div>
                  </div>
                </div>

                {/* Tracking timeline */}
                {o.events && o.events.length > 0 && (
                  <div className="px-5 pb-3">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {['EN_ATTENTE','CONFIRMEE','EN_PREPARATION','EXPEDIEE','LIVREE'].map((s, i, arr) => {
                        const eventStatuses = o.events.map(e => e.status);
                        const reached = eventStatuses.includes(s) || o.status === s ||
                          arr.indexOf(o.status) > i;
                        const current = o.status === s;
                        return (
                          <div key={s} className="flex items-center flex-shrink-0">
                            <div className={`flex flex-col items-center`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                                current ? 'bg-blue-600 text-white shadow-md shadow-blue-200' :
                                reached ? 'bg-green-500 text-white' :
                                'bg-gray-100 text-gray-400'
                              }`}>
                                {STATUS_ICONS[s]}
                              </div>
                              <span className={`text-xs mt-1 whitespace-nowrap ${reached ? 'text-slate-600' : 'text-gray-400'}`}>
                                {STATUS_LABELS[s]}
                              </span>
                            </div>
                            {i < arr.length - 1 && (
                              <div className={`w-8 h-0.5 mx-1 flex-shrink-0 mb-4 ${
                                arr.indexOf(o.status) > i ? 'bg-green-400' : 'bg-gray-200'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 pb-4 flex gap-2">
                  <button onClick={() => setSelected(o)}
                    className="flex-1 py-2 border border-blue-200 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-50 transition-colors">
                    Voir détails
                  </button>
                  {canReturn && (
                    <button onClick={() => { setReturning(o); setReturnForm({ reason:'', description:'' }); setRetError(''); }}
                      className="px-4 py-2 border border-orange-200 text-orange-600 rounded-full text-xs font-bold hover:bg-orange-50 transition-colors">
                      Retourner
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-lg">Commande #{String(selected.id).padStart(6,'0')}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[selected.status]||'bg-gray-100'}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Articles */}
              <div>
                <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Articles</div>
                <div className="space-y-2">
                  {(selected.items || []).map(item => {
                    let img = '📦';
                    try { const imgs = JSON.parse(item.product?.images||'[]'); img = imgs[0]||'📦'; } catch {}
                    return (
                      <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">{img}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-800 truncate">{item.product?.title}</div>
                          {item.product?.seller && <div className="text-xs text-gray-400">{item.product.seller.name}</div>}
                          <div className="text-xs text-gray-500">Qté: {item.qty} × {fmt(item.price)}</div>
                        </div>
                        <div className="font-bold text-blue-600">{fmt(item.qty * item.price)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600"><span>Sous-total</span><span>{fmt(selected.subtotal)}</span></div>
                {selected.discount > 0 && <div className="flex justify-between text-green-600"><span>Réduction</span><span>-{fmt(selected.discount)}</span></div>}
                <div className="flex justify-between text-gray-600"><span>Livraison</span><span>{selected.shippingCost === 0 ? 'Gratuit' : fmt(selected.shippingCost)}</span></div>
                <div className="flex justify-between text-gray-600"><span>TVA (19%)</span><span>{fmt(selected.vat)}</span></div>
                <div className="flex justify-between font-bold text-slate-800 text-base pt-1 border-t"><span>Total</span><span className="text-blue-600">{fmt(selected.total)}</span></div>
              </div>

              {/* Adresse */}
              {selected.shippingAddress?.name && (
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Adresse de livraison</div>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                    <div className="font-medium">{selected.shippingAddress.name}</div>
                    <div>{selected.shippingAddress.building}, {selected.shippingAddress.street}</div>
                    <div>{selected.shippingAddress.area}, {selected.shippingAddress.governorate}</div>
                    <div className="text-blue-600">{selected.shippingAddress.phone}</div>
                  </div>
                </div>
              )}

              {/* Tracking number */}
              {selected.trackingNumber && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-xs font-bold text-blue-700 mb-1">NUMÉRO DE SUIVI</div>
                  <div className="font-mono font-bold text-blue-800">{selected.trackingNumber}</div>
                </div>
              )}

              {/* Timeline */}
              {selected.events && selected.events.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-3 uppercase">Historique</div>
                  <div className="space-y-2">
                    {selected.events.map((ev, i) => (
                      <div key={ev.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mt-0.5 flex-shrink-0" />
                          {i < selected.events.length - 1 && <div className="w-0.5 bg-blue-200 flex-1 my-1" />}
                        </div>
                        <div className="pb-2">
                          <div className="text-sm font-medium text-slate-700">{STATUS_LABELS[ev.status] || ev.status}</div>
                          {ev.note && <div className="text-xs text-gray-500">{ev.note}</div>}
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(ev.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setReturning(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">Demande de retour</h3>
              <button onClick={() => setReturning(null)} className="text-gray-400 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-5 space-y-4">
              {retSuccess ? (
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">✅</div>
                  <div className="font-bold text-green-700">{retSuccess}</div>
                  <div className="text-sm text-gray-500 mt-1">Le vendeur vous contactera sous 24–48h</div>
                </div>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                    ⚠️ Retour gratuit sous 14 jours après réception. Commande #{String(returning.id).padStart(6,'0')}
                  </div>
                  {retError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">{retError}</div>}
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-2">RAISON DU RETOUR *</label>
                    <select value={returnForm.reason} onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-400">
                      <option value="">Sélectionner une raison</option>
                      {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-2">DESCRIPTION (OPTIONNEL)</label>
                    <textarea value={returnForm.description} onChange={e => setReturnForm(f => ({ ...f, description: e.target.value }))}
                      rows={3} placeholder="Décrivez le problème en détail..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none"
                    />
                  </div>
                  <button onClick={submitReturn} disabled={retLoading || !returnForm.reason}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-full font-bold transition-colors">
                    {retLoading ? 'Envoi...' : 'Soumettre la demande de retour'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">Vous serez remboursé après approbation du vendeur</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Messages Page (client)
export const MessagesPage = () => {
  const { user, navigate } = useApp();
  const [convs, setConvs]       = useState([]);
  const [active, setActive]     = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    messagesApi.list()
      .then(setConvs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const openConv = async (conv) => {
    setActive(conv);
    try {
      const d = await messagesApi.getConv(conv.id);
      setMessages(d.messages || []);
      setConvs(cs => cs.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
    } catch {}
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !active || sending) return;
    setSending(true);
    try {
      const msg = await messagesApi.send(active.id, text.trim());
      setMessages(ms => [...ms, msg]);
      setText('');
    } catch {}
    setSending(false);
  };

  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
  const fmtTime = d => new Date(d).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

  if (!user) return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <div className="text-5xl mb-4">💬</div>
      <h2 className="text-xl font-bold mb-2">Connectez-vous</h2>
      <p className="text-gray-500 text-sm">Vous devez être connecté pour accéder à vos messages</p>
    </div>
  );

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-4">💬 Mes Messages</h1>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ height: '70vh' }}>
        <div className="flex h-full">
          {/* Conversations list */}
          <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-100">
              <div className="text-sm font-bold text-slate-700">Conversations</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-gray-400 text-sm text-center py-8">Chargement...</div>
              ) : convs.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-8 px-4">
                  Aucun message.<br/>Contactez un vendeur depuis la page produit.
                </div>
              ) : convs.map(c => (
                <button key={c.id} onClick={() => openConv(c)}
                  className={`w-full flex items-start gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${active?.id === c.id ? 'bg-blue-50' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0 text-lg">
                    {c.seller?.logo || '🏪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-800 truncate">{c.seller?.name}</span>
                      {c.lastMessage && <span className="text-gray-400 text-xs flex-shrink-0">{fmtDate(c.lastMessage.createdAt)}</span>}
                    </div>
                    <div className="text-gray-500 text-xs truncate mt-0.5">
                      {c.lastMessage?.content || c.subject || 'Nouvelle conversation'}
                    </div>
                    {c.unread > 0 && (
                      <span className="mt-1 inline-block bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">{c.unread}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          {active ? (
            <div className="flex-1 flex flex-col">
              <div className="h-14 border-b border-gray-100 flex items-center px-5 gap-3 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                  {active.seller?.logo || '🏪'}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-800">{active.seller?.name}</div>
                </div>
                <button onClick={() => navigate('seller', { slug: active.seller?.slug })}
                  className="ml-auto text-xs text-blue-600 hover:underline">Voir boutique →</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map(m => {
                  const isMe = m.senderType === 'CLIENT';
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-sm rounded-2xl px-4 py-2.5 ${
                        isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm shadow-sm'
                      }`}>
                        <p className="text-sm">{m.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{fmtTime(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Écrire un message..."
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400"
                />
                <button onClick={send} disabled={!text.trim() || sending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                  Envoyer
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-5xl mb-3">💬</div>
                <div className="font-medium">Sélectionnez une conversation</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
