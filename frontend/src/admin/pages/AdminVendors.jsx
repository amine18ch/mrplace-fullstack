import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const BADGE_COLORS = {
  'Top Seller':'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Premium':   'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Gold':      'bg-yellow-600/20 text-yellow-300 border-yellow-600/30',
  'Silver':    'bg-slate-400/20 text-slate-300 border-slate-400/30',
  'Bronze':    'bg-orange-800/20 text-orange-400 border-orange-800/30',
  'Nouveau':   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Suspendu':  'bg-red-500/20 text-red-400 border-red-500/30',
};
const STATUS_COLORS = {
  APPROVED:  'bg-green-500/20 text-green-400',
  PENDING:   'bg-yellow-500/20 text-yellow-400',
  REJECTED:  'bg-red-500/20 text-red-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
};
const BADGE_OPTIONS = ['Nouveau','Bronze','Silver','Gold','Premium','Top Seller'];
const EMOJI_OPTIONS = ['🏪','💻','👗','🏠','💄','⚽','🧸','🛒','🚗','📱','🍕','🎮','📚','🌿','💎'];

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div
      className={`bg-slate-800 rounded-xl border border-slate-700 shadow-2xl ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} max-h-[90vh] overflow-y-auto`}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800">
        <h3 className="text-white font-semibold">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 transition-colors">×</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children, required }) => (
  <div>
    <label className="text-slate-400 text-xs font-medium mb-1.5 block">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600";

export default function AdminVendors({ initialTab, vendorId }) {
  const { can } = useAdmin();
  const [tab, setTab] = useState(initialTab || 'all');
  const [vendors, setVendors]       = useState([]);
  const [applications, setApps]     = useState([]);
  const [commissions, setComms]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [actionLoading, setActLoad] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  // Modals
  const [createModal, setCreateModal]   = useState(false);
  const [detailVendor, setDetailVendor] = useState(null);
  const [editVendor, setEditVendor]     = useState(null);
  const [rejectModal, setRejectModal]   = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [levelModal, setLevelModal]     = useState(null);
  const [selectedLevel, setLevel]       = useState('Nouveau');
  const [commEditId, setCommEditId]     = useState(null);
  const [commEditRate, setCommEditRate] = useState('');
  const [newCommForm, setNewComm]       = useState({ type:'GLOBAL', rate:'', sellerId:'', categoryId:'' });

  // Create/Edit form
  const emptyForm = { name:'', slug:'', logo:'🏪', color:'#2563EB', location:'Tunis, Tunisie', joinedYear: new Date().getFullYear(), responseTime:'sous 24 heures', badge:'Nouveau' };
  const [form, setForm] = useState(emptyForm);

  // Load data
  const loadVendors = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 20 });
    if (search) p.append('search', search);
    if (statusFilter) p.append('status', statusFilter);
    adminApi.get(`/vendors?${p}`)
      .then(d => { setVendors(d.sellers || []); setTotal(d.total || 0); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  const loadApps  = useCallback(() => { adminApi.get('/vendors/applications').then(setApps).catch(()=>{}); }, []);
  const loadComms = useCallback(() => {
    if (can('finance.read') || can('finance.write')) adminApi.get('/vendors/commissions').then(setComms).catch(()=>{});
  }, [can]);

  useEffect(() => { loadVendors(); }, [loadVendors]);
  useEffect(() => { loadApps(); loadComms(); }, [loadApps, loadComms]);
  useEffect(() => { if (vendorId) adminApi.get(`/vendors/${vendorId}`).then(setDetailVendor).catch(()=>{}); }, [vendorId]);

  const flash = (msg, isError=false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const act = async (fn, successMsg) => {
    setActLoad(true); setError('');
    try { await fn(); flash(successMsg || 'Succès'); }
    catch (e) { flash(e.message, true); }
    finally { setActLoad(false); }
  };

  // CRUD handlers
  const handleCreate = () => act(async () => {
    await adminApi.post('/vendors', { ...form, joinedYear: parseInt(form.joinedYear) });
    setCreateModal(false); setForm(emptyForm); loadVendors(); loadApps();
  }, 'Vendeur créé avec succès');

  const handleEdit = () => act(async () => {
    // Pour l'instant on met à jour le badge et le slug
    await adminApi.patch(`/vendors/${editVendor.id}/level`, { badge: form.badge });
    setEditVendor(null); loadVendors();
  }, 'Vendeur mis à jour');

  const handleApprove = (id) => act(async () => {
    await adminApi.patch(`/vendors/${id}/approve`, {});
    loadVendors(); loadApps();
  }, 'Vendeur approuvé ✓');

  const handleReject = () => act(async () => {
    await adminApi.patch(`/vendors/${rejectModal}/reject`, { reason: rejectReason });
    setRejectModal(null); setRejectReason(''); loadVendors(); loadApps();
  }, 'Vendeur rejeté');

  const handleSuspend = () => act(async () => {
    await adminApi.patch(`/vendors/${suspendModal}/suspend`, { reason: suspendReason });
    setSuspendModal(null); setSuspendReason(''); loadVendors();
  }, 'Vendeur suspendu');

  const handleReactivate = (id) => act(async () => {
    await adminApi.patch(`/vendors/${id}/reactivate`, {});
    loadVendors();
  }, 'Vendeur réactivé ✓');

  const handleSetLevel = () => act(async () => {
    await adminApi.patch(`/vendors/${levelModal}/level`, { badge: selectedLevel });
    setLevelModal(null); loadVendors();
  }, 'Niveau mis à jour');

  const handleUpdateComm = (id) => act(async () => {
    await adminApi.patch(`/vendors/commissions/${id}`, { rate: parseFloat(commEditRate)/100 });
    setCommEditId(null); loadComms();
  }, 'Commission mise à jour');

  const handleCreateComm = () => act(async () => {
    await adminApi.post('/vendors/commissions', {
      type: newCommForm.type, rate: parseFloat(newCommForm.rate)/100,
      sellerId: newCommForm.sellerId || undefined, categoryId: newCommForm.categoryId || undefined, isActive: true
    });
    setNewComm({ type:'GLOBAL', rate:'', sellerId:'', categoryId:'' }); loadComms();
  }, 'Commission créée');

  const handleDeleteComm = (id) => {
    if (!window.confirm('Supprimer cette commission ?')) return;
    act(async () => { await adminApi.delete(`/vendors/commissions/${id}`); loadComms(); }, 'Commission supprimée');
  };

  const tabs = [
    { id:'all',          label:`Vendeurs (${total})` },
    { id:'applications', label:`Candidatures KYC (${(applications.filter(a=>a.status==='PENDING')).length})` },
    ...(can('finance.read') ? [{ id:'commissions', label:'Commissions' }] : []),
  ];

  return (
    <div className="p-6 max-w-7xl">
      {/* Alerts */}
      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {/* Tabs + Action */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-0">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab===t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {can('vendors.write') && tab === 'all' && (
          <button onClick={() => { setForm(emptyForm); setCreateModal(true); }}
            className="mb-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium">
            + Nouveau vendeur
          </button>
        )}
      </div>

      {/* ─── TAB ALL VENDORS ─── */}
      {tab === 'all' && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par nom ou localisation..."
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-72" />
            <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="Suspendu">Suspendus</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-500 text-sm">Chargement des vendeurs...</div>
            </div>
          ) : vendors.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
              <div className="text-5xl mb-3">🏪</div>
              <div className="text-slate-400 font-medium mb-1">Aucun vendeur trouvé</div>
              <div className="text-slate-600 text-sm mb-4">
                {search ? `Aucun résultat pour "${search}"` : 'Commencez par créer votre premier vendeur'}
              </div>
              {can('vendors.write') && !search && (
                <button onClick={() => { setForm(emptyForm); setCreateModal(true); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-lg">
                  + Créer un vendeur
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80">
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Vendeur</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Localisation</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Badge / Niveau</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Rating</th>
                    <th className="text-center px-4 py-3 text-slate-500 text-xs font-medium">Produits</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Statut KYC</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => {
                          adminApi.get(`/vendors/${v.id}`).then(setDetailVendor).catch(()=>{});
                        }} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl"
                            style={{ background: v.color || '#2563EB' }}>
                            {v.logo}
                          </div>
                          <div>
                            <div className="text-slate-200 font-medium text-sm">{v.name}</div>
                            <div className="text-slate-600 text-xs">/{v.slug}</div>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{v.location}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${BADGE_COLORS[v.badge] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                          {v.badge || 'Nouveau'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-yellow-400 text-xs">★</span>
                        <span className="text-slate-300 text-xs ml-1">{v.rating}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-center text-sm">{v._count?.products ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${v.application ? STATUS_COLORS[v.application.status] : 'bg-slate-700 text-slate-500'}`}>
                          {v.application?.status || 'NON SOUMIS'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button onClick={() => adminApi.get(`/vendors/${v.id}`).then(setDetailVendor).catch(()=>{})}
                            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10 transition-colors">
                            Détail
                          </button>
                          {can('vendors.write') && (
                            <>
                              {v.application?.status !== 'APPROVED' && (
                                <button onClick={() => handleApprove(v.id)} disabled={actionLoading}
                                  className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-500/10 disabled:opacity-50 transition-colors">
                                  ✓ Approuver
                                </button>
                              )}
                              <button onClick={() => { setLevelModal(v.id); setLevel(v.badge || 'Nouveau'); }}
                                className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-700 transition-colors">
                                Niveau
                              </button>
                              {v.badge !== 'Suspendu' ? (
                                <button onClick={() => { setSuspendModal(v.id); setSuspendReason(''); }}
                                  className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-orange-500/10 transition-colors">
                                  Suspendre
                                </button>
                              ) : (
                                <button onClick={() => handleReactivate(v.id)} disabled={actionLoading}
                                  className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-500/10 disabled:opacity-50 transition-colors">
                                  Réactiver
                                </button>
                              )}
                              {v.application?.status !== 'REJECTED' && (
                                <button onClick={() => { setRejectModal(v.id); setRejectReason(''); }}
                                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
                                  Rejeter
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {total > 20 && (
                <div className="flex justify-center items-center gap-2 p-4 border-t border-slate-800">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs disabled:opacity-40 hover:bg-slate-700 transition-colors">
                    ← Préc.
                  </button>
                  <span className="text-slate-500 text-xs px-2">Page {page} / {Math.ceil(total/20)}</span>
                  <button onClick={() => setPage(p => p+1)} disabled={vendors.length < 20}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs disabled:opacity-40 hover:bg-slate-700 transition-colors">
                    Suiv. →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB APPLICATIONS ─── */}
      {tab === 'applications' && (
        <div>
          <h3 className="text-slate-300 font-medium mb-4">
            Candidatures KYC — {applications.length} au total
          </h3>
          {applications.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-slate-400 font-medium">Aucune candidature en attente</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {applications.map(a => (
                <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: a.seller?.color || '#2563EB' }}>
                      {a.seller?.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-200 font-semibold truncate">{a.seller?.name}</div>
                      <div className="text-slate-500 text-xs">{a.seller?.location}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[a.status] || 'bg-slate-700 text-slate-400'}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 mb-4">
                    <div>Soumis le {new Date(a.createdAt).toLocaleDateString('fr-TN')}</div>
                    {a.companyName   && <div className="text-slate-400">Société: {a.companyName}</div>}
                    {a.taxId         && <div className="text-slate-400">Matricule fiscal: {a.taxId}</div>}
                    {a.bankAccount   && <div className="text-slate-400">RIB: {a.bankAccount}</div>}
                    {a.rejectionReason && <div className="text-red-400 font-medium">Rejeté: {a.rejectionReason}</div>}
                  </div>
                  {a.status === 'PENDING' && can('vendors.write') && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(a.sellerId)} disabled={actionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs py-2 rounded-lg transition-colors font-medium">
                        ✓ Approuver
                      </button>
                      <button onClick={() => { setRejectModal(a.sellerId); setRejectReason(''); }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded-lg transition-colors font-medium">
                        ✗ Rejeter
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB COMMISSIONS ─── */}
      {tab === 'commissions' && (
        <div>
          <h3 className="text-slate-300 font-medium mb-4">Gestion des commissions</h3>

          {/* Formulaire ajout */}
          {can('finance.write') && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-5">
              <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Nouvelle commission</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <Field label="Type">
                  <select value={newCommForm.type} onChange={e => setNewComm({...newCommForm, type: e.target.value})}
                    className={inputCls}>
                    <option value="GLOBAL">Global</option>
                    <option value="SELLER">Par vendeur</option>
                    <option value="CATEGORY">Par catégorie</option>
                  </select>
                </Field>
                <Field label="Taux (%)">
                  <input value={newCommForm.rate} onChange={e => setNewComm({...newCommForm, rate: e.target.value})}
                    type="number" min="0" max="100" step="0.1" placeholder="10"
                    className={inputCls} />
                </Field>
                {newCommForm.type === 'SELLER' && (
                  <Field label="ID Vendeur">
                    <input value={newCommForm.sellerId} onChange={e => setNewComm({...newCommForm, sellerId: e.target.value})}
                      type="number" placeholder="ID" className={inputCls} />
                  </Field>
                )}
                {newCommForm.type === 'CATEGORY' && (
                  <Field label="ID Catégorie">
                    <input value={newCommForm.categoryId} onChange={e => setNewComm({...newCommForm, categoryId: e.target.value})}
                      type="number" placeholder="ID" className={inputCls} />
                  </Field>
                )}
                <div className="flex items-end">
                  <button onClick={handleCreateComm} disabled={!newCommForm.rate || actionLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium">
                    + Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}

          {commissions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-600 text-sm">
              Aucune commission configurée
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 text-xs">Type</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs">Taux</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs">Statut</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs">Créée le</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-slate-200 font-medium">{c.type}</span>
                        {c.sellerId   && <span className="text-slate-500 text-xs ml-2">(vendeur #{c.sellerId})</span>}
                        {c.categoryId && <span className="text-slate-500 text-xs ml-2">(cat #{c.categoryId})</span>}
                      </td>
                      <td className="px-4 py-3">
                        {commEditId === c.id ? (
                          <div className="flex items-center gap-2">
                            <input value={commEditRate} onChange={e => setCommEditRate(e.target.value)}
                              type="number" className="bg-slate-700 rounded px-2 py-1 text-white w-20 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            <span className="text-slate-400 text-xs">%</span>
                            <button onClick={() => handleUpdateComm(c.id)} disabled={actionLoading}
                              className="text-xs text-green-400 hover:text-green-300 font-medium">OK</button>
                            <button onClick={() => setCommEditId(null)} className="text-xs text-slate-500 hover:text-slate-400">✕</button>
                          </div>
                        ) : (
                          <span className="text-blue-400 font-semibold text-base">{(c.rate*100).toFixed(1)}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${c.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                          {c.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(c.createdAt).toLocaleDateString('fr-TN')}
                      </td>
                      <td className="px-4 py-3">
                        {can('finance.write') && (
                          <div className="flex gap-1">
                            <button onClick={() => { setCommEditId(c.id); setCommEditRate((c.rate*100).toFixed(1)); }}
                              className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">
                              Modifier
                            </button>
                            <button onClick={() => handleDeleteComm(c.id)}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">
                              Supprimer
                            </button>
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

      {/* ─── MODAL: CRÉER VENDEUR ─── */}
      {createModal && (
        <Modal title="Nouveau vendeur" onClose={() => setCreateModal(false)} wide>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Nom du vendeur" required>
              <input value={form.name} onChange={e => {
                const name = e.target.value;
                setForm({...form, name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g,'')});
              }} placeholder="TechHub Store" className={inputCls} />
            </Field>
            <Field label="Slug (URL unique)" required>
              <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})}
                placeholder="techhub-store" className={inputCls} />
            </Field>
            <Field label="Logo (emoji)">
              <div className="flex gap-2 items-center">
                <input value={form.logo} onChange={e => setForm({...form, logo: e.target.value})}
                  className={`${inputCls} w-20 text-center text-2xl`} maxLength={2} />
                <div className="flex flex-wrap gap-1">
                  {EMOJI_OPTIONS.slice(0,8).map(e => (
                    <button key={e} onClick={() => setForm({...form, logo: e})}
                      className={`text-xl p-1 rounded hover:bg-slate-700 transition-colors ${form.logo===e ? 'bg-slate-700 ring-1 ring-blue-500' : ''}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            <Field label="Couleur de fond">
              <div className="flex gap-2 items-center">
                <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
                <input value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                  className={`${inputCls} flex-1`} placeholder="#2563EB" />
              </div>
            </Field>
            <Field label="Localisation">
              <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                placeholder="Tunis, Tunisie" className={inputCls} />
            </Field>
            <Field label="Année d'inscription">
              <input value={form.joinedYear} onChange={e => setForm({...form, joinedYear: e.target.value})}
                type="number" min="2020" max="2030" className={inputCls} />
            </Field>
            <Field label="Délai de réponse">
              <input value={form.responseTime} onChange={e => setForm({...form, responseTime: e.target.value})}
                placeholder="sous 24 heures" className={inputCls} />
            </Field>
            <Field label="Badge initial">
              <select value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}
                className={inputCls}>
                {BADGE_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          </div>
          {/* Preview */}
          <div className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-700">
            <div className="text-slate-500 text-xs mb-2">Aperçu</div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ background: form.color }}>
                {form.logo}
              </div>
              <div>
                <div className="text-slate-200 font-semibold">{form.name || 'Nom du vendeur'}</div>
                <div className="text-slate-500 text-xs">{form.location}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block border ${BADGE_COLORS[form.badge] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                  {form.badge}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCreateModal(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm transition-colors">
              Annuler
            </button>
            <button onClick={handleCreate} disabled={actionLoading || !form.name || !form.slug}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {actionLoading ? 'Création...' : 'Créer le vendeur'}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── MODAL: DÉTAIL VENDEUR ─── */}
      {detailVendor && (
        <Modal title="Fiche vendeur" onClose={() => setDetailVendor(null)} wide>
          <div className="flex items-start gap-4 mb-6 pb-5 border-b border-slate-700">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0"
              style={{ background: detailVendor.color || '#2563EB' }}>
              {detailVendor.logo}
            </div>
            <div className="flex-1">
              <div className="text-white text-2xl font-bold">{detailVendor.name}</div>
              <div className="text-slate-400 text-sm">{detailVendor.location}</div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full border ${BADGE_COLORS[detailVendor.badge] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                  {detailVendor.badge || 'Nouveau'}
                </span>
                {detailVendor.application && (
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[detailVendor.application.status] || 'bg-slate-700 text-slate-400'}`}>
                    KYC: {detailVendor.application.status}
                  </span>
                )}
                {detailVendor.verified && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">✓ Vérifié</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          {detailVendor.stats && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                ['Commandes', detailVendor.stats.totalOrders],
                ['Revenu total', new Intl.NumberFormat('fr-TN',{maximumFractionDigits:0}).format(detailVendor.stats.totalRevenue) + ' DT'],
                ['Note moy.', '★ ' + detailVendor.stats.avgRating],
              ].map(([k,v]) => (
                <div key={k} className="bg-slate-900 rounded-xl p-4 text-center">
                  <div className="text-blue-400 font-bold text-xl">{v}</div>
                  <div className="text-slate-500 text-xs mt-1">{k}</div>
                </div>
              ))}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              ['Slug', `/${detailVendor.slug}`],
              ['Membre depuis', detailVendor.joinedYear],
              ['Temps réponse', detailVendor.responseTime],
              ['Rating', `★ ${detailVendor.rating} (${detailVendor.reviewsCount?.toLocaleString()} avis)`],
              ['Produits actifs', detailVendor._count?.products ?? detailVendor.products?.length ?? 0],
              ['Couleur', detailVendor.color],
            ].map(([k,v]) => (
              <div key={k} className="bg-slate-900 rounded-lg p-3">
                <div className="text-slate-500 text-xs">{k}</div>
                <div className="text-slate-200 text-sm font-medium mt-0.5">{v || '—'}</div>
              </div>
            ))}
          </div>

          {/* Actions rapides */}
          {can('vendors.write') && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
              {detailVendor.application?.status !== 'APPROVED' && (
                <button onClick={() => { handleApprove(detailVendor.id); setDetailVendor(null); }} disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded-lg disabled:opacity-60">
                  ✓ Approuver
                </button>
              )}
              <button onClick={() => { setLevelModal(detailVendor.id); setLevel(detailVendor.badge||'Nouveau'); setDetailVendor(null); }}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-lg">
                Changer niveau
              </button>
              {detailVendor.badge !== 'Suspendu' ? (
                <button onClick={() => { setSuspendModal(detailVendor.id); setSuspendReason(''); setDetailVendor(null); }}
                  className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 text-xs px-4 py-2 rounded-lg border border-orange-600/30">
                  Suspendre
                </button>
              ) : (
                <button onClick={() => { handleReactivate(detailVendor.id); setDetailVendor(null); }} disabled={actionLoading}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs px-4 py-2 rounded-lg border border-emerald-600/30">
                  Réactiver
                </button>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* ─── MODAL: REJETER ─── */}
      {rejectModal && (
        <Modal title="Motif de rejet" onClose={() => { setRejectModal(null); setRejectReason(''); }}>
          <p className="text-slate-400 text-sm mb-3">Expliquez pourquoi ce vendeur est rejeté :</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
            placeholder="Ex: Documents KYC incomplets, activité non conforme..."
            className={`${inputCls} resize-none mb-4`} />
          <div className="flex gap-3">
            <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm">Annuler</button>
            <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
              {actionLoading ? '...' : 'Confirmer le rejet'}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── MODAL: SUSPENDRE ─── */}
      {suspendModal && (
        <Modal title="Suspendre le vendeur" onClose={() => { setSuspendModal(null); setSuspendReason(''); }}>
          <p className="text-slate-400 text-sm mb-3">Motif de suspension (optionnel) :</p>
          <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3}
            placeholder="Ex: Violation des CGV, fraude détectée..."
            className={`${inputCls} resize-none mb-4`} />
          <div className="flex gap-3">
            <button onClick={() => { setSuspendModal(null); setSuspendReason(''); }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm">Annuler</button>
            <button onClick={handleSuspend} disabled={actionLoading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
              {actionLoading ? '...' : 'Confirmer la suspension'}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── MODAL: NIVEAU ─── */}
      {levelModal && (
        <Modal title="Modifier le niveau / badge" onClose={() => setLevelModal(null)}>
          <p className="text-slate-400 text-sm mb-3">Choisissez le badge pour ce vendeur :</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {BADGE_OPTIONS.map(b => (
              <button key={b} onClick={() => setLevel(b)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  selectedLevel === b
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                }`}>
                {b}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setLevelModal(null)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm">Annuler</button>
            <button onClick={handleSetLevel} disabled={actionLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
              {actionLoading ? '...' : 'Sauvegarder'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
