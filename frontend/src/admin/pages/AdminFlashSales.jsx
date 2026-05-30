import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminClient';
import { fmt } from '../../components/ui';

const STATUS_COLORS = {
  active:   'bg-green-500/20 text-green-400 border-green-500/30',
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  expired:  'bg-slate-700 text-slate-500 border-slate-600',
  inactive: 'bg-slate-700 text-slate-500 border-slate-600',
};
const STATUS_LABELS = { active:'En cours', upcoming:'À venir', expired:'Terminée', inactive:'Désactivée' };

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600";

const toLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// Composant formulaire au niveau module (évite perte de focus)
const FlashForm = ({ form, set, productSearch, setProductSearch, searchResults, searching, selectedProducts, toggleProduct, removeProduct, modal, save, saving, setModal, error }) => (
  <div className="p-5 space-y-4">
    {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}

    <div>
      <label className="text-slate-400 text-xs font-medium mb-1.5 block">Nom de la vente flash *</label>
      <input value={form.name} onChange={e=>set('name',e.target.value)} className={inputCls}
        placeholder="Ex: OFFRES FLASH Weekend, Soldes d'été..." />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Début *</label>
        <input type="datetime-local" value={form.startAt} onChange={e=>set('startAt',e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Fin *</label>
        <input type="datetime-local" value={form.endAt} onChange={e=>set('endAt',e.target.value)} className={inputCls} />
      </div>
    </div>

    <div>
      <label className="text-slate-400 text-xs font-medium mb-1.5 block">
        Réduction flash (%) *
        <span className="text-slate-600 font-normal ml-1">— appliquée sur le prix actuel des produits sélectionnés</span>
      </label>
      <div className="flex items-center gap-3">
        <input type="range" min="5" max="90" step="5" value={form.discountPct} onChange={e=>set('discountPct',e.target.value)}
          className="flex-1 accent-red-500" />
        <span className="text-red-400 font-extrabold text-xl w-16 text-center">-{form.discountPct}%</span>
      </div>
      <div className="flex justify-between text-slate-700 text-xs mt-1">
        <span>5%</span><span>45%</span><span>90%</span>
      </div>
    </div>

    {/* Sélection des produits */}
    <div>
      <label className="text-slate-400 text-xs font-medium mb-2 block">
        Produits en vente flash
        <span className="text-slate-600 font-normal ml-1">({selectedProducts.length} sélectionné{selectedProducts.length>1?'s':''})</span>
      </label>

      {/* Produits déjà sélectionnés */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedProducts.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
              <span className="text-base">{p.images?.[0] || '📦'}</span>
              <div className="min-w-0">
                <div className="text-slate-300 text-xs font-medium truncate max-w-[120px]">{p.title}</div>
                <div className="text-slate-500 text-[10px]">
                  {fmt(p.price)} → <span className="text-red-400">{fmt(p.price * (1 - form.discountPct/100))}</span>
                </div>
              </div>
              <button onClick={()=>removeProduct(p.id)} className="text-slate-600 hover:text-red-400 ml-1 text-lg leading-none">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Recherche */}
      <input value={productSearch} onChange={e=>setProductSearch(e.target.value)}
        placeholder="Rechercher un produit à ajouter..."
        className={inputCls} />

      {/* Résultats */}
      {searching && <div className="text-slate-500 text-xs mt-2 text-center py-3">Recherche...</div>}
      {!searching && searchResults.length > 0 && (
        <div className="mt-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
          {searchResults.map(p => {
            const selected = selectedProducts.some(s => s.id === p.id);
            const img = p.images?.[0] || '📦';
            const isUrl = img.startsWith('/') || img.startsWith('http');
            return (
              <button key={p.id} onClick={()=>toggleProduct(p)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition border-b border-slate-800/50 last:border-0 ${selected ? 'bg-blue-500/10' : ''}`}>
                <div className="w-8 h-8 bg-slate-800 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                  {isUrl ? <img src={img} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">{img}</span>}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-slate-200 text-xs font-medium truncate">{p.title}</div>
                  <div className="text-slate-500 text-[10px]">{p.brand} · {p.seller?.name} · {fmt(p.price)}</div>
                </div>
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${selected ? 'bg-blue-600' : 'border border-slate-600'}`}>
                  {selected && <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>

    <div className="flex gap-3 pt-2">
      <button type="button" onClick={()=>setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm">Annuler</button>
      <button type="button" onClick={save} disabled={saving || !form.name || !form.startAt || !form.endAt}
        className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
        {saving ? '...' : modal === 'create' ? '⚡ Créer la vente flash' : 'Enregistrer'}
      </button>
    </div>
  </div>
);

export default function AdminFlashSales() {
  const [sales, setSales]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({ name:'', startAt:'', endAt:'', discountPct:'30' });
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [selectedProducts, setSelected] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [tick, setTick]         = useState(0);

  // Countdown live
  useEffect(() => { const t = setInterval(()=>setTick(n=>n+1), 1000); return ()=>clearInterval(t); }, []);

  const load = () => {
    setLoading(true);
    adminApi.get('/marketing/flash-sales').then(setSales).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  // Recherche produits
  useEffect(() => {
    if (!modal) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await adminApi.get(`/marketing/flash-sales/products/search?q=${encodeURIComponent(productSearch)}`);
        setSearchResults(res);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, modal]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const flash = (msg, err=false) => {
    if (err) setError(msg); else setSuccess(msg);
    setTimeout(()=>{ setError(''); setSuccess(''); }, 3000);
  };

  const openCreate = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 24 * 3600000);
    setForm({ name:'OFFRES FLASH', startAt: toLocal(now.toISOString()), endAt: toLocal(end.toISOString()), discountPct:'30' });
    setSelected([]); setProductSearch(''); setSearchResults([]);
    setEditId(null); setModal('create'); setError('');
  };

  const openEdit = (s) => {
    setForm({ name:s.name, startAt:toLocal(s.startAt), endAt:toLocal(s.endAt), discountPct:String(s.discountPct) });
    setSelected(s.products || []);
    setProductSearch(''); setSearchResults([]);
    setEditId(s.id); setModal('edit'); setError('');
  };

  const toggleProduct = (p) => {
    setSelected(sel => sel.some(s=>s.id===p.id) ? sel.filter(s=>s.id!==p.id) : [...sel, p]);
  };
  const removeProduct = (id) => setSelected(sel => sel.filter(s=>s.id!==id));

  const save = async () => {
    if (!form.name) return setError('Nom obligatoire');
    if (!form.startAt || !form.endAt) return setError('Dates obligatoires');
    if (new Date(form.endAt) <= new Date(form.startAt)) return setError('La date de fin doit être après la date de début');
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        startAt: new Date(form.startAt).toISOString(),
        endAt:   new Date(form.endAt).toISOString(),
        discountPct: parseInt(form.discountPct),
        productIds: selectedProducts.map(p=>p.id),
      };
      if (modal === 'create') await adminApi.post('/marketing/flash-sales', payload);
      else await adminApi.put(`/marketing/flash-sales/${editId}`, payload);
      flash(modal === 'create' ? 'Vente flash créée ✓' : 'Mise à jour ✓');
      setModal(null); load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const toggle = async (s) => {
    try { await adminApi.patch(`/marketing/flash-sales/${s.id}/toggle`, {}); load(); }
    catch (e) { flash(e.message, true); }
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer cette vente flash ?')) return;
    try { await adminApi.delete(`/marketing/flash-sales/${id}`); flash('Supprimée ✓'); load(); }
    catch (e) { flash(e.message, true); }
  };

  const getCountdown = (endAt) => {
    const diff = Math.max(0, new Date(endAt) - new Date());
    if (!diff) return 'Terminée';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  };

  const fmtDate = (d) => new Date(d).toLocaleString('fr-TN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            ⚡ Offres Flash
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Créez des ventes flash avec compte à rebours sur la homepage</p>
        </div>
        <button onClick={openCreate} className="bg-red-500 hover:bg-red-600 text-white text-sm px-5 py-2.5 rounded-xl font-medium flex items-center gap-2">
          ⚡ Nouvelle vente flash
        </button>
      </div>

      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {loading ? (
        <div className="text-slate-500 text-center py-16">Chargement...</div>
      ) : sales.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
          <div className="text-5xl mb-3">⚡</div>
          <div className="text-slate-400 font-medium">Aucune vente flash</div>
          <div className="text-slate-600 text-sm mt-1 mb-5">Créez des offres temporaires avec compte à rebours</div>
          <button onClick={openCreate} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">⚡ Créer une vente flash</button>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map(s => (
            <div key={s.id} className={`bg-slate-900 border rounded-xl overflow-hidden ${s.status==='active' ? 'border-red-500/40' : 'border-slate-800'}`}>
              {/* Header */}
              <div className={`px-5 py-3 flex items-center justify-between flex-wrap gap-3 ${s.status==='active' ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10' : ''}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-white font-bold">{s.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                  <span className="text-red-400 font-bold">-{s.discountPct}%</span>
                  <span className="text-slate-500 text-xs">{s.products?.length || 0} produit(s)</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>openEdit(s)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition">Modifier</button>
                  <button onClick={()=>toggle(s)} className={`px-3 py-1.5 text-xs rounded-lg transition ${s.isActive ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
                    {s.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                  <button onClick={()=>del(s.id)} className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs rounded-lg transition">Supprimer</button>
                </div>
              </div>

              {/* Infos dates + countdown */}
              <div className="px-5 py-3 border-t border-slate-800 flex items-center gap-6 flex-wrap">
                <div className="text-slate-500 text-xs">
                  <span className="text-slate-400">Début :</span> {fmtDate(s.startAt)}
                </div>
                <div className="text-slate-500 text-xs">
                  <span className="text-slate-400">Fin :</span> {fmtDate(s.endAt)}
                </div>
                {s.status === 'active' && (
                  <div className="flex items-center gap-2 text-red-400 font-mono text-sm font-bold">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {getCountdown(s.endAt)}
                  </div>
                )}
                {s.status === 'upcoming' && (
                  <div className="text-blue-400 text-xs">Démarre dans {getCountdown(s.startAt)}</div>
                )}
              </div>

              {/* Produits */}
              {s.products?.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-800">
                  <div className="flex gap-2 flex-wrap">
                    {s.products.slice(0, 6).map(p => {
                      const img = p.images?.[0] || '📦';
                      const isUrl = img.startsWith?.('/') || img.startsWith?.('http');
                      return (
                        <div key={p.id} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
                          <div className="w-7 h-7 rounded overflow-hidden flex items-center justify-center bg-slate-700 flex-shrink-0">
                            {isUrl ? <img src={img} alt="" className="w-full h-full object-cover" /> : <span className="text-base">{img}</span>}
                          </div>
                          <div>
                            <div className="text-slate-300 text-xs truncate max-w-[100px]">{p.title}</div>
                            <div className="text-slate-500 text-[10px]">
                              {fmt(p.price)} → <span className="text-red-400">{fmt(p.price*(1-s.discountPct/100))}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {s.products.length > 6 && (
                      <div className="flex items-center px-3 text-slate-500 text-xs">+{s.products.length-6} autres</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={()=>setModal(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                ⚡ {modal === 'create' ? 'Nouvelle vente flash' : 'Modifier la vente flash'}
              </h3>
              <button onClick={()=>setModal(null)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded text-xl">×</button>
            </div>
            <FlashForm
              form={form} set={set}
              productSearch={productSearch} setProductSearch={setProductSearch}
              searchResults={searchResults} searching={searching}
              selectedProducts={selectedProducts} toggleProduct={toggleProduct} removeProduct={removeProduct}
              modal={modal} save={save} saving={saving} setModal={setModal} error={error}
            />
          </div>
        </div>
      )}
    </div>
  );
}
