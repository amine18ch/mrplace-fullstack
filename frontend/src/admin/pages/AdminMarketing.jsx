import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

export default function AdminMarketing() {
  const { can } = useAdmin();
  const [tab, setTab] = useState('promos');
  const [promos, setPromos] = useState([]);
  const [banners, setBanners] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Forms
  const [promoForm, setPromoForm] = useState({ code: '', discount: '', isActive: true });
  const [bannerForm, setBannerForm] = useState({ title: '', imageUrl: '', linkUrl: '', position: 'HOME_HERO', isActive: true, sortOrder: 0 });
  const [flashForm, setFlashForm] = useState({ name: '', startAt: '', endAt: '', discountPct: '', isActive: true });
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showFlashForm, setShowFlashForm] = useState(false);
  const [editBanner, setEditBanner] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      adminApi.get('/marketing/promo-codes'),
      adminApi.get('/marketing/banners'),
      adminApi.get('/marketing/flash-sales'),
    ]).then(([p, b, f]) => { setPromos(p); setBanners(b); setFlashSales(f); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const withLoading = async (fn) => {
    setActionLoading(true);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    await withLoading(async () => {
      await adminApi.post('/marketing/promo-codes', {
        ...promoForm,
        code: promoForm.code.toUpperCase(),
        discount: parseFloat(promoForm.discount) / 100
      });
      setPromoForm({ code: '', discount: '', isActive: true });
      setShowPromoForm(false);
      loadAll();
    });
  };

  const handleTogglePromo = async (id) => {
    await withLoading(async () => {
      await adminApi.patch(`/marketing/promo-codes/${id}/toggle`, {});
      loadAll();
    });
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('Supprimer ce code promo ?')) return;
    await withLoading(async () => {
      await adminApi.delete(`/marketing/promo-codes/${id}`);
      loadAll();
    });
  };

  const handleCreateBanner = async (e) => {
    e.preventDefault();
    await withLoading(async () => {
      await adminApi.post('/marketing/banners', bannerForm);
      setBannerForm({ title: '', imageUrl: '', linkUrl: '', position: 'HOME_HERO', isActive: true, sortOrder: 0 });
      setShowBannerForm(false);
      loadAll();
    });
  };

  const handleUpdateBanner = async (e) => {
    e.preventDefault();
    if (!editBanner) return;
    await withLoading(async () => {
      await adminApi.patch(`/marketing/banners/${editBanner.id}`, editBanner);
      setEditBanner(null);
      loadAll();
    });
  };

  const handleToggleBanner = async (id) => {
    await withLoading(async () => {
      await adminApi.patch(`/marketing/banners/${id}/toggle`, {});
      loadAll();
    });
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Supprimer cette bannière ?')) return;
    await withLoading(async () => {
      await adminApi.delete(`/marketing/banners/${id}`);
      loadAll();
    });
  };

  const handleCreateFlash = async (e) => {
    e.preventDefault();
    await withLoading(async () => {
      await adminApi.post('/marketing/flash-sales', flashForm);
      setFlashForm({ name: '', startAt: '', endAt: '', discountPct: '', isActive: true });
      setShowFlashForm(false);
      loadAll();
    });
  };

  const handleDeleteFlash = async (id) => {
    if (!window.confirm('Supprimer cette vente flash ?')) return;
    await withLoading(async () => {
      await adminApi.delete(`/marketing/flash-sales/${id}`);
      loadAll();
    });
  };

  const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500";

  if (loading) return <div className="p-8 text-slate-500 text-center">Chargement...</div>;

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {[
          { id: 'promos', label: `Codes Promo (${promos.length})` },
          { id: 'banners', label: `Bannières (${banners.length})` },
          { id: 'flash', label: `Ventes Flash (${flashSales.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PROMO CODES */}
      {tab === 'promos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-300 font-medium">Codes promotionnels</h3>
            {can('marketing.write') && (
              <button onClick={() => setShowPromoForm(!showPromoForm)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                + Nouveau code
              </button>
            )}
          </div>

          {showPromoForm && can('marketing.write') && (
            <form onSubmit={handleCreatePromo} className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Code (majuscules auto)</label>
                  <input value={promoForm.code} onChange={e => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                    placeholder="SUMMER25" required className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Réduction (%)</label>
                  <input value={promoForm.discount} onChange={e => setPromoForm({...promoForm, discount: e.target.value})}
                    placeholder="25" type="number" min="0" max="100" step="1" required className={inputCls} />
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                    <input type="checkbox" checked={promoForm.isActive} onChange={e => setPromoForm({...promoForm, isActive: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                    Actif
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={actionLoading} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg">Créer</button>
                <button type="button" onClick={() => setShowPromoForm(false)} className="bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-600">Annuler</button>
              </div>
            </form>
          )}

          {promos.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucun code promo</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Code', 'Réduction', 'Utilisations', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {promos.map(p => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-blue-400 font-bold">{p.code}</td>
                      <td className="px-4 py-3 text-slate-200">{(p.discount * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-slate-400">{p.uses || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                          {p.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {can('marketing.write') && (
                          <div className="flex gap-2">
                            <button onClick={() => handleTogglePromo(p.id)} disabled={actionLoading} className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-orange-500/10 disabled:opacity-60">
                              {p.isActive ? 'Désactiver' : 'Activer'}
                            </button>
                            <button onClick={() => handleDeletePromo(p.id)} disabled={actionLoading} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 disabled:opacity-60">Supprimer</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* BANNERS */}
      {tab === 'banners' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-300 font-medium">Bannières</h3>
            {can('marketing.write') && (
              <button onClick={() => setShowBannerForm(!showBannerForm)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                + Nouvelle bannière
              </button>
            )}
          </div>

          {showBannerForm && can('marketing.write') && (
            <form onSubmit={handleCreateBanner} className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Titre</label>
                  <input value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} placeholder="Titre" required className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Image (emoji ou URL)</label>
                  <input value={bannerForm.imageUrl} onChange={e => setBannerForm({...bannerForm, imageUrl: e.target.value})} placeholder="🎉 ou https://..." required className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Lien (optionnel)</label>
                  <input value={bannerForm.linkUrl} onChange={e => setBannerForm({...bannerForm, linkUrl: e.target.value})} placeholder="/category/..." className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Position</label>
                  <select value={bannerForm.position} onChange={e => setBannerForm({...bannerForm, position: e.target.value})} className={inputCls}>
                    <option value="HOME_HERO">Hero accueil</option>
                    <option value="HOME_BANNER">Bannière accueil</option>
                    <option value="CATEGORY_TOP">Top catégorie</option>
                    <option value="HOME_PROMO">Promo accueil</option>
                    <option value="SIDEBAR">Sidebar</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Ordre d'affichage</label>
                  <input value={bannerForm.sortOrder} onChange={e => setBannerForm({...bannerForm, sortOrder: parseInt(e.target.value) || 0})} type="number" min="0" className={inputCls} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                    <input type="checkbox" checked={bannerForm.isActive} onChange={e => setBannerForm({...bannerForm, isActive: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={actionLoading} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg">Créer</button>
                <button type="button" onClick={() => setShowBannerForm(false)} className="bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-600">Annuler</button>
              </div>
            </form>
          )}

          {banners.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucune bannière</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {banners.map(b => (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 h-24 flex items-center justify-center text-5xl relative">
                    {b.imageUrl?.startsWith('http') ? (
                      <img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover" />
                    ) : b.imageUrl || '🖼️'}
                    <span className="absolute top-2 left-2 text-xs bg-slate-900/70 text-slate-300 px-2 py-0.5 rounded">{b.position}</span>
                  </div>
                  <div className="p-4">
                    <div className="text-slate-200 font-medium text-sm mb-1">{b.title}</div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500 text-xs">Ordre: {b.sortOrder}</span>
                      <button
                        onClick={() => can('marketing.write') && handleToggleBanner(b.id)}
                        disabled={!can('marketing.write') || actionLoading}
                        className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${b.isActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-slate-700 text-slate-500 hover:bg-slate-600'} disabled:cursor-not-allowed`}>
                        {b.isActive ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {b.linkUrl && <div className="text-slate-600 text-xs mb-3 truncate">{b.linkUrl}</div>}
                    {can('marketing.write') && (
                      <div className="flex gap-2">
                        <button onClick={() => setEditBanner({ ...b })}
                          className="flex-1 text-xs text-blue-400 hover:text-blue-300 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors">
                          ✏️ Modifier
                        </button>
                        <button onClick={() => handleDeleteBanner(b.id)} disabled={actionLoading}
                          className="flex-1 text-xs text-red-400 hover:text-red-300 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-60">
                          🗑️ Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FLASH SALES */}
      {tab === 'flash' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-300 font-medium">Ventes flash</h3>
            {can('marketing.write') && (
              <button onClick={() => setShowFlashForm(!showFlashForm)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                + Nouvelle vente flash
              </button>
            )}
          </div>

          {showFlashForm && can('marketing.write') && (
            <form onSubmit={handleCreateFlash} className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Nom</label>
                  <input value={flashForm.name} onChange={e => setFlashForm({...flashForm, name: e.target.value})} placeholder="Ex: Black Friday" required className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Remise (%)</label>
                  <input value={flashForm.discountPct} onChange={e => setFlashForm({...flashForm, discountPct: e.target.value})} type="number" min="1" max="99" placeholder="30" required className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Début</label>
                  <input value={flashForm.startAt} onChange={e => setFlashForm({...flashForm, startAt: e.target.value})} type="datetime-local" required className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Fin</label>
                  <input value={flashForm.endAt} onChange={e => setFlashForm({...flashForm, endAt: e.target.value})} type="datetime-local" required className={inputCls} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                    <input type="checkbox" checked={flashForm.isActive} onChange={e => setFlashForm({...flashForm, isActive: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                    Actif
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={actionLoading} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg">Créer</button>
                <button type="button" onClick={() => setShowFlashForm(false)} className="bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-600">Annuler</button>
              </div>
            </form>
          )}

          {flashSales.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucune vente flash</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Nom', 'Remise', 'Début', 'Fin', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flashSales.map(f => {
                    const now = new Date();
                    const start = new Date(f.startAt);
                    const end = new Date(f.endAt);
                    const isLive = f.isActive && now >= start && now <= end;
                    const isOver = now > end;
                    const statusLabel = isLive ? 'En cours' : isOver ? 'Terminé' : f.isActive ? 'Planifié' : 'Inactif';
                    const statusColor = isLive ? 'bg-green-500/20 text-green-400' : isOver ? 'bg-slate-700 text-slate-500' : f.isActive ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-500';
                    return (
                      <tr key={f.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-200 font-medium">{f.name}</td>
                        <td className="px-4 py-3 text-orange-400 font-bold">{f.discountPct}%</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(f.startAt).toLocaleString('fr-TN')}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(f.endAt).toLocaleString('fr-TN')}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                        </td>
                        <td className="px-4 py-3">
                          {can('marketing.write') && (
                            <button onClick={() => handleDeleteFlash(f.id)} disabled={actionLoading} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 disabled:opacity-60">Supprimer</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Banner Modal */}
      {editBanner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Modifier la bannière</h3>
              <button onClick={() => setEditBanner(null)} className="text-slate-400 hover:text-slate-200 text-xl">×</button>
            </div>
            <form onSubmit={handleUpdateBanner}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Titre</label>
                  <input value={editBanner.title} onChange={e => setEditBanner({...editBanner, title: e.target.value})} required className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Image</label>
                  <input value={editBanner.imageUrl || ''} onChange={e => setEditBanner({...editBanner, imageUrl: e.target.value})} required className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Lien</label>
                  <input value={editBanner.linkUrl || ''} onChange={e => setEditBanner({...editBanner, linkUrl: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Position</label>
                  <select value={editBanner.position} onChange={e => setEditBanner({...editBanner, position: e.target.value})} className={inputCls}>
                    <option value="HOME_HERO">Hero accueil</option>
                    <option value="HOME_BANNER">Bannière accueil</option>
                    <option value="CATEGORY_TOP">Top catégorie</option>
                    <option value="HOME_PROMO">Promo accueil</option>
                    <option value="SIDEBAR">Sidebar</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Ordre</label>
                  <input value={editBanner.sortOrder} onChange={e => setEditBanner({...editBanner, sortOrder: parseInt(e.target.value) || 0})} type="number" min="0" className={inputCls} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                    <input type="checkbox" checked={editBanner.isActive} onChange={e => setEditBanner({...editBanner, isActive: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditBanner(null)} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
                <button type="submit" disabled={actionLoading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                  {actionLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
