import { useEffect, useState, useCallback } from 'react';
import { adminApi, getAdminToken } from '../api/adminClient';

const openDoc = (path) => {
  const token = getAdminToken() || '';
  window.open(`${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`, '_blank');
};

const fmtNum  = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleString('fr-TN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500";

export default function AdminCod() {
  const [stats, setStats]         = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [pending, setPending]     = useState([]);
  const [collections, setCollections] = useState([]);
  const [drivers, setDrivers]     = useState([]);
  const [tab, setTab]             = useState('overview');
  const [loading, setLoading]     = useState(true);
  const [showSettle, setSettle]   = useState(false);
  const [settleForm, setSettleForm] = useState({ driverId:'', totalActual:'', notes:'' });
  const [saving, setSaving]       = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminApi.get('/cod/stats'),
      adminApi.get('/cod/settlements'),
      adminApi.get('/cod/pending-balance'),
      adminApi.get('/cod/collections?settled=false'),
      adminApi.get('/fleet/drivers'),
    ]).then(([st,s,p,c,d]) => {
      setStats(st); setSettlements(s||[]); setPending(p||[]); setCollections(c||[]); setDrivers(d||[]);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createSettlement = async () => {
    if (!settleForm.driverId || !settleForm.totalActual) return alert('Chauffeur et montant remis requis');
    setSaving(true);
    try {
      await adminApi.post('/cod/settlements', {
        driverId: parseInt(settleForm.driverId),
        totalActual: parseFloat(settleForm.totalActual),
        notes: settleForm.notes,
      });
      setSettle(false); setSettleForm({ driverId:'', totalActual:'', notes:'' }); load();
    } catch (e) { alert(e.message||'Erreur'); }
    finally { setSaving(false); }
  };

  const validate = async (id, status) => {
    await adminApi.patch(`/cod/settlements/${id}/validate`, { status }).catch(()=>{});
    load();
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">💰 COD — Cash on Delivery</h2>
          <p className="text-slate-500 text-sm mt-0.5">Encaissements, remises et rapprochement caisse</p>
        </div>
        <button onClick={()=>setSettle(true)} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition">+ Remise caisse</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total encaissé',  value: fmtNum(stats.totalCollected)+' TND', color: 'text-green-400' },
            { label: 'Versé / soldé',   value: fmtNum(stats.totalSettled)+' TND',   color: 'text-blue-400' },
            { label: 'En attente',      value: fmtNum(stats.pendingAmount)+' TND',  color: 'text-orange-400' },
            { label: 'Litiges',         value: stats.disputedCount,                color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
        {[['overview','Soldes chauffeurs'],['settlements','Remises'],['collections','Encaissements']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab===id?'bg-orange-600 text-white':'text-slate-400 hover:text-slate-200'}`}>{label}</button>
        ))}
      </div>

      {/* Soldes en attente par chauffeur */}
      {tab === 'overview' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">✅ Tous les soldes COD sont soldés</div>
          ) : pending.map(d => (
            <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-white font-medium">{d.name}</div>
                <div className="text-slate-500 text-xs">CIN: {d.cin} · {d.pendingCount} encaissement(s) non remis</div>
              </div>
              <div className="text-right">
                <div className="text-orange-400 font-bold text-lg">{fmtNum(d.pendingTotal)} TND</div>
                <button onClick={()=>{ setSettleForm(f=>({...f,driverId:String(d.id),totalActual:d.pendingTotal.toFixed(3)})); setSettle(true); }}
                  className="mt-1 px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs transition">
                  Remise caisse
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remises */}
      {tab === 'settlements' && (
        <div className="space-y-3">
          {settlements.length === 0 ? (
            <div className="text-slate-600 text-center py-8 text-sm">Aucune remise</div>
          ) : settlements.map(s => {
            const diff = s.diff || 0;
            return (
              <div key={s.id} className={`bg-slate-900 border rounded-xl p-4 ${s.status==='DISPUTED'?'border-red-500/30':s.status==='VALIDATED'?'border-green-500/30':'border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-white font-medium">{s.driver?.name || '—'}</div>
                    <div className="text-slate-500 text-xs">{s.tour ? `Tournée du ${new Date(s.tour.date).toLocaleDateString('fr-TN')}` : 'Sans tournée'} · {s.collections?.length||0} encaissements</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {Math.abs(diff) > 0.001 && (
                      <span className={`text-xs font-bold ${diff<0?'text-red-400':'text-green-400'}`}>{diff>0?'+':''}{fmtNum(diff)} TND</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status==='VALIDATED'?'bg-green-500/20 text-green-400':s.status==='DISPUTED'?'bg-red-500/20 text-red-400':'bg-yellow-500/20 text-yellow-400'}`}>{s.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-slate-800 rounded-lg p-2"><div className="text-slate-500">Attendu</div><div className="text-white font-bold">{fmtNum(s.totalExpected)} TND</div></div>
                  <div className="bg-slate-800 rounded-lg p-2"><div className="text-slate-500">Remis</div><div className="text-white font-bold">{fmtNum(s.totalActual)} TND</div></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openDoc(`/api/admin/cod/settlements/${s.id}/bordereau`)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition">📄 Bordereau</button>
                  {s.status === 'PENDING' && <>
                    <button onClick={() => validate(s.id, 'VALIDATED')} className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs transition">✓ Valider</button>
                    <button onClick={() => validate(s.id, 'DISPUTED')} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition">⚠ Litige</button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Encaissements individuels */}
      {tab === 'collections' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Commande','Montant','Mode','Livreur','Date','Soldé'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-slate-500 text-xs font-semibold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {collections.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-600 text-sm">✅ Tous les encaissements sont remis</td></tr>
              ) : collections.map(c => (
                <tr key={c.id} className="border-b border-slate-800/50">
                  <td className="px-4 py-3 text-slate-300">#{String(c.shipment?.orderId||'').padStart(6,'0')}</td>
                  <td className="px-4 py-3 text-orange-400 font-bold">{fmtNum(c.amount)} TND</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{c.method==='CASH'?'💵 Espèces':'💳 TPE'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">Chauffeur #{c.driverId}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(c.collectedAt)}</td>
                  <td className="px-4 py-3">
                    {c.settlementId ? <span className="text-green-400 text-xs">✅</span> : <span className="text-orange-400 text-xs">⏳</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal remise caisse */}
      {showSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setSettle(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold mb-4">💰 Remise caisse</h3>
            <div className="space-y-3">
              <select value={settleForm.driverId} onChange={e=>setSettleForm(f=>({...f,driverId:e.target.value}))} className={inputCls}>
                <option value="">— Sélectionner le chauffeur —</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.name} ({d.cin})</option>)}
              </select>
              <div>
                <label className="text-slate-500 text-xs block mb-1">Montant effectivement remis (TND)</label>
                <input type="number" step="0.001" placeholder="Ex: 245.000" value={settleForm.totalActual} onChange={e=>setSettleForm(f=>({...f,totalActual:e.target.value}))} className={inputCls} />
              </div>
              <textarea placeholder="Notes (optionnel)" value={settleForm.notes} onChange={e=>setSettleForm(f=>({...f,notes:e.target.value}))} rows={2} className={`${inputCls} resize-none`} />
              <div className="text-slate-500 text-xs bg-slate-800 rounded-lg p-3">
                Tous les encaissements non remis de ce chauffeur seront rattachés à cette remise. Un bordereau sera généré.
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setSettle(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm transition">Annuler</button>
              <button onClick={createSettlement} disabled={saving||!settleForm.driverId||!settleForm.totalActual} className="flex-1 py-2 bg-orange-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">{saving?'...':'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
