import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const BADGE_COLORS = {
  'Top Seller': 'bg-yellow-500/20 text-yellow-400',
  'Premium':    'bg-purple-500/20 text-purple-400',
  'Gold':       'bg-yellow-600/20 text-yellow-300',
  'Silver':     'bg-slate-400/20 text-slate-300',
  'Bronze':     'bg-orange-800/20 text-orange-400',
  'Nouveau':    'bg-blue-500/20 text-blue-400',
  'Suspendu':   'bg-red-500/20 text-red-400',
};

const STATUS_COLORS = {
  APPROVED:  'bg-green-500/20 text-green-400',
  PENDING:   'bg-yellow-500/20 text-yellow-400',
  REJECTED:  'bg-red-500/20 text-red-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
};

const fmt = (n) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(n || 0);

const BADGE_OPTIONS = ['Nouveau', 'Bronze', 'Silver', 'Gold', 'Premium', 'Top Seller'];

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">×</button>
      </div>
      {children}
    </div>
  </div>
);

export default function AdminVendors({ initialTab, vendorId }) {
  const { can } = useAdmin();
  const [tab, setTab] = useState(initialTab || 'all');
  const [vendors, setVendors] = useState([]);
  const [applications, setApplications] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [levelModal, setLevelModal] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('Nouveau');
  const [commEditId, setCommEditId] = useState(null);
  const [commEditRate, setCommEditRate] = useState('');
  const [newCommForm, setNewCommForm] = useState({ type: 'GLOBAL', rate: '', sellerId: '', categoryId: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadVendors = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.append('search', search);
    if (statusFilter) params.append('status', statusFilter);
    adminApi.get(`/vendors?${params}`)
      .then(d => { setVendors(d.sellers || []); setTotal(d.total || 0); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  const loadApplications = useCallback(() => {
    adminApi.get('/vendors/applications').then(setApplications).catch(() => {});
  }, []);

  const loadCommissions = useCallback(() => {
    if (can('finance.read') || can('finance.write')) {
      adminApi.get('/vendors/commissions').then(setCommissions).catch(() => {});
    }
  }, [can]);

  useEffect(() => { loadVendors(); }, [loadVendors]);
  useEffect(() => { loadApplications(); loadCommissions(); }, [loadApplications, loadCommissions]);

  // Open vendor detail if vendorId provided
  useEffect(() => {
    if (vendorId) {
      adminApi.get(`/vendors/${vendorId}`).then(setSelectedVendor).catch(() => {});
    }
  }, [vendorId]);

  const withLoading = async (fn) => {
    setActionLoading(true);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleApprove = (id) => withLoading(async () => {
    await adminApi.patch(`/vendors/${id}/approve`, {});
    loadVendors(); loadApplications();
  });

  const handleSuspend = async () => {
    if (!suspendModal) return;
    await withLoading(async () => {
      await adminApi.patch(`/vendors/${suspendModal}/suspend`, { reason: suspendReason });
      setSuspendModal(null); setSuspendReason('');
      loadVendors();
    });
  };

  const handleReactivate = (id) => withLoading(async () => {
    await adminApi.patch(`/vendors/${id}/reactivate`, {});
    loadVendors();
  });

  const handleReject = async () => {
    if (!rejectModal) return;
    await withLoading(async () => {
      await adminApi.patch(`/vendors/${rejectModal}/reject`, { reason: rejectReason });
      setRejectModal(null); setRejectReason('');
      loadVendors(); loadApplications();
    });
  };

  const handleSetLevel = async () => {
    if (!levelModal) return;
    await withLoading(async () => {
      await adminApi.patch(`/vendors/${levelModal}/level`, { badge: selectedLevel });
      setLevelModal(null);
      loadVendors();
    });
  };

  const handleUpdateCommission = async (id) => {
    await withLoading(async () => {
      await adminApi.patch(`/vendors/commissions/${id}`, { rate: parseFloat(commEditRate) / 100 });
      setCommEditId(null);
      loadCommissions();
    });
  };

  const handleCreateCommission = async () => {
    await withLoading(async () => {
      await adminApi.post('/vendors/commissions', {
        type: newCommForm.type,
        rate: parseFloat(newCommForm.rate) / 100,
        sellerId: newCommForm.sellerId || undefined,
        categoryId: newCommForm.categoryId || undefined,
        isActive: true
      });
      setNewCommForm({ type: 'GLOBAL', rate: '', sellerId: '', categoryId: '' });
      loadCommissions();
    });
  };

  const handleDeleteCommission = async (id) => {
    if (!window.confirm('Supprimer cette commission ?')) return;
    await withLoading(async () => {
      await adminApi.delete(`/vendors/commissions/${id}`);
      loadCommissions();
    });
  };

  const pendingApps = applications.filter(a => a.status === 'PENDING');

  const tabs = [
    { id: 'all', label: 'Tous les vendeurs' },
    { id: 'applications', label: `Candidatures KYC (${pendingApps.length})` },
    ...(can('finance.read') ? [{ id: 'commissions', label: 'Commissions' }] : []),
  ];

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ALL VENDORS TAB */}
      {tab === 'all' && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher un vendeur..."
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-64" />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="Suspendu">Suspendus</option>
            </select>
            <span className="text-slate-500 text-sm self-center">{total} vendeur(s)</span>
          </div>

          {loading ? (
            <div className="text-slate-500 text-center py-12">Chargement...</div>
          ) : vendors.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucun vendeur trouvé</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Vendeur', 'Localisation', 'Badge', 'Rating', 'Produits', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <button className="flex items-center gap-2 text-left hover:opacity-80" onClick={() => setSelectedVendor(v)}>
                          <span className="text-xl">{v.logo}</span>
                          <div>
                            <div className="text-slate-200 font-medium">{v.name}</div>
                            <div className="text-slate-600 text-xs">{v.slug}</div>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{v.location}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${BADGE_COLORS[v.badge] || 'bg-slate-700 text-slate-400'}`}>{v.badge || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">★ {v.rating}</td>
                      <td className="px-4 py-3 text-slate-300 text-center">{v._count?.products || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${v.application ? STATUS_COLORS[v.application.status] : 'bg-slate-700 text-slate-400'}`}>
                          {v.application?.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => setSelectedVendor(v)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">Détail</button>
                          {can('vendors.write') && v.application?.status !== 'APPROVED' && (
                            <button onClick={() => handleApprove(v.id)} disabled={actionLoading} className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-500/10 disabled:opacity-60">Approuver</button>
                          )}
                          {can('vendors.write') && v.badge !== 'Suspendu' && (
                            <button onClick={() => { setSuspendModal(v.id); setSuspendReason(''); }} className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-orange-500/10">Suspendre</button>
                          )}
                          {can('vendors.write') && v.badge === 'Suspendu' && (
                            <button onClick={() => handleReactivate(v.id)} disabled={actionLoading} className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-500/10 disabled:opacity-60">Réactiver</button>
                          )}
                          {can('vendors.write') && (
                            <button onClick={() => { setLevelModal(v.id); setSelectedLevel(v.badge || 'Nouveau'); }} className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-700">Niveau</button>
                          )}
                          {can('vendors.write') && v.application?.status !== 'REJECTED' && (
                            <button onClick={() => { setRejectModal(v.id); setRejectReason(''); }} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">Rejeter</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Préc.</button>
              <span className="px-3 py-1.5 text-slate-400 text-sm">Page {page} / {Math.ceil(total / 20)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={vendors.length < 20} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv.</button>
            </div>
          )}
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {tab === 'applications' && (
        <div>
          <h3 className="text-slate-300 font-medium mb-4">Candidatures KYC en attente</h3>
          {applications.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-slate-400 font-medium">Aucune candidature en attente</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {applications.map(a => (
                <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{a.seller?.logo}</span>
                    <div>
                      <div className="text-slate-200 font-medium">{a.seller?.name}</div>
                      <div className="text-slate-500 text-xs">{a.seller?.location}</div>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-1 rounded-full ${STATUS_COLORS[a.status] || 'bg-slate-700 text-slate-400'}`}>{a.status}</span>
                  </div>
                  <div className="text-slate-500 text-xs mb-4">
                    Soumis le {new Date(a.createdAt).toLocaleDateString('fr-TN')}
                    {a.rejectionReason && <div className="text-red-400 mt-1">Motif: {a.rejectionReason}</div>}
                  </div>
                  {a.status === 'PENDING' && can('vendors.write') && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(a.sellerId)} disabled={actionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs py-2 rounded-lg transition-colors">
                        Approuver
                      </button>
                      <button onClick={() => { setRejectModal(a.sellerId); setRejectReason(''); }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded-lg transition-colors">
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMMISSIONS TAB */}
      {tab === 'commissions' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-300 font-medium">Gestion des commissions</h3>
          </div>

          {/* New commission form */}
          {can('finance.write') && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
              <h4 className="text-slate-400 text-xs font-medium mb-3">Nouvelle commission</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-slate-500 text-xs mb-1 block">Type</label>
                  <select value={newCommForm.type} onChange={e => setNewCommForm({...newCommForm, type: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
                    <option value="GLOBAL">GLOBAL</option>
                    <option value="SELLER">Par vendeur</option>
                    <option value="CATEGORY">Par catégorie</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 text-xs mb-1 block">Taux (%)</label>
                  <input value={newCommForm.rate} onChange={e => setNewCommForm({...newCommForm, rate: e.target.value})}
                    type="number" min="0" max="100" step="0.1" placeholder="10"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                {newCommForm.type === 'SELLER' && (
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">ID Vendeur</label>
                    <input value={newCommForm.sellerId} onChange={e => setNewCommForm({...newCommForm, sellerId: e.target.value})}
                      type="number" placeholder="ID"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                  </div>
                )}
                {newCommForm.type === 'CATEGORY' && (
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">ID Catégorie</label>
                    <input value={newCommForm.categoryId} onChange={e => setNewCommForm({...newCommForm, categoryId: e.target.value})}
                      type="number" placeholder="ID"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                  </div>
                )}
              </div>
              <button onClick={handleCreateCommission} disabled={!newCommForm.rate || actionLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                + Ajouter
              </button>
            </div>
          )}

          {commissions.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucune commission configurée</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Type', 'Taux', 'Statut', 'Créée le', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-200 font-medium">{c.type}</td>
                      <td className="px-4 py-3">
                        {commEditId === c.id ? (
                          <div className="flex gap-2 items-center">
                            <input value={commEditRate} onChange={e => setCommEditRate(e.target.value)} type="number"
                              className="bg-slate-700 rounded px-2 py-1 text-white w-20 text-sm focus:outline-none" />
                            <span className="text-slate-400 text-xs">%</span>
                            <button onClick={() => handleUpdateCommission(c.id)} disabled={actionLoading} className="text-xs text-green-400 hover:text-green-300 disabled:opacity-60">OK</button>
                            <button onClick={() => setCommEditId(null)} className="text-xs text-slate-400 hover:text-slate-300">Annuler</button>
                          </div>
                        ) : (
                          <span className="text-slate-200 font-medium">{(c.rate * 100).toFixed(1)}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${c.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                          {c.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(c.createdAt).toLocaleDateString('fr-TN')}</td>
                      <td className="px-4 py-3">
                        {can('finance.write') && (
                          <div className="flex gap-2">
                            <button onClick={() => { setCommEditId(c.id); setCommEditRate((c.rate * 100).toFixed(1)); }}
                              className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">Modifier</button>
                            <button onClick={() => handleDeleteCommission(c.id)}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">Supprimer</button>
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

      {/* Modals */}
      {rejectModal && (
        <Modal title="Motif de rejet" onClose={() => { setRejectModal(null); setRejectReason(''); }}>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
            placeholder="Expliquez la raison du rejet..." required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm resize-none focus:outline-none mb-4" />
          <div className="flex gap-3">
            <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
            <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-60">Rejeter</button>
          </div>
        </Modal>
      )}

      {suspendModal && (
        <Modal title="Suspendre le vendeur" onClose={() => { setSuspendModal(null); setSuspendReason(''); }}>
          <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3}
            placeholder="Motif de suspension (optionnel)..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm resize-none focus:outline-none mb-4" />
          <div className="flex gap-3">
            <button onClick={() => { setSuspendModal(null); setSuspendReason(''); }} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
            <button onClick={handleSuspend} disabled={actionLoading} className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-60">Suspendre</button>
          </div>
        </Modal>
      )}

      {levelModal && (
        <Modal title="Modifier le niveau" onClose={() => setLevelModal(null)}>
          <div className="mb-4">
            <label className="text-slate-400 text-xs mb-2 block">Niveau / Badge</label>
            <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
              {BADGE_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setLevelModal(null)} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
            <button onClick={handleSetLevel} disabled={actionLoading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">Sauvegarder</button>
          </div>
        </Modal>
      )}

      {selectedVendor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-xl border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Détail vendeur</h3>
              <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-slate-200 text-xl">×</button>
            </div>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-700">
              <span className="text-4xl">{selectedVendor.logo}</span>
              <div className="flex-1">
                <div className="text-white text-xl font-bold">{selectedVendor.name}</div>
                <div className="text-slate-400 text-sm">{selectedVendor.location}</div>
                <div className="flex gap-2 mt-1">
                  {selectedVendor.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE_COLORS[selectedVendor.badge] || 'bg-slate-700 text-slate-400'}`}>{selectedVendor.badge}</span>
                  )}
                  {selectedVendor.application && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[selectedVendor.application.status] || 'bg-slate-700 text-slate-400'}`}>{selectedVendor.application.status}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ['Slug', selectedVendor.slug],
                ['Rating', `★ ${selectedVendor.rating}`],
                ['Vérifié', selectedVendor.verified ? 'Oui' : 'Non'],
                ['Depuis', selectedVendor.joinedYear],
                ['Produits', selectedVendor._count?.products || 0],
                ['Temps réponse', selectedVendor.responseTime],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-500 text-xs">{k}</div>
                  <div className="text-slate-200 text-sm font-medium">{v || '—'}</div>
                </div>
              ))}
            </div>
            {selectedVendor.stats && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Commandes', selectedVendor.stats.totalOrders],
                  ['Revenu total', `${new Intl.NumberFormat('fr-TN', {maximumFractionDigits:0}).format(selectedVendor.stats.totalRevenue)} TND`],
                  ['Note moy.', `★ ${selectedVendor.stats.avgRating}`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-blue-400 font-bold text-lg">{v}</div>
                    <div className="text-slate-500 text-xs">{k}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
