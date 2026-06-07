import { useEffect, useState } from 'react';
import { sellerApi, getSellerToken } from '../api/sellerClient';

const openDoc = (path) => {
  const token = getSellerToken() || '';
  window.open(`${path}?token=${encodeURIComponent(token)}`, '_blank');
};

const fmtNum  = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-TN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';

const STATUS_LABELS = {
  DRAFT: 'Brouillon', READY: 'Prêt à expédier', ASSIGNED: 'Assigné', PICKED_UP: 'Enlevé',
  IN_TRANSIT: 'En transit', OUT_FOR_DELIVERY: 'En livraison',
  DELIVERED: 'Livré', FAILED: 'Échec', RETURNED: 'Retour', CANCELLED: 'Annulé',
};
const STATUS_COLORS = {
  DRAFT: 'bg-slate-700/20 text-slate-400', READY: 'bg-blue-500/20 text-blue-400',
  ASSIGNED: 'bg-indigo-500/20 text-indigo-400', PICKED_UP: 'bg-cyan-500/20 text-cyan-400',
  IN_TRANSIT: 'bg-yellow-500/20 text-yellow-400', OUT_FOR_DELIVERY: 'bg-orange-500/20 text-orange-400',
  DELIVERED: 'bg-green-500/20 text-green-400', FAILED: 'bg-red-500/20 text-red-400',
  RETURNED: 'bg-rose-500/20 text-rose-400', CANCELLED: 'bg-slate-600/20 text-slate-500',
};

export default function SellerShipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setFilter] = useState('');
  const [markingId, setMarkingId] = useState(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (statusFilter) p.append('status', statusFilter);
    sellerApi.get(`/shipments?${p}`).then(d => setShipments(d.shipments || d || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const markReady = async (id) => {
    setMarkingId(id);
    try {
      await sellerApi.patch(`/shipments/${id}/ready`, {});
      load();
    } catch (e) { alert(e.message); }
    finally { setMarkingId(null); }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">🚚 Mes expéditions</h2>
        <p className="text-slate-500 text-sm mt-0.5">Suivi de vos commandes en cours de livraison</p>
      </div>

      {/* Filtre statut */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[['','Toutes'], ['DRAFT','Brouillons'], ['READY','Prêts'], ['IN_TRANSIT','En transit'], ['DELIVERED','Livrés'], ['FAILED','Échecs']].map(([v,l]) => (
          <button key={v} onClick={()=>setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter===v?'bg-blue-600 text-white':'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Chargement...</div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-12 text-slate-600">Aucune expédition</div>
      ) : (
        <div className="space-y-3">
          {shipments.map(s => {
            const addr = (() => { try { return JSON.parse(s.deliveryAddress || '{}'); } catch { return {}; } })();
            return (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-white font-medium text-sm">
                        Commande #{String(s.orderId).padStart(6, '0')}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[s.status] || 'bg-slate-700 text-slate-400'}`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </div>
                    {s.trackingRef && (
                      <div className="text-slate-500 text-xs mt-0.5 font-mono">{s.trackingRef}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${s.mode==='FLEET'?'bg-blue-500/20 text-blue-400':'bg-purple-500/20 text-purple-400'}`}>
                      {s.mode==='FLEET'?'Flotte':'3PL'}
                    </span>
                    {s.isCod && <span className="px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400">COD</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                  <div>
                    <div className="text-slate-500">Destinataire</div>
                    <div className="text-slate-300">{addr.firstName || '—'} {addr.lastName || ''}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Gouvernorat</div>
                    <div className="text-slate-300">{addr.governorate || '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Livraison est.</div>
                    <div className="text-slate-300">{fmtDate(s.estimatedDelivery)}</div>
                  </div>
                  {s.isCod && (
                    <div>
                      <div className="text-slate-500">COD</div>
                      <div className="text-orange-400 font-medium">{fmtNum(s.codAmount)} TND</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {s.status === 'DRAFT' && (
                    <button onClick={() => markReady(s.id)} disabled={markingId === s.id}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition">
                      {markingId === s.id ? '...' : '✓ Marquer prêt'}
                    </button>
                  )}
                  {s.trackingRef && (
                    <a href={`/tracking?ref=${s.trackingRef}`} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition">
                      🔍 Suivre
                    </a>
                  )}
                  <button onClick={() => openDoc(`/api/admin/delivery/shipments/${s.id}/lettre-voiture`)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition">
                    📄 LV
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
