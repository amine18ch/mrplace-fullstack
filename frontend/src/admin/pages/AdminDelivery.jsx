import { useEffect, useState, useCallback } from 'react';
import { adminApi, getAdminToken } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const openDoc = (path) => {
  const token = getAdminToken() || '';
  window.open(`${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`, '_blank');
};

const STATUS_META = {
  DRAFT:              { label: 'Brouillon',         color: 'bg-slate-500/20 text-slate-400' },
  READY:              { label: 'Prêt à expédier',   color: 'bg-yellow-500/20 text-yellow-400' },
  ASSIGNED:           { label: 'Affecté',           color: 'bg-blue-500/20 text-blue-400' },
  PICKED_UP:          { label: 'Enlevé',            color: 'bg-indigo-500/20 text-indigo-400' },
  IN_TRANSIT:         { label: 'En transit',        color: 'bg-purple-500/20 text-purple-400' },
  OUT_FOR_DELIVERY:   { label: 'En cours livraison',color: 'bg-orange-500/20 text-orange-400' },
  DELIVERED:          { label: 'Livré',             color: 'bg-green-500/20 text-green-400' },
  FAILED:             { label: 'Échec',             color: 'bg-red-500/20 text-red-400' },
  RETURNED:           { label: 'Retourné',          color: 'bg-amber-500/20 text-amber-400' },
  CANCELLED:          { label: 'Annulé',            color: 'bg-slate-600/20 text-slate-500' },
};

const MODE_META = {
  FLEET:       { label: 'Flotte propre', icon: '🚚', color: 'bg-blue-500/20 text-blue-400' },
  THIRD_PARTY: { label: '3PL',           icon: '📦', color: 'bg-purple-500/20 text-purple-400' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-TN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';
const fmtNum  = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);

export default function AdminDelivery() {
  const { admin } = useAdmin();
  const [shipments, setShipments] = useState([]);
  const [stats, setStats]         = useState(null);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [statusFilter, setStatus] = useState('');
  const [modeFilter, setMode]     = useState('');
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [showCreate, setCreate]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 20 });
    if (statusFilter) p.append('status', statusFilter);
    if (modeFilter) p.append('mode', modeFilter);
    Promise.all([
      adminApi.get(`/delivery/shipments?${p}`),
      adminApi.get('/delivery/stats'),
    ]).then(([d, s]) => {
      setShipments(d.shipments || []);
      setTotal(d.total || 0);
      setStats(s);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [page, statusFilter, modeFilter]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = (id) => {
    adminApi.get(`/delivery/shipments/${id}`).then(setDetail).catch(()=>{});
    setSelected(id);
  };

  const ALL_STATUSES = ['DRAFT','READY','ASSIGNED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED','CANCELLED'];

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">🚚 Expéditions</h2>
          <p className="text-slate-500 text-sm mt-0.5">Gestion des livraisons flotte & 3PL</p>
        </div>
        <button onClick={() => setCreate(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
          + Nouvelle expédition
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total',    value: stats.total,      color: 'text-white' },
            { label: 'En cours', value: stats.byStatus?.filter(s=>['IN_TRANSIT','OUT_FOR_DELIVERY','ASSIGNED','PICKED_UP'].includes(s.status)).reduce((a,b)=>a+b._count.id,0)||0, color: 'text-blue-400' },
            { label: 'Livrés',  value: stats.byStatus?.find(s=>s.status==='DELIVERED')?._count.id||0, color: 'text-green-400' },
            { label: 'Flotte',  value: stats.byMode?.find(m=>m.mode==='FLEET')?._count.id||0, color: 'text-blue-400' },
            { label: 'COD att.',value: stats.pendingCod,  color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={statusFilter} onChange={e=>{ setStatus(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm">
          <option value="">Tous les statuts</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label||s}</option>)}
        </select>
        <select value={modeFilter} onChange={e=>{ setMode(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm">
          <option value="">Tous les modes</option>
          <option value="FLEET">🚚 Flotte propre</option>
          <option value="THIRD_PARTY">📦 3PL</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Ref suivi','Commande','Vendeur','Mode','Statut','COD','Livraison estimée','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-slate-500 text-xs font-semibold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-600">Chargement...</td></tr>
              ) : shipments.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-600">Aucune expédition</td></tr>
              ) : shipments.map(s => {
                const sm = STATUS_META[s.status] || { label: s.status, color: 'bg-slate-500/20 text-slate-400' };
                const mm = MODE_META[s.mode] || { label: s.mode, icon: '📦', color: 'bg-slate-500/20 text-slate-400' };
                return (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 text-blue-400 font-mono text-xs">{s.trackingRef || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">#{String(s.orderId).padStart(6,'0')}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">Vendeur #{s.sellerId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${mm.color}`}>{mm.icon} {mm.label}</span>
                      {s.carrier && <div className="text-slate-600 text-xs mt-0.5">{s.carrier.name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.color}`}>{sm.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {s.isCod ? <span className="text-orange-400 font-semibold">{fmtNum(s.codAmount)} TND</span> : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(s.estimatedDelivery)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => loadDetail(s.id)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition">Détail</button>
                        <button onClick={() => openDoc(`/api/admin/delivery/shipments/${s.id}/lettre-voiture`)} className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs transition">LV</button>
                        <button onClick={() => openDoc(`/api/admin/delivery/shipments/${s.id}/bon-livraison`)} className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded text-xs transition">BL</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-slate-500 text-sm">{total} expéditions</span>
            <div className="flex gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-sm disabled:opacity-40">←</button>
              <span className="px-3 py-1.5 text-slate-400 text-sm">Page {page}</span>
              <button onClick={()=>setPage(p=>p+1)} disabled={page*20>=total} className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-sm disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Panel détail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={()=>{ setDetail(null); setSelected(null); }} />
          <div className="relative w-full max-w-lg h-full bg-slate-900 overflow-y-auto shadow-2xl border-l border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Expédition #{detail.id}</h3>
              <button onClick={()=>{ setDetail(null); setSelected(null); }} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <DetailPanel detail={detail} onRefresh={() => loadDetail(detail.id)} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailPanel({ detail, onRefresh }) {
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const ALL_STATUSES = ['DRAFT','READY','ASSIGNED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED','CANCELLED'];

  const updateStatus = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await adminApi.patch(`/delivery/shipments/${detail.id}/status`, { status: newStatus });
      onRefresh();
      setNewStatus('');
    } catch {} finally { setSaving(false); }
  };

  const addr = (() => { try { return JSON.parse(detail.deliveryAddress||'{}'); } catch { return {}; } })();
  const sm = STATUS_META[detail.status] || { label: detail.status, color: 'bg-slate-500/20 text-slate-400' };
  const mm = MODE_META[detail.mode] || { label: detail.mode, icon: '📦', color: 'bg-slate-500/20 text-slate-400' };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex gap-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.color}`}>{sm.label}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${mm.color}`}>{mm.icon} {mm.label}</span>
        {detail.isCod && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">COD {new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(detail.codAmount)} TND</span>}
        {detail.isExpress && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Express</span>}
      </div>

      <div className="bg-slate-800 rounded-xl p-4 space-y-2">
        <div className="text-slate-400 text-xs font-semibold uppercase mb-2">Destinataire</div>
        <div className="text-white font-medium">{addr.name || '—'}</div>
        <div className="text-slate-400">{addr.street}, {addr.area}</div>
        <div className="text-slate-400">{addr.governorate}</div>
        <div className="text-slate-400">Tél : {addr.phone || '—'}</div>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 grid grid-cols-2 gap-3">
        <div><div className="text-slate-500 text-xs mb-1">Poids</div><div className="text-white">{detail.weightKg} kg</div></div>
        <div><div className="text-slate-500 text-xs mb-1">Fragile</div><div className="text-white">{detail.isFragile ? '⚠️ Oui' : 'Non'}</div></div>
        <div><div className="text-slate-500 text-xs mb-1">Ref suivi</div><div className="text-blue-400 font-mono text-xs">{detail.trackingRef || '—'}</div></div>
        <div><div className="text-slate-500 text-xs mb-1">Livraison est.</div><div className="text-white">{detail.estimatedDelivery ? new Date(detail.estimatedDelivery).toLocaleDateString('fr-TN') : '—'}</div></div>
      </div>

      {detail.routingRationale && (
        <div className="bg-slate-800 rounded-xl p-3">
          <div className="text-slate-500 text-xs mb-1">Décision routage</div>
          <div className="text-slate-300 text-xs">{detail.routingRationale}</div>
        </div>
      )}

      {/* Changer statut */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="text-slate-400 text-xs font-semibold uppercase mb-3">Mettre à jour le statut</div>
        <div className="flex gap-2">
          <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm">
            <option value="">— Choisir —</option>
            {ALL_STATUSES.filter(s=>s!==detail.status).map(s=><option key={s} value={s}>{STATUS_META[s]?.label||s}</option>)}
          </select>
          <button onClick={updateStatus} disabled={!newStatus||saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
            {saving ? '...' : 'OK'}
          </button>
        </div>
      </div>

      {/* Historique événements */}
      {detail.events?.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase mb-3">Historique</div>
          <div className="space-y-2">
            {detail.events.map(e => (
              <div key={e.id} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                <div>
                  <div className="text-slate-300 text-xs font-medium">{STATUS_META[e.status]?.label || e.status}</div>
                  {e.note && <div className="text-slate-500 text-xs">{e.note}</div>}
                  <div className="text-slate-600 text-xs">{new Date(e.createdAt).toLocaleString('fr-TN')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
