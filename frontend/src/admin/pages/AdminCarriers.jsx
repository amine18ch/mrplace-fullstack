import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminClient';

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500";
const fmtNum  = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);

const CARRIER_TYPES = { NATIONAL:'National', INTERNATIONAL:'International', EXPRESS:'Express', COLD_CHAIN:'Chaîne du froid' };

export default function AdminCarriers() {
  const [carriers, setCarriers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('list');
  const [showModal, setModal]   = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);

  // Prix grid form
  const [gridForm, setGridForm] = useState({ governorate:'ALL', minWeightKg:0, maxWeightKg:30, basePrice:0, codSurcharge:0, fragileExtra:0, expressExtra:0 });

  // Contract form
  const [contractForm, setContractForm] = useState({ startDate:'', slaDays:3, billingMode:'PER_SHIPMENT', penaltyPct:0 });

  const load = useCallback(() => {
    setLoading(true);
    adminApi.get('/carriers').then(setCarriers).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = (id) => {
    adminApi.get(`/carriers/${id}`).then(setDetail).catch(()=>{});
    setSelected(id);
  };

  const saveCarrier = async () => {
    setSaving(true);
    try {
      if (selected && !detail?.name) await adminApi.patch(`/carriers/${selected}`, form);
      else await adminApi.post('/carriers', form);
      setModal(false); setForm({}); load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const addGrid = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await adminApi.post(`/carriers/${detail.id}/pricing`, gridForm);
      loadDetail(detail.id);
      setGridForm({ governorate:'ALL', minWeightKg:0, maxWeightKg:30, basePrice:0, codSurcharge:0, fragileExtra:0, expressExtra:0 });
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const addContract = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await adminApi.post(`/carriers/${detail.id}/contracts`, contractForm);
      loadDetail(detail.id);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">📦 Transporteurs 3PL</h2>
          <p className="text-slate-500 text-sm mt-0.5">Gestion des prestataires externes, contrats et grilles tarifaires</p>
        </div>
        <button onClick={()=>{ setForm({}); setModal(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">+ Nouveau transporteur</button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Liste */}
        <div className="space-y-3">
          {loading ? <div className="text-slate-500 text-sm text-center py-8">Chargement...</div>
          : carriers.length === 0 ? <div className="text-slate-600 text-sm text-center py-8">Aucun transporteur</div>
          : carriers.map(c => (
            <button key={c.id} onClick={() => loadDetail(c.id)}
              className={`w-full text-left bg-slate-900 border rounded-xl p-4 transition ${selected===c.id?'border-blue-500':'border-slate-800 hover:border-slate-700'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-white font-medium text-sm">{c.name}</div>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${c.status==='ACTIVE'?'bg-green-500/20 text-green-400':'bg-slate-600/20 text-slate-500'}`}>{c.status==='ACTIVE'?'Actif':'Inactif'}</span>
              </div>
              <div className="text-slate-500 text-xs">{CARRIER_TYPES[c.type]||c.type}</div>
              <div className="flex gap-3 mt-2 text-slate-600 text-xs">
                <span>{c._count?.shipments||0} expéditions</span>
                <span>{c._count?.pricingGrids||0} tarifs</span>
              </div>
            </button>
          ))}
        </div>

        {/* Détail */}
        <div className="md:col-span-2">
          {!detail ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">Sélectionnez un transporteur</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-bold">{detail.name}</div>
                    <div className="text-slate-400 text-xs mt-0.5">NIF: {detail.nif||'—'} | RNE: {detail.rne||'—'}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${detail.status==='ACTIVE'?'bg-green-500/20 text-green-400':'bg-slate-600/20 text-slate-500'}`}>{detail.status==='ACTIVE'?'Actif':'Inactif'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-500">📞 {detail.phone||'—'}</span>
                  <span className="text-slate-500">✉️ {detail.email||'—'}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
                {['contracts','pricing','invoices'].map(t=>(
                  <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab===t?'bg-blue-600 text-white':'text-slate-400 hover:text-slate-200'}`}>
                    {t==='contracts'?'Contrats':t==='pricing'?'Grille tarifaire':'Factures'}
                  </button>
                ))}
              </div>

              {/* Contrats */}
              {tab === 'contracts' && (
                <div className="space-y-3">
                  {(detail.contracts||[]).map(c => (
                    <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-200 font-medium">{c.ref}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${c.status==='ACTIVE'?'bg-green-500/20 text-green-400':c.status==='DRAFT'?'bg-yellow-500/20 text-yellow-400':'bg-red-500/20 text-red-400'}`}>{c.status}</span>
                      </div>
                      <div className="text-slate-500 text-xs">SLA : {c.slaDays}j | {c.billingMode==='PER_SHIPMENT'?'Facturation à l\'envoi':'Mensuel'} | Pénalité {c.penaltyPct}%</div>
                    </div>
                  ))}
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
                    <div className="text-slate-400 text-xs font-semibold mb-2">Nouveau contrat</div>
                    <input type="date" value={contractForm.startDate} onChange={e=>setContractForm(f=>({...f,startDate:e.target.value}))} className={inputCls} />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="SLA jours" value={contractForm.slaDays} onChange={e=>setContractForm(f=>({...f,slaDays:parseInt(e.target.value)}))} className={inputCls} />
                      <input type="number" placeholder="Pénalité %" value={contractForm.penaltyPct} onChange={e=>setContractForm(f=>({...f,penaltyPct:parseFloat(e.target.value)}))} className={inputCls} />
                      <select value={contractForm.billingMode} onChange={e=>setContractForm(f=>({...f,billingMode:e.target.value}))} className={inputCls}>
                        <option value="PER_SHIPMENT">Par envoi</option>
                        <option value="MONTHLY">Mensuel</option>
                      </select>
                    </div>
                    <button onClick={addContract} disabled={saving||!contractForm.startDate} className="w-full py-2 bg-blue-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">{saving?'...':'Créer le contrat'}</button>
                  </div>
                </div>
              )}

              {/* Grille tarifaire */}
              {tab === 'pricing' && (
                <div className="space-y-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['Gouvernorat','Poids (kg)','Base TND','COD','Fragile','Express'].map(h=>(
                          <th key={h} className="text-left pb-2 text-slate-500 font-semibold uppercase pr-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.pricingGrids||[]).map(g => (
                        <tr key={g.id} className="border-b border-slate-800/50">
                          <td className="py-2 text-slate-300 pr-3">{g.governorate}</td>
                          <td className="py-2 text-slate-400 pr-3">{g.minWeightKg}–{g.maxWeightKg}</td>
                          <td className="py-2 text-white font-medium pr-3">{fmtNum(g.basePrice)}</td>
                          <td className="py-2 text-orange-400 pr-3">+{fmtNum(g.codSurcharge)}</td>
                          <td className="py-2 text-yellow-400 pr-3">+{fmtNum(g.fragileExtra)}</td>
                          <td className="py-2 text-blue-400">+{fmtNum(g.expressExtra)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
                    <div className="text-slate-400 text-xs font-semibold mb-2">Ajouter une ligne tarifaire</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Gouvernorat (ALL = tous)" value={gridForm.governorate} onChange={e=>setGridForm(f=>({...f,governorate:e.target.value}))} className={inputCls} />
                      <div className="flex gap-1">
                        <input type="number" placeholder="Min kg" value={gridForm.minWeightKg} onChange={e=>setGridForm(f=>({...f,minWeightKg:parseFloat(e.target.value)}))} className={inputCls} />
                        <input type="number" placeholder="Max kg" value={gridForm.maxWeightKg} onChange={e=>setGridForm(f=>({...f,maxWeightKg:parseFloat(e.target.value)}))} className={inputCls} />
                      </div>
                      <input type="number" step="0.001" placeholder="Prix de base TND" value={gridForm.basePrice} onChange={e=>setGridForm(f=>({...f,basePrice:parseFloat(e.target.value)}))} className={inputCls} />
                      <input type="number" step="0.001" placeholder="+COD TND" value={gridForm.codSurcharge} onChange={e=>setGridForm(f=>({...f,codSurcharge:parseFloat(e.target.value)}))} className={inputCls} />
                      <input type="number" step="0.001" placeholder="+Fragile TND" value={gridForm.fragileExtra} onChange={e=>setGridForm(f=>({...f,fragileExtra:parseFloat(e.target.value)}))} className={inputCls} />
                      <input type="number" step="0.001" placeholder="+Express TND" value={gridForm.expressExtra} onChange={e=>setGridForm(f=>({...f,expressExtra:parseFloat(e.target.value)}))} className={inputCls} />
                    </div>
                    <button onClick={addGrid} disabled={saving||!gridForm.basePrice} className="w-full py-2 bg-blue-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">{saving?'...':'Ajouter'}</button>
                  </div>
                </div>
              )}

              {/* Factures */}
              {tab === 'invoices' && (
                <div className="space-y-2">
                  {(detail.invoices||[]).length === 0 ? <div className="text-slate-600 text-sm text-center py-6">Aucune facture</div>
                  : (detail.invoices||[]).map(inv => (
                    <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-sm">
                      <div>
                        <div className="text-slate-200 font-medium">{inv.ref}</div>
                        <div className="text-slate-500 text-xs">{new Date(inv.periodStart).toLocaleDateString('fr-TN')} → {new Date(inv.periodEnd).toLocaleDateString('fr-TN')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">{fmtNum(inv.amount)} TND</div>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${inv.status==='PAID'?'bg-green-500/20 text-green-400':inv.status==='DISPUTED'?'bg-red-500/20 text-red-400':'bg-yellow-500/20 text-yellow-400'}`}>{inv.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal créer carrier */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setModal(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold mb-4">Nouveau transporteur</h3>
            <div className="space-y-3">
              <input placeholder="Raison sociale *" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inputCls} />
              <input placeholder="Slug (identifiant unique)" value={form.slug||''} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} className={inputCls} />
              <input placeholder="NIF" value={form.nif||''} onChange={e=>setForm(f=>({...f,nif:e.target.value}))} className={inputCls} />
              <input placeholder="Téléphone" value={form.phone||''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={inputCls} />
              <input placeholder="Email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className={inputCls} />
              <select value={form.type||'NATIONAL'} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className={inputCls}>
                {Object.entries(CARRIER_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setModal(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm transition">Annuler</button>
              <button onClick={saveCarrier} disabled={saving||!form.name} className="flex-1 py-2 bg-blue-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">{saving?'...':'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
