import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ordersApi } from '../api/client';
import { fmt } from '../components/ui';
import Icon from '../components/Icon';

const GOVERNORATES = ['Tunis','Sfax','Sousse','Nabeul','Bizerte','Ariana','Ben Arous','Monastir','Gabès','Kairouan','Gafsa','Médenine','Kasserine','Sidi Bouzid','Kef','Siliana','Beja','Jendouba','Zaghouan','Tozeur','Kébili','Mahdia','Manouba'];

const CheckoutPage = () => {
  const { cart, clearCart, navigate, user, promoCode, toast } = useApp();
  const [step, setStep]     = useState(1);
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [address, setAddress] = useState({
    name: user?.name || '', phone: '', governorate: 'Tunis',
    area: '', building: '', street: '', notes: '',
  });
  const [payment, setPayment] = useState('card');

  const items = cart.map(it => ({ ...it }));
  const subtotal  = items.reduce((s,it) => s + it.product.price * it.qty, 0);
  const discount  = promoCode ? subtotal * promoCode.discount : 0;
  const shipping  = (subtotal-discount) >= 200 ? 0 : 25;
  const vat       = (subtotal-discount) * 0.19;
  const total     = subtotal - discount + shipping + vat;

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const order = await ordersApi.create({
        shippingAddress: address,
        paymentMethod: payment,
        promoCode: promoCode?.code,
        items: items.map(it => ({ productId: it.productId, qty: it.qty, variant: it.variant })),
      });
      setOrderId(order.id);
      setStep(4);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (step === 4) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
            <Icon name="check" size={40} strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Commande confirmée !</h2>
          <p className="text-gray-500 mb-6">Merci pour votre achat. Votre commande a bien été enregistrée.</p>
          <div className="bg-blue-50 rounded-xl p-4 mb-6 inline-block">
            <div className="text-xs text-gray-500">Numéro de commande</div>
            <div className="text-2xl font-bold text-blue-600">#{String(orderId).padStart(6,'0')}</div>
          </div>
          <div className="text-sm text-slate-700 mb-6 space-y-1">
            <div className="flex items-center justify-center gap-2"><Icon name="truck" size={16} className="text-blue-600" /><b>Demain avant 22h</b></div>
            <div className="flex items-center justify-center gap-2"><Icon name="pin" size={16} className="text-blue-600" />{address.area}, {address.governorate}</div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('home')} className="px-6 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">Continuer mes achats</button>
            <button onClick={() => navigate('orders')} className="px-6 py-3 rounded-full border border-blue-600 text-blue-600 font-bold hover:bg-blue-50">Mes commandes</button>
          </div>
        </div>
      </div>
    );
  }

  const StepDot = ({ n, label }) => (
    <div className="flex items-center gap-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step>=n?'bg-blue-600 text-white':'bg-gray-200 text-gray-500'}`}>
        {step>n ? <Icon name="check" size={18} /> : n}
      </div>
      <span className={`text-sm font-semibold ${step>=n?'text-blue-600':'text-gray-500'}`}>{label}</span>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6">Commande</h1>

      {/* Stepper */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex items-center">
        <StepDot n={1} label="Adresse" />
        <div className={`flex-1 h-1 mx-3 ${step>=2?'bg-blue-600':'bg-gray-200'}`} />
        <StepDot n={2} label="Paiement" />
        <div className={`flex-1 h-1 mx-3 ${step>=3?'bg-blue-600':'bg-gray-200'}`} />
        <StepDot n={3} label="Vérification" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Adresse de livraison</h2>
              <div className="grid grid-cols-2 gap-3">
                <input value={address.name} onChange={e=>setAddress({...address,name:e.target.value})} placeholder="Nom complet" className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                <input value={address.phone} onChange={e=>setAddress({...address,phone:e.target.value})} placeholder="Téléphone" className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                <select value={address.governorate} onChange={e=>setAddress({...address,governorate:e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400">
                  {GOVERNORATES.map(g=><option key={g}>{g}</option>)}
                </select>
                <input value={address.area} onChange={e=>setAddress({...address,area:e.target.value})} placeholder="Délégation / Zone" className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                <input value={address.building} onChange={e=>setAddress({...address,building:e.target.value})} placeholder="Immeuble / Résidence" className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                <input value={address.street} onChange={e=>setAddress({...address,street:e.target.value})} placeholder="Rue / Avenue" className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                <textarea value={address.notes} onChange={e=>setAddress({...address,notes:e.target.value})} placeholder="Notes de livraison (optionnel)" className="col-span-2 px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" rows={2} />
              </div>
              <button onClick={() => setStep(2)} className="mt-5 px-8 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">
                Aller au paiement →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Méthode de paiement</h2>
              <div className="space-y-3">
                {[
                  { id:'card',   icon:'💳', t:'Carte bancaire',          d:'Visa, Mastercard, CIB' },
                  { id:'d17',    icon:'📱', t:'D17 / Flouci',            d:'Paiement mobile rapide' },
                  { id:'virement',icon:'🏦',t:'Virement bancaire',       d:'STB, BNA, Attijari...' },
                  { id:'cod',    icon:'💵', t:'Paiement à la livraison', d:'Payez en espèces à la réception' },
                ].map(p => (
                  <label key={p.id} className={`block border-2 rounded-xl p-4 cursor-pointer transition ${payment===p.id?'border-blue-500 bg-blue-50':'border-gray-200 hover:border-blue-300'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={payment===p.id} onChange={() => setPayment(p.id)} className="accent-blue-600" />
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl">{p.icon}</div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-800">{p.t}</div>
                        <div className="text-xs text-gray-500">{p.d}</div>
                      </div>
                    </div>
                  </label>
                ))}
                {payment === 'card' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <input placeholder="Numéro de carte" className="col-span-2 px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                    <input placeholder="Nom sur la carte" className="col-span-2 px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                    <input placeholder="MM/AA" className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                    <input placeholder="CVV" className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep(1)} className="px-6 py-3 rounded-full border border-gray-300 font-bold hover:bg-gray-50">← Retour</button>
                <button onClick={() => setStep(3)} className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">Vérifier →</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Vérifier votre commande</h2>
              <div className="space-y-3 mb-5">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-xs font-bold text-blue-700 mb-1">ADRESSE DE LIVRAISON</div>
                  <div className="text-sm">{address.name} · {address.phone}</div>
                  <div className="text-sm">{address.building}, {address.street}, {address.area}, {address.governorate}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-xs font-bold text-blue-700 mb-1">PAIEMENT</div>
                  <div className="text-sm capitalize">{payment}</div>
                </div>
                <div className="border border-gray-200 rounded-xl divide-y">
                  {items.map(it => (
                    <div key={it.id} className="p-3 flex items-center gap-3">
                      <div className="text-3xl">{it.product.images?.[0] || '📦'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate">{it.product.title}</div>
                        <div className="text-xs text-gray-500">Qté: {it.qty}</div>
                      </div>
                      <div className="font-bold text-blue-600">{fmt(it.product.price * it.qty)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-6 py-3 rounded-full border border-gray-300 font-bold hover:bg-gray-50">← Retour</button>
                <button onClick={placeOrder} disabled={placing}
                  className="flex-1 py-3 rounded-full bg-[#0A1F44] text-white font-bold hover:bg-blue-900 flex items-center justify-center gap-2 disabled:opacity-60">
                  <Icon name="shield" size={18} />
                  {placing ? 'En cours...' : `Confirmer la commande — ${fmt(total)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 h-fit sticky top-24">
          <h3 className="font-bold text-slate-800 mb-3">Récapitulatif</h3>
          <div className="space-y-2 text-sm mb-3">
            <div className="flex justify-between"><span className="text-gray-600">Articles ({items.length})</span><span>{fmt(subtotal)}</span></div>
            {discount>0 && <div className="flex justify-between text-green-600"><span>Remise</span><span>-{fmt(discount)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-600">Livraison</span><span className={shipping===0?'text-green-600 font-semibold':''}>{shipping===0?'GRATUITE':fmt(shipping)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">TVA (19%)</span><span>{fmt(vat)}</span></div>
          </div>
          <div className="border-t pt-3 flex justify-between items-baseline">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-extrabold text-blue-600">{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
