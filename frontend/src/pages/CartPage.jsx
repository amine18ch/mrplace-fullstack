import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { fmt } from '../components/ui';
import Icon from '../components/Icon';

const CartPage = () => {
  const { cart, updateCartQty, removeFromCart, navigate, promoCode, setPromoCode, applyPromo } = useApp();
  const [promoInput, setPromoInput] = useState('');
  const [flashPrices, setFlashPrices] = useState({}); // { productId: { discountPct, saleName, endAt } }
  const [flashSale, setFlashSale]     = useState(null);

  // Vérifier les prix flash pour les produits du panier
  useEffect(() => {
    if (!cart.length) return;
    const ids = cart.map(it => it.productId);
    api.post('/flash-sales/check-prices', { productIds: ids }, false)
      .then(({ sale, prices }) => {
        setFlashSale(sale);
        setFlashPrices(prices || {});
      })
      .catch(() => {});
  }, [cart.length]);

  // Calculer le prix effectif d'un article (flash ou normal)
  const effectivePrice = (it) => {
    const fp = flashPrices[it.productId];
    if (!fp) return it.product.price;
    return parseFloat((it.product.price * (1 - fp.discountPct / 100)).toFixed(3));
  };

  const grouped = cart.reduce((acc, it) => {
    const sid = it.product.sellerId;
    if (!acc[sid]) acc[sid] = { seller: it.product.seller, items: [] };
    acc[sid].items.push(it);
    return acc;
  }, {});

  const subtotal = cart.reduce((s, it) => s + effectivePrice(it) * it.qty, 0);
  const flashSaving = cart.reduce((s, it) => {
    const fp = flashPrices[it.productId];
    if (!fp) return s;
    return s + (it.product.price - effectivePrice(it)) * it.qty;
  }, 0);
  const discount = promoCode ? subtotal * promoCode.discount : 0;
  const shipping  = (subtotal - discount) >= 200 ? 0 : 25;
  const vat       = (subtotal - discount) * 0.19;
  const total     = subtotal - discount + shipping + vat;

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-12">
          <div className="text-8xl mb-4">🛒</div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Votre panier est vide</h2>
          <p className="text-gray-500 mb-6">Commencez votre shopping et ajoutez des produits !</p>
          <button onClick={() => navigate('home')} className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">
            Continuer mes achats
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-4">
        Mon Panier ({cart.reduce((s,it)=>s+it.qty,0)} articles)
      </h1>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {Object.values(grouped).map(g => (
            <div key={g.seller?.id || 'default'} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 p-3 flex items-center gap-2 border-b">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: g.seller?.color || '#2563EB' }}>
                  {g.seller?.logo || '🏪'}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                    {g.seller?.name || 'Vendeur'}
                    {g.seller?.verified && <Icon name="check" size={12} className="text-blue-500" />}
                  </div>
                  <div className="text-xs text-gray-500">🚚 Livraison gratuite dès 200 DT</div>
                </div>
              </div>
              <div className="divide-y">
                {g.items.map(it => (
                  <div key={it.id} className="p-4 flex gap-4">
                    <div onClick={() => navigate('product', { id: it.productId })}
                      className="w-20 h-20 bg-blue-50 rounded-xl flex items-center justify-center text-4xl cursor-pointer shrink-0">
                      {it.product.images?.[0] || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div onClick={() => navigate('product', { id: it.productId })}
                        className="font-medium text-slate-800 line-clamp-2 cursor-pointer hover:text-blue-600">
                        {it.product.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{it.product.brand}</div>
                      <div className="text-xs text-green-600 font-semibold mt-1">✓ En stock</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-gray-300 rounded-full">
                            <button onClick={() => updateCartQty(it.productId, it.qty - 1)} className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center">
                              <Icon name="minus" size={12} />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold">{it.qty}</span>
                            <button onClick={() => updateCartQty(it.productId, it.qty + 1)} className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center">
                              <Icon name="plus" size={12} />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(it.productId)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition">
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                        <div className="text-right">
                          {flashPrices[it.productId] ? (
                            <>
                              <div className="text-xs text-red-500 font-bold flex items-center justify-end gap-1">
                                ⚡ -{flashPrices[it.productId].discountPct}% FLASH
                              </div>
                              <div className="text-xs text-gray-400 line-through">{fmt(it.product.price)} / unité</div>
                              <div className="font-bold text-red-500">{fmt(effectivePrice(it))} / unité</div>
                              <div className="font-bold text-blue-600">{fmt(effectivePrice(it) * it.qty)}</div>
                            </>
                          ) : (
                            <>
                              <div className="text-xs text-gray-500">{fmt(it.product.price)} / unité</div>
                              <div className="font-bold text-blue-600">{fmt(it.product.price * it.qty)}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24">
            <h3 className="font-bold text-slate-800 mb-4">Récapitulatif</h3>
            {/* Bannière vente flash active */}
            {flashSale && Object.keys(flashPrices).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <div className="text-red-700 font-bold text-xs">{flashSale.name}</div>
                  <div className="text-red-600 text-xs">-{flashSale.discountPct}% sur {Object.keys(flashPrices).length} article(s)</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-green-700 font-bold text-sm">Éco. {fmt(flashSaving)}</div>
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-gray-600">Sous-total</span><span className="font-semibold">{fmt(subtotal)}</span></div>
              {flashSaving > 0 && <div className="flex justify-between text-red-600 font-semibold"><span>⚡ Réduction flash</span><span>-{fmt(flashSaving)}</span></div>}
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Remise ({promoCode.code})</span><span>-{fmt(discount)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-600">Livraison</span>
                <span className={`font-semibold ${shipping===0?'text-green-600':''}`}>{shipping === 0 ? 'GRATUITE' : fmt(shipping)}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-600">TVA (19%)</span><span className="font-semibold">{fmt(vat)}</span></div>
            </div>
            <div className="border-t pt-3 mb-4 flex justify-between items-baseline">
              <span className="font-bold text-slate-800">Total</span>
              <span className="text-2xl font-extrabold text-blue-600">{fmt(total)}</span>
            </div>

            {/* Promo */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Code promo</div>
              {promoCode ? (
                <div className="flex items-center gap-2 bg-green-50 rounded-full px-4 py-2">
                  <Icon name="check" size={14} className="text-green-600" />
                  <span className="text-sm font-bold text-green-700 flex-1">{promoCode.code}</span>
                  <button onClick={() => setPromoCode(null)} className="text-red-500"><Icon name="x" size={14} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={promoInput} onChange={e => setPromoInput(e.target.value)}
                    placeholder="Ex: SAVE10, FIRST20"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full outline-none focus:border-blue-400" />
                  <button onClick={async () => { const ok = await applyPromo(promoInput); if(ok) setPromoInput(''); }}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold hover:bg-blue-200">
                    Appliquer
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => navigate('checkout')}
              className="w-full py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2">
              Passer commande <Icon name="chevR" size={16} />
            </button>

            <div className="flex justify-center gap-2 mt-4">
              {['VISA','MC','D17','CIB','Espèces'].map(p => (
                <span key={p} className="bg-gray-100 px-2 py-1 rounded text-[10px] font-bold text-gray-600">{p}</span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
              <Icon name="shield" size={14} className="text-blue-600" /> Paiement sécurisé 256-bit SSL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
