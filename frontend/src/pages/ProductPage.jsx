import { useState, useEffect } from 'react';
import { productsApi } from '../api/client';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { fmt, Stars, Badge, Spinner } from '../components/ui';
import Icon from '../components/Icon';

const ProductPage = ({ id }) => {
  const { addToCart, wishlist, toggleWishlist, navigate, addToRecently, user, toast } = useApp();
  const [product, setProduct]   = useState(null);
  const [similar, setSimilar]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selImg, setSelImg]     = useState(0);
  const [variant, setVariant]   = useState({});
  const [qty, setQty]           = useState(1);
  const [tab, setTab]           = useState('description');
  const [reviewForm, setReviewForm] = useState({ rating:5, comment:'' });

  useEffect(() => {
    setLoading(true);
    productsApi.get(id).then(p => {
      setProduct(p);
      addToRecently(p.id);
      setLoading(false);
      if (p.category) {
        productsApi.list({ category: p.category.slug, limit: 8 })
          .then(r => setSimilar(r.products.filter(x => x.id !== p.id)));
      }
    }).catch(() => setLoading(false));
  }, [id]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { toast('Connectez-vous pour laisser un avis', 'error'); return; }
    await productsApi.review(id, reviewForm);
    const p = await productsApi.get(id);
    setProduct(p);
    toast('Avis publié !');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24"><Spinner size={40} /></div>
  );
  if (!product) return <div className="p-12 text-center text-gray-500">Produit introuvable</div>;

  const isWish = wishlist.includes(product.id);
  const seller = product.seller;
  const img = product.images?.[selImg] || '📦';
  const variants = product.variants || {};

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <span onClick={() => navigate('home')} className="cursor-pointer hover:text-blue-600">Accueil</span>
        <span className="mx-2">/</span>
        <span onClick={() => navigate('category', { slug: product.category?.slug })} className="cursor-pointer hover:text-blue-600">
          {product.category?.name}
        </span>
        <span className="mx-2">/</span>
        <span className="text-slate-700 truncate max-w-xs inline-block align-bottom">{product.title}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Gallery */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-2">
            {(product.images?.length > 1 ? product.images : [product.images?.[0]||'📦','📦','📦']).slice(0,4).map((im,i) => (
              <button key={i} onClick={() => setSelImg(i)}
                className={`w-16 h-16 rounded-lg border-2 ${selImg===i?'border-blue-500':'border-gray-200'} bg-blue-50 flex items-center justify-center text-2xl`}>
                {im}
              </button>
            ))}
          </div>
          <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl aspect-square flex items-center justify-center text-[180px] relative overflow-hidden">
            {product.discount > 0 && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full z-10">
                -{product.discount}%
              </span>
            )}
            <span className="hover:scale-110 transition-transform">{img}</span>
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge color="primary">{product.brand}</Badge>
            {product.tags?.includes('bestseller') && <Badge color="orange">⭐ Bestseller</Badge>}
            {product.tags?.includes('new') && <Badge color="green">Nouveau</Badge>}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">{product.title}</h1>

          <div className="flex items-center gap-3 mb-4">
            <Stars rating={product.rating} size={16} />
            <span className="text-sm font-semibold">{product.rating}</span>
            <span onClick={() => setTab('reviews')} className="text-sm text-blue-600 cursor-pointer hover:underline">
              ({product.reviewsCount} avis)
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">{product.soldCount?.toLocaleString('fr-FR')} vendus</span>
          </div>

          {/* Price */}
          <div className="bg-blue-50 rounded-2xl p-5 mb-4">
            <div className="flex items-baseline gap-3">
              <span className="price-text text-4xl text-blue-600">{fmt(product.price)}</span>
              {product.discount > 0 && (
                <>
                  <span className="text-lg text-gray-400 line-through">{fmt(product.originalPrice)}</span>
                  <Badge color="red">-{product.discount}%</Badge>
                </>
              )}
            </div>
            {product.discount > 0 && (
              <div className="text-sm text-green-700 font-semibold mt-1">
                Vous économisez {fmt(product.originalPrice - product.price)}
              </div>
            )}
          </div>

          {/* Seller */}
          {seller && (
            <div onClick={() => navigate('seller', { slug: seller.slug })}
              className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex items-center gap-3 cursor-pointer hover:border-blue-400 transition">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow" style={{ background: seller.color }}>
                <span className="text-white">{seller.logo}</span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  {seller.name}
                  {seller.verified && <Icon name="check" size={13} className="text-blue-500 bg-blue-100 rounded-full p-0.5" />}
                </div>
                <div className="text-xs text-gray-500">{seller.rating}/5 · 98% avis positifs</div>
              </div>
              <span className="text-blue-600 text-sm font-semibold">Voir boutique →</span>
            </div>
          )}

          {/* Variants */}
          {variants.couleurs && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Couleur: <span className="font-normal text-gray-600">{variant.couleur || 'Choisir'}</span></div>
              <div className="flex flex-wrap gap-2">
                {variants.couleurs.map(c => (
                  <button key={c} onClick={() => setVariant({ ...variant, couleur: c })}
                    className={`px-3 py-1.5 rounded-full text-sm border ${variant.couleur===c?'bg-blue-600 text-white border-blue-600':'border-gray-300 hover:border-blue-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          {variants.tailles && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Taille: <span className="font-normal text-gray-600">{variant.taille || 'Choisir'}</span></div>
              <div className="flex flex-wrap gap-2">
                {variants.tailles.map(s => (
                  <button key={s} onClick={() => setVariant({ ...variant, taille: s })}
                    className={`min-w-[44px] px-3 py-1.5 rounded-lg text-sm border ${variant.taille===s?'bg-blue-600 text-white border-blue-600':'border-gray-300 hover:border-blue-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {variants.stockage && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Stockage</div>
              <div className="flex flex-wrap gap-2">
                {variants.stockage.map(s => (
                  <button key={s} onClick={() => setVariant({ ...variant, stockage: s })}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${variant.stockage===s?'bg-blue-600 text-white border-blue-600':'border-gray-300 hover:border-blue-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Quantité:</span>
            <div className="flex items-center border border-gray-300 rounded-full overflow-hidden">
              <button onClick={() => setQty(Math.max(1,qty-1))} className="w-9 h-9 hover:bg-gray-100 flex items-center justify-center">
                <Icon name="minus" size={14} />
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(Math.min(product.stock,qty+1))} className="w-9 h-9 hover:bg-gray-100 flex items-center justify-center">
                <Icon name="plus" size={14} />
              </button>
            </div>
            <span className={`text-xs font-semibold ${product.lowStock?'text-orange-600':'text-green-600'}`}>
              {product.lowStock ? `Plus que ${product.stock} !` : `${product.stock} en stock`}
            </span>
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => addToCart(product, { qty, variant })}
              className="py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2">
              <Icon name="cart" size={18} />Ajouter au panier
            </button>
            <button onClick={() => { addToCart(product, { qty, variant }); navigate('checkout'); }}
              className="py-3 rounded-full bg-[#0A1F44] text-white font-bold hover:bg-blue-900 transition flex items-center justify-center gap-2">
              <Icon name="zap" size={18} />Acheter maintenant
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => toggleWishlist(product.id)}
              className={`flex-1 py-2 rounded-full border border-gray-300 hover:border-blue-400 text-sm font-semibold flex items-center justify-center gap-2 ${isWish?'text-red-500 border-red-300':''}`}>
              <Icon name="heart" size={16} className={isWish?'fill-current':''} />
              {isWish ? 'Dans mes favoris' : 'Favoris'}
            </button>
            <button className="flex-1 py-2 rounded-full border border-gray-300 text-sm font-semibold flex items-center justify-center gap-2">
              <Icon name="share" size={16} />Partager
            </button>
          </div>

          {/* Delivery */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 text-sm mb-4">
            <div className="flex items-center gap-2"><Icon name="truck" size={18} className="text-blue-600" /><span><b>Livraison Express</b> — Demain avant 22h</span></div>
            <div className="flex items-center gap-2"><Icon name="pin" size={18} className="text-blue-600" /><span>Livrer à <b>Tunis</b></span></div>
            <div className="flex items-center gap-2"><Icon name="package" size={18} className="text-blue-600" /><span>Paiement à la livraison disponible</span></div>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { i:'shield',  t:`Garantie ${product.warranty}` },
              { i:'refresh', t:product.returnPolicy },
              { i:'award',   t:'Produit Authentique' },
            ].map(g => (
              <div key={g.t} className="bg-blue-50 rounded-xl p-3 text-center">
                <Icon name={g.i} size={20} className="text-blue-600 mx-auto mb-1" />
                <div className="text-xs font-bold text-slate-700">{g.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-10">
        <div className="flex border-b overflow-x-auto scrollbar-hide">
          {[['description','Description'],['specifications','Spécifications'],['reviews','Avis'],['shipping','Livraison']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition ${tab===k?'border-blue-600 text-blue-600':'border-transparent text-slate-600 hover:text-blue-600'}`}>
              {l} {k==='reviews' && `(${product.reviewsCount})`}
            </button>
          ))}
        </div>
        <div className="p-6 text-sm text-slate-700 leading-relaxed">
          {tab === 'description' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">À propos de ce produit</h3>
              <p className="mb-3">{product.description}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Qualité premium avec matériaux haut de gamme</li>
                <li>Conçu pour un usage quotidien et une durabilité longue</li>
                <li>Garanti {product.warranty} par le fabricant</li>
                <li>Retour facile sous {product.returnPolicy}</li>
              </ul>
            </div>
          )}
          {tab === 'specifications' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Caractéristiques techniques</h3>
              <table className="w-full">
                <tbody>
                  {Object.entries(product.specifications || {}).map(([k,v]) => (
                    <tr key={k} className="border-b last:border-0">
                      <td className="py-2.5 font-semibold text-slate-700 w-1/3">{k}</td>
                      <td className="py-2.5 text-slate-600">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'reviews' && (
            <div>
              <div className="flex gap-8 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-extrabold text-blue-600">{product.rating?.toFixed(1)}</div>
                  <Stars rating={product.rating} size={16} />
                  <div className="text-xs text-gray-500 mt-1">{product.reviewsCount} avis</div>
                </div>
                <div className="flex-1 space-y-1">
                  {[5,4,3,2,1].map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs">
                      <span>{s}⭐</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-yellow-400 h-full" style={{ width: `${[70,20,5,3,2][5-s]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews list */}
              <div className="space-y-4 mb-6">
                {product.reviews?.length === 0 && <div className="text-gray-500">Aucun avis pour le moment.</div>}
                {product.reviews?.map(r => (
                  <div key={r.id} className="border-b last:border-0 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm">
                        {r.user?.name?.[0] || '?'}
                      </div>
                      <div className="font-semibold text-slate-800 text-sm">{r.user?.name}</div>
                      <Stars rating={r.rating} size={12} />
                    </div>
                    <p className="text-sm text-slate-600">{r.comment}</p>
                  </div>
                ))}
              </div>

              {/* Review form */}
              <form onSubmit={submitReview} className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 mb-3">Laisser un avis</h4>
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(s => (
                    <button type="button" key={s} onClick={() => setReviewForm(f=>({...f,rating:s}))}>
                      <span className={`text-2xl ${s<=reviewForm.rating?'text-yellow-400':'text-gray-300'}`}>⭐</span>
                    </button>
                  ))}
                </div>
                <textarea value={reviewForm.comment} onChange={e => setReviewForm(f=>({...f,comment:e.target.value}))}
                  placeholder="Votre avis..." required rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-400 text-sm resize-none mb-2" />
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700">Publier</button>
              </form>
            </div>
          )}
          {tab === 'shipping' && (
            <div className="space-y-3">
              <p><b>Livraison:</b> Express sous 24h sur les commandes > 200 DT. Standard 1-3 jours ouvrables.</p>
              <p><b>Retours:</b> {product.returnPolicy} à compter de la réception. Produit en état d'origine requis.</p>
              <p><b>Paiement:</b> Carte bancaire, D17, CIB, Virement, Paiement à la livraison (COD).</p>
              <p><b>Garantie:</b> {product.warranty} fabricant. Échange immédiat si produit défectueux.</p>
            </div>
          )}
        </div>
      </div>

      {/* Similar Products */}
      {similar.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Produits similaires</h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {similar.map(p => <div key={p.id} className="shrink-0 w-56"><ProductCard product={p} /></div>)}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductPage;
