import { useEffect, useState, useCallback } from 'react';
import { adminApi, getAdminToken } from '../api/adminClient';

const openDoc = (path) => {
  const token = getAdminToken() || '';
  window.open(`${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`, '_blank');
};

const STATUS_COLORS = {
  PLANNED: 'bg-blue-500/20 text-blue-400', IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-green-500/20 text-green-400', CANCELLED: 'bg-red-500/20 text-red-400',
};
const STATUS_LABELS = { PLANNED:'Planifiée', IN_PROGRESS:'En cours', COMPLETED:'Terminée', CANCELLED:'Annulée' };
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-TN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';
const fmtNum  = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);
const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500";

export default function AdminTours() {
  const [tours, setTours]       = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [showCreate, setCreate] = useState(false);
  const [dateFilter, setDate]   = useState('');
  const [saving, setSaving]     = useState(false);

  const [form, setForm] = useState({ date:'', driverId:'', vehicleId:'', shipmentIds:[], notes:'' });

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (dateFilter) p.append('date', dateFilter);
    Promise.all([
      adminApi.get(`/tours?${p}`),
      adminApi.get('/fleet/drivers'),
      adminApi.get('/fleet/vehicles'),
      adminApi.get('/delivery/shipments?status=READY&limit=50'),
    ]).then(([t,d,v,s]) => {
      setTours(t||[]); setDrivers(d||[]); setVehicles(v||[]);
      setShipments((s.shipments||[]).filter(sh => !sh.tourId));
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = id => {
    adminApi.get(`/tours/${id}`).then(setDetail).catch(()=>{});
    setSelected(id);
  };

  const createTour = async () => {
    if (!form.date || !form.driverId || !form.vehicleId) return alert('Date, chauffeur et véhicule requis');
    setSaving(true);
    try {
      await adminApi.post('/tours', { ...form, driverId: parseInt(form.driverId), vehicleId: parseInt(form.vehicleId) });
      setCreate(false); setForm({ date:'', driverId:'', vehicleId:'', shipmentIds:[], notes:'' }); load();
    } catch (e) { alert(e.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const toggleShipment = id => {
    setForm(f => ({ ...f, shipmentIds: f.shipmentIds.includes(id) ? f.shipmentIds.filter(x=>x!==id) : [...f.shipmentIds, id] }));
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">🗺️ Tournées</h2>
          <p className="text-slate-500 text-sm mt-0.5">Planification et suivi des tournées de livraison</p>
        </div>
        <button onClick={()=>setCreate(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">+ Nouvelle tournée</button>
      </div>

      {/* Filtre date */}
      <div className="flex gap-3 mb-4">
        <input type="date" value={dateFilter} onChange={e=>setDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm" />
        {dateFilter && <button onClick={()=>setDate('')} className="px-3 py-2 text-slate-500 hover:text-white text-sm transition">✕ Effacer</button>}
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Liste tournées */}
        <div className="md:col-span-2 space-y-3">
          {loading ? <div className="text-slate-500 text-center py-8 text-sm">Chargement...</div>
          : tours.length === 0 ? <div className="text-slate-600 text-center py-8 text-sm">Aucune tournée</div>
          : tours.map(t => (
            <button key={t.id} onClick={() => loadDetail(t.id)}
              className={`w-full text-left bg-slate-900 border rounded-xl p-4 transition ${selected===t.id?'border-blue-500':'border-slate-800 hover:border-slate-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-semibold text-sm">{fmtDate(t.date)}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[t.status]||'bg-slate-500/20 text-slate-400'}`}>{STATUS_LABELS[t.status]||t.status}</span>
              </div>
              <div className="text-slate-400 text-xs">👤 {t.driver?.name || '—'}</div>
              <div className="text-slate-400 text-xs">🚛 {t.vehicle?.plate || '—'}</div>
              <div className="flex gap-3 mt-2 text-slate-500 text-xs">
                <span>{t._count?.stops||t.stops?.length||0} stops</span>
                {t.codTotal > 0 && <span className="text-orange-400">COD {fmtNum(t.codTotal)} TND</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Détail tournée */}
        <div className="md:col-span-3">
          {!detail ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">Sélectionnez une tournée</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-bold">Tournée du {fmtDate(detail.date)}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{detail.driver?.name} · {detail.vehicle?.plate}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[detail.status]||''}`}>{STATUS_LABELS[detail.status]||detail.status}</span>
                    <button onClick={() => openDoc(`/api/admin/tours/${detail.id}/manifeste`)} className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs transition">📄 Manifeste</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-slate-400">Km est.</div><div className="text-white font-bold">{detail.kmEstimated || '—'}</div></div>
                  <div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-slate-400">COD total</div><div className="text-orange-400 font-bold">{fmtNum(detail.codTotal)}</div></div>
                  <div className="bg-slate-800 rounded-lg p-2 text-center"><div className="text-slate-400">Stops</div><div className="text-white font-bold">{detail.stops?.length||0}</div></div>
                </div>
              </div>

              {/* Stops */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">Stops ordonnés</div>
                {(detail.stops||[]).length === 0 ? (
                  <div className="p-6 text-center text-slate-600 text-sm">Aucun stop</div>
                ) : (detail.stops||[]).map((stop, i) => {
                  const sc = { PENDING:'bg-blue-500/20 text-blue-400', DONE:'bg-green-500/20 text-green-400', FAILED:'bg-red-500/20 text-red-400', SKIPPED:'bg-slate-600/20 text-slate-400' }[stop.status] || 'bg-slate-500/20 text-slate-400';
                  return (
                    <div key={stop.id} className="px-4 py-3 border-b border-slate-800/50 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold flex-shrink-0">{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-300 text-sm">Expédition #{stop.shipmentId}</div>
                        {stop.failReason && <div className="text-red-400 text-xs">{stop.failReason}</div>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${sc}`}>{stop.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal créer tournée */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setCreate(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-white font-bold mb-4">Nouvelle tournée</h3>
            <div className="space-y-3">
              <div>
                <label className="text-slate-500 text-xs block mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={inputCls} />
              </div>
              <div>
                <label className="text-slate-500 text-xs block mb-1">Chauffeur *</label>
                <select value={form.driverId} onChange={e=>setForm(f=>({...f,driverId:e.target.value}))} className={inputCls}>
                  <option value="">— Choisir —</option>
                  {drivers.filter(d=>d.status==='ACTIVE').map(d=><option key={d.id} value={d.id}>{d.name} ({d.cin})</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-500 text-xs block mb-1">Véhicule *</label>
                <select value={form.vehicleId} onChange={e=>setForm(f=>({...f,vehicleId:e.target.value}))} className={inputCls}>
                  <option value="">— Choisir —</option>
                  {vehicles.filter(v=>v.status==='ACTIVE').map(v=><option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-500 text-xs block mb-2">Expéditions à ajouter ({shipments.length} disponibles)</label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-800 rounded-lg p-2">
                  {shipments.length === 0 ? <div className="text-slate-600 text-xs text-center py-3">Aucune expédition prête</div>
                  : shipments.map(s => {
                    const addr = (() => { try { return JSON.parse(s.deliveryAddress||'{}'); } catch { return {}; } })();
                    const checked = form.shipmentIds.includes(s.id);
                    return (
                      <label key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${checked?'bg-blue-500/10 border border-blue-500/30':'hover:bg-slate-700'}`}>
                        <input type="checkbox" checked={checked} onChange={()=>toggleShipment(s.id)} className="accent-blue-500" />
                        <span className="text-slate-300 text-xs">#{String(s.orderId).padStart(6,'0')} — {addr.governorate||'—'} {s.isCod?`💰${fmtNum(s.codAmount)}`:''}</span>
                      </label>
                    );
                  })}
                </div>
                {form.shipmentIds.length > 0 && <div className="text-blue-400 text-xs mt-1">{form.shipmentIds.length} expédition(s) sélectionnée(s)</div>}
              </div>
              <textarea placeholder="Notes (optionnel)" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className={`${inputCls} resize-none`} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setCreate(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm transition">Annuler</button>
              <button onClick={createTour} disabled={saving||!form.date||!form.driverId||!form.vehicleId} className="flex-1 py-2 bg-blue-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">{saving?'Création...':'Créer la tournée'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
