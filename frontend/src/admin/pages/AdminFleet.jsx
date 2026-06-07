import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminClient';

const STATUS_VEHICLE = { ACTIVE:'Actif', MAINTENANCE:'Maintenance', OUT_OF_SERVICE:'Hors service' };
const STATUS_DRIVER  = { ACTIVE:'Actif', OFF:'Repos', SUSPENDED:'Suspendu' };
const DOC_TYPES_V    = ['CARTE_GRISE','ASSURANCE','VISITE_TECHNIQUE','VIGNETTE','AUTORISATION_MT','ATT'];
const DOC_TYPES_D    = ['PERMIS','CIN','VISITE_MEDICALE'];
const ZONE_MODES     = { FLEET:'Flotte propre', HYBRID:'Hybride', THIRD_PARTY:'3PL uniquement' };
const ZONE_COLORS    = { FLEET:'bg-blue-500/20 text-blue-400', HYBRID:'bg-yellow-500/20 text-yellow-400', THIRD_PARTY:'bg-purple-500/20 text-purple-400' };

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500";

const AlertBadge = ({ daysLeft }) => {
  if (daysLeft <= 0)  return <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">EXPIRÉ</span>;
  if (daysLeft <= 7)  return <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">J-{daysLeft}</span>;
  if (daysLeft <= 15) return <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">J-{daysLeft}</span>;
  return <span className="px-1.5 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">J-{daysLeft}</span>;
};

export default function AdminFleet() {
  const [tab, setTab]         = useState('vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [zones, setZones]       = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [showModal, setModal]   = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [docForm, setDocForm]   = useState({ type: '', url: '', expiresAt: '' });
  const [showDocModal, setDocModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminApi.get('/fleet/vehicles'),
      adminApi.get('/fleet/drivers'),
      adminApi.get('/fleet/zones'),
      adminApi.get('/fleet/compliance-alerts'),
    ]).then(([v,d,z,a]) => {
      setVehicles(v||[]); setDrivers(d||[]); setZones(z||[]); setAlerts(a||[]);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setSelected(null); setForm({}); setModal(true); };
  const openEdit = (item) => { setSelected(item); setForm({ ...item }); setModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (tab === 'vehicles') {
        if (selected) await adminApi.patch(`/fleet/vehicles/${selected.id}`, form);
        else await adminApi.post('/fleet/vehicles', form);
      } else if (tab === 'drivers') {
        if (selected) await adminApi.patch(`/fleet/drivers/${selected.id}`, form);
        else await adminApi.post('/fleet/drivers', form);
      }
      setModal(false); load();
    } catch (e) { alert(e.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const addDoc = async () => {
    if (!docForm.type || !docForm.url) return;
    setSaving(true);
    try {
      if (showDocModal?.type === 'vehicle') {
        await adminApi.post(`/fleet/vehicles/${showDocModal.id}/docs`, docForm);
      } else {
        await adminApi.post(`/fleet/drivers/${showDocModal.id}/docs`, docForm);
      }
      setDocModal(null); setDocForm({ type:'', url:'', expiresAt:'' }); load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const updateZone = async (gov, mode) => {
    await adminApi.patch(`/fleet/zones/${encodeURIComponent(gov)}`, { mode }).catch(()=>{});
    load();
  };

  const TABS = [
    { id:'vehicles', label:'Véhicules', icon:'🚛' },
    { id:'drivers',  label:'Chauffeurs',icon:'👤' },
    { id:'zones',    label:'Zones livraison',icon:'🗺️' },
    { id:'alerts',   label:'Alertes conformité', icon:'⚠️', badge: alerts.filter(a=>a.severity==='EXPIRED'||a.severity==='CRITICAL').length },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">🚛 Flotte & Conformité</h2>
        <p className="text-slate-500 text-sm mt-0.5">Véhicules, chauffeurs, zones de couverture et alertes documents</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${tab===t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t.icon} {t.label}
            {t.badge > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Vehicles */}
      {tab === 'vehicles' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-400 text-sm">{vehicles.length} véhicule(s)</span>
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">+ Ajouter</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {vehicles.map(v => {
              const expiredDocs = v.docs?.filter(d => d.expiresAt && new Date(d.expiresAt) < new Date()) || [];
              const nearDocs = v.docs?.filter(d => { if (!d.expiresAt) return false; const days = Math.floor((new Date(d.expiresAt)-new Date())/(86400000)); return days >= 0 && days <= 30; }) || [];
              return (
                <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-white font-bold">{v.plate}</div>
                      <div className="text-slate-400 text-sm">{v.brand} {v.model} — {v.type}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expiredDocs.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">⚠️ Doc expiré</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${v.status==='ACTIVE'?'bg-green-500/20 text-green-400':v.status==='MAINTENANCE'?'bg-yellow-500/20 text-yellow-400':'bg-red-500/20 text-red-400'}`}>{STATUS_VEHICLE[v.status]||v.status}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-3">
                    <span>Cap. {v.capacityKg}kg</span><span>Vol. {v.capacityL}L</span><span>PTAC {v.ptacKg}kg</span>
                  </div>
                  {/* Docs */}
                  <div className="space-y-1 mb-3">
                    {(v.docs||[]).map(d => {
                      const days = d.expiresAt ? Math.floor((new Date(d.expiresAt)-new Date())/86400000) : null;
                      return (
                        <div key={d.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{d.type}</span>
                          <div className="flex items-center gap-2">
                            {days !== null ? <AlertBadge daysLeft={days} /> : <span className="text-slate-600">pas d'expiration</span>}
                            <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">📎</a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(v)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition">Modifier</button>
                    <button onClick={() => setDocModal({ type:'vehicle', id:v.id })} className="flex-1 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition">+ Document</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drivers */}
      {tab === 'drivers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-400 text-sm">{drivers.length} chauffeur(s)</span>
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">+ Ajouter</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {drivers.map(d => {
              const expiredDocs = d.docs?.filter(dd => dd.expiresAt && new Date(dd.expiresAt) < new Date()) || [];
              return (
                <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-white font-bold">{d.name}</div>
                      <div className="text-slate-400 text-sm">{d.phone}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expiredDocs.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">⚠️ Doc expiré</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${d.status==='ACTIVE'?'bg-green-500/20 text-green-400':d.status==='OFF'?'bg-yellow-500/20 text-yellow-400':'bg-red-500/20 text-red-400'}`}>{STATUS_DRIVER[d.status]||d.status}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-2">
                    <span>CIN: {d.cin}</span><span>Permis: {d.licenseNo} ({d.licenseType})</span>
                  </div>
                  {d.codBalance > 0 && <div className="text-orange-400 text-xs mb-2">💰 Solde COD: {new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(d.codBalance)} TND</div>}
                  <div className="space-y-1 mb-3">
                    {(d.docs||[]).map(dd => {
                      const days = dd.expiresAt ? Math.floor((new Date(dd.expiresAt)-new Date())/86400000) : null;
                      return (
                        <div key={dd.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{dd.type}</span>
                          {days !== null ? <AlertBadge daysLeft={days} /> : <span className="text-slate-600">—</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(d)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition">Modifier</button>
                    <button onClick={() => setDocModal({ type:'driver', id:d.id })} className="flex-1 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition">+ Document</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Zones */}
      {tab === 'zones' && (
        <div>
          <div className="text-slate-400 text-sm mb-4">Configurez le mode de livraison par gouvernorat. Cela influence le moteur de routage automatique.</div>
          <div className="grid md:grid-cols-3 gap-3">
            {zones.map(z => (
              <div key={z.governorate} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-200 text-sm font-medium">{z.governorate}</span>
                <select value={z.mode} onChange={e => updateZone(z.governorate, e.target.value)}
                  className={`text-xs rounded-lg px-2 py-1 border border-transparent cursor-pointer ${ZONE_COLORS[z.mode]}`}
                  style={{ background: 'transparent' }}>
                  {Object.entries(ZONE_MODES).map(([k,v]) => <option key={k} value={k} className="bg-slate-900 text-slate-200">{v}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">✅ Aucune alerte de conformité</div>
          ) : alerts.map((a, i) => (
            <div key={i} className={`bg-slate-900 border rounded-xl p-4 flex items-center justify-between ${a.severity==='EXPIRED'?'border-red-500/30':a.severity==='CRITICAL'?'border-orange-500/30':a.severity==='WARNING'?'border-yellow-500/30':'border-slate-800'}`}>
              <div>
                <div className="text-white text-sm font-medium">{a.entityName} — <span className="text-slate-400">{a.docType}</span></div>
                <div className="text-slate-500 text-xs mt-0.5">Expire le {new Date(a.expiresAt).toLocaleDateString('fr-TN')}</div>
              </div>
              <AlertBadge daysLeft={a.daysLeft} />
            </div>
          ))}
        </div>
      )}

      {/* Modal créer/éditer véhicule ou chauffeur */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setModal(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold mb-4">{selected ? 'Modifier' : 'Créer'} {tab==='vehicles'?'un véhicule':'un chauffeur'}</h3>
            {tab === 'vehicles' ? (
              <div className="space-y-3">
                <input placeholder="Immatriculation *" value={form.plate||''} onChange={e=>setForm(f=>({...f,plate:e.target.value}))} className={inputCls} />
                <input placeholder="Marque *" value={form.brand||''} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} className={inputCls} />
                <input placeholder="Modèle" value={form.model||''} onChange={e=>setForm(f=>({...f,model:e.target.value}))} className={inputCls} />
                <select value={form.type||'VL'} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className={inputCls}>
                  {['VL','VUL','PL','MOTO'].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder="PTAC (kg)" value={form.ptacKg||''} onChange={e=>setForm(f=>({...f,ptacKg:e.target.value}))} className={inputCls} />
                  <input type="number" placeholder="Cap. kg" value={form.capacityKg||''} onChange={e=>setForm(f=>({...f,capacityKg:e.target.value}))} className={inputCls} />
                  <input type="number" placeholder="Cap. L" value={form.capacityL||''} onChange={e=>setForm(f=>({...f,capacityL:e.target.value}))} className={inputCls} />
                </div>
                {selected && <select value={form.status||'ACTIVE'} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className={inputCls}>
                  {['ACTIVE','MAINTENANCE','OUT_OF_SERVICE'].map(s=><option key={s} value={s}>{STATUS_VEHICLE[s]}</option>)}
                </select>}
              </div>
            ) : (
              <div className="space-y-3">
                <input placeholder="Nom complet *" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inputCls} />
                <input placeholder="Téléphone *" value={form.phone||''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={inputCls} />
                <input placeholder="CIN *" value={form.cin||''} onChange={e=>setForm(f=>({...f,cin:e.target.value}))} className={inputCls} />
                <input placeholder="N° Permis *" value={form.licenseNo||''} onChange={e=>setForm(f=>({...f,licenseNo:e.target.value}))} className={inputCls} />
                <select value={form.licenseType||'B'} onChange={e=>setForm(f=>({...f,licenseType:e.target.value}))} className={inputCls}>
                  {['B','C','EC'].map(t=><option key={t} value={t}>Permis {t}</option>)}
                </select>
                <input type="password" placeholder="Mot de passe PWA" value={form.password||''} onChange={e=>setForm(f=>({...f,password:e.target.value}))} className={inputCls} />
                {selected && <select value={form.status||'ACTIVE'} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className={inputCls}>
                  {['ACTIVE','OFF','SUSPENDED'].map(s=><option key={s} value={s}>{STATUS_DRIVER[s]}</option>)}
                </select>}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setModal(false)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition">Annuler</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">{saving?'...':'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajout document */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setDocModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold mb-4">Ajouter un document</h3>
            <div className="space-y-3">
              <select value={docForm.type} onChange={e=>setDocForm(f=>({...f,type:e.target.value}))} className={inputCls}>
                <option value="">— Type de document —</option>
                {(showDocModal.type==='vehicle' ? DOC_TYPES_V : DOC_TYPES_D).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="URL du document (PDF/image)" value={docForm.url} onChange={e=>setDocForm(f=>({...f,url:e.target.value}))} className={inputCls} />
              <div>
                <label className="text-slate-500 text-xs block mb-1">Date d'expiration (optionnel)</label>
                <input type="date" value={docForm.expiresAt} onChange={e=>setDocForm(f=>({...f,expiresAt:e.target.value}))} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setDocModal(null)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm transition">Annuler</button>
              <button onClick={addDoc} disabled={saving} className="flex-1 py-2 bg-blue-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">{saving?'...':'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
