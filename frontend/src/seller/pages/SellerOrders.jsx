import { useEffect, useState, useCallback } from 'react';
import { sellerApi } from '../api/sellerClient';

const fmtDT = n => new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(n||0);
const fmtDate = d => new Date(d).toLocaleDateString('fr-TN',{day:'2-digit',month:'short',year:'numeric'});

const STATUS_COLORS = {
  EN_ATTENTE:'bg-yellow-500/20 text-yellow-400', CONFIRMEE:'bg-blue-500/20 text-blue-400',
  EN_PREPARATION:'bg-indigo-500/20 text-indigo-400', EXPEDIEE:'bg-purple-500/20 text-purple-400',
  LIVREE:'bg-green-500/20 text-green-400', ANNULEE:'bg-red-500/20 text-red-400',
};
const STATUS_LABELS = {
  EN_ATTENTE:'En attente', CONFIRMEE:'Confirmée', EN_PREPARATION:'En préparation',
  EXPEDIEE:'Expédiée', LIVREE:'Livrée', ANNULEE:'Annulée',
};

export default function SellerOrders() {
  const [orders, setOrders]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNum, setTracking] = useState('');
  const [actionLoading, setActLoad] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 15 });
    if (statusFilter) p.append('status', statusFilter);
    sellerApi.get(`/orders?${p}`)
      .then(d => { setOrders(d.orders||[]); setTotal(d.total||0); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async () => {
    if (!newStatus || !selected) return;
    setActLoad(true);
    try {
      await sellerApi.patch(`/orders/${selected.id}/status`, { status: newStatus, trackingNumber: trackingNum || undefined });
      setSuccess('Statut mis à jour ✓');
      setSelected(null); setNewStatus(''); setTracking('');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
    finally { setActLoad(false); }
  };

  return (
    <div className="p-6 max-w-5xl">
      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Mes commandes</h2>
          <p className="text-slate-500 text-sm mt-0.5">{total} commande(s) au total</p>
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-slate-500 text-center py-16">Chargement...</div>
      ) : orders.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-slate-400 font-medium">Aucune commande</div>
          <div className="text-slate-600 text-sm mt-1">Vos commandes apparaîtront ici</div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-mono text-sm font-bold">#{String(o.id).padStart(4,'0')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]||'bg-slate-700 text-slate-400'}`}>
                      {STATUS_LABELS[o.status]||o.status}
                    </span>
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    {o.user?.name || 'Client'} — {fmtDate(o.createdAt)}
                  </div>
                  {o.shippingAddress?.governorate && (
                    <div className="text-slate-600 text-xs">📍 {o.shippingAddress.area}, {o.shippingAddress.governorate}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-blue-400 font-bold text-lg">{fmtDT(o.sellerTotal || 0)} DT</div>
                  <div className="text-slate-500 text-xs">{o.items?.length || 0} article(s)</div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1.5 mb-3">
                {(o.items||[]).map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-xs bg-slate-800/50 rounded-lg px-3 py-2">
                    <span className="text-xl">{item.product?.images?.[0] || '📦'}</span>
                    <span className="text-slate-300 flex-1 truncate">{item.product?.title}</span>
                    <span className="text-slate-400">x{item.qty}</span>
                    <span className="text-blue-400 font-medium">{fmtDT(item.price * item.qty)} DT</span>
                  </div>
                ))}
              </div>

              {/* Actions vendeur */}
              <div className="flex gap-2">
                <button onClick={() => { setSelected(o); setNewStatus(o.status); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-lg transition-colors">
                  Voir détails / Changer statut
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 15 && (
        <div className="flex justify-center gap-2 mt-5">
          <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">← Préc.</button>
          <span className="px-4 py-2 text-slate-400 text-sm">{page}/{Math.ceil(total/15)}</span>
          <button onClick={() => setPage(p=>p+1)} disabled={orders.length<15} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv. →</button>
        </div>
      )}

      {/* Modal détail + changement statut */}
      {selected && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold">Commande #{String(selected.id).padStart(4,'0')}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Client */}
              <div className="bg-slate-900 rounded-xl p-4">
                <div className="text-slate-400 text-xs font-semibold mb-2">CLIENT</div>
                <div className="text-slate-200 font-medium">{selected.user?.name}</div>
                <div className="text-slate-500 text-sm">{selected.user?.email}</div>
                {selected.user?.phone && <div className="text-slate-500 text-sm">{selected.user.phone}</div>}
              </div>

              {/* Adresse */}
              {selected.shippingAddress?.name && (
                <div className="bg-slate-900 rounded-xl p-4">
                  <div className="text-slate-400 text-xs font-semibold mb-2">ADRESSE DE LIVRAISON</div>
                  <div className="text-slate-300 text-sm">
                    {selected.shippingAddress.building}, {selected.shippingAddress.street}
                    <br/>{selected.shippingAddress.area}, {selected.shippingAddress.governorate}
                    <br/>{selected.shippingAddress.phone}
                  </div>
                </div>
              )}

              {/* Articles */}
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-2">VOS ARTICLES</div>
                <div className="space-y-2">
                  {(selected.items||[]).map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                      <span className="text-3xl">{item.product?.images?.[0] || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-200 text-sm truncate">{item.product?.title}</div>
                        <div className="text-slate-500 text-xs">Qté: {item.qty} × {fmtDT(item.price)} DT</div>
                      </div>
                      <div className="text-blue-400 font-bold">{fmtDT(item.price * item.qty)} DT</div>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 text-sm font-bold">
                    <span className="text-slate-400">Total votre part</span>
                    <span className="text-blue-400">{fmtDT(selected.sellerTotal||0)} DT</span>
                  </div>
                </div>
              </div>

              {/* Changer statut */}
              {['CONFIRMEE', 'EN_ATTENTE', 'EN_PREPARATION'].includes(selected.status) && (
                <div className="bg-slate-900 rounded-xl p-4">
                  <div className="text-slate-400 text-xs font-semibold mb-3">METTRE À JOUR LE STATUT</div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {['EN_PREPARATION','EXPEDIEE'].map(s => (
                      <button key={s} onClick={() => setNewStatus(s)}
                        className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors ${newStatus===s?'border-blue-500 bg-blue-500/20 text-blue-300':'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {newStatus === 'EXPEDIEE' && (
                    <input value={trackingNum} onChange={e => setTracking(e.target.value)}
                      placeholder="Numéro de suivi (optionnel)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-3"
                    />
                  )}
                  <button onClick={handleStatusUpdate} disabled={!newStatus || newStatus===selected.status || actionLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                    {actionLoading ? 'Mise à jour...' : 'Confirmer le statut'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
