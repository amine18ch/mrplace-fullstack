import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';

const BADGE_COLORS = {
  'Top Seller': 'bg-yellow-500/20 text-yellow-400',
  'Premium': 'bg-purple-500/20 text-purple-400',
  'Nouveau': 'bg-blue-500/20 text-blue-400',
  'Suspendu': 'bg-red-500/20 text-red-400',
};

const STATUS_COLORS = {
  APPROVED: 'bg-green-500/20 text-green-400',
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
};

const fmt = (n) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(n || 0);

export default function AdminVendors() {
  const [tab, setTab] = useState('all');
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
  const [commEditId, setCommEditId] = useState(null);
  const [commEditRate, setCommEditRate] = useState('');
  const [newCommRate, setNewCommRate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadVendors = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.append('search', search);
    if (statusFilter) params.append('status', statusFilter);
    adminApi.get(`/vendors?${params}`)
      .then(d => { setVendors(d.sellers || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadApplications = () => {
    adminApi.get('/vendors/applications').then(setApplications).catch(() => {});
  };

  const loadCommissions = () => {
    adminApi.get('/vendors/commissions').then(setCommissions).catch(() => {});
  };

  useEffect(() => { loadVendors(); }, [page, search, statusFilter]);
  useEffect(() => { loadApplications(); loadCommissions(); }, []);

  const handleApprove = async (id) => {
    setActionLoading(true);
    await adminApi.patch(`/vendors/${id}/approve`, {}).catch(() => {});
    setActionLoading(false);
    loadVendors(); loadApplications();
  };

  const handleSuspend = async (id) => {
    setActionLoading(true);
    await adminApi.patch(`/vendors/${id}/suspend`, {}).catch(() => {});
    setActionLoading(false);
    loadVendors();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(true);
    await adminApi.patch(`/vendors/${rejectModal}/reject`, { reason: rejectReason }).catch(() => {});
    setActionLoading(false);
    setRejectModal(null); setRejectReason('');
    loadVendors(); loadApplications();
  };

  const handleUpdateCommission = async (id) => {
    await adminApi.patch(`/vendors/commissions/${id}`, { rate: parseFloat(commEditRate) / 100 }).catch(() => {});
    setCommEditId(null);
    loadCommissions();
  };

  const handleCreateCommission = async () => {
    await adminApi.post('/vendors/commissions', { type: 'GLOBAL', rate: parseFloat(newCommRate) / 100, isActive: true }).catch(() => {});
    setNewCommRate('');
    loadCommissions();
  };

  const handleViewDetail = (v) => setSelectedVendor(v);

  const tabs = [
    { id: 'all', label: 'Tous les vendeurs' },
    { id: 'applications', label: `En attente (${applications.filter(a => a.status === 'PENDING').length})` },
    { id: 'commissions', label: 'Commissions' },
  ];

  return (
    <div className="p-6">
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
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{v.logo}</span>
                          <div>
                            <div className="text-slate-200 font-medium">{v.name}</div>
                            <div className="text-slate-600 text-xs">{v.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{v.location}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${BADGE_COLORS[v.badge] || 'bg-slate-700 text-slate-400'}`}>{v.badge}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">★ {v.rating}</td>
                      <td className="px-4 py-3 text-slate-300">{v._count?.products || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${v.application ? STATUS_COLORS[v.application.status] : 'bg-slate-700 text-slate-400'}`}>
                          {v.application?.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleViewDetail(v)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10 transition-colors">Détail</button>
                          <button onClick={() => handleApprove(v.id)} disabled={actionLoading} className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-500/10 transition-colors">Approuver</button>
                          <button onClick={() => setRejectModal(v.id)} className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-orange-500/10 transition-colors">Rejeter</button>
                          <button onClick={() => handleSuspend(v.id)} disabled={actionLoading} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">Suspendre</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Préc.</button>
              <span className="px-3 py-1.5 text-slate-400 text-sm">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={vendors.length < 20} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv.</button>
            </div>
          )}
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {tab === 'applications' && (
        <div>
          <h3 className="text-slate-300 font-medium mb-4">Demandes d'approbation</h3>
          {applications.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucune demande</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Vendeur', 'Statut', 'Date', 'Motif rejet', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map(a => (
                    <tr key={a.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{a.seller?.logo}</span>
                          <span className="text-slate-200">{a.seller?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[a.status] || 'bg-slate-700 text-slate-400'}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(a.createdAt).toLocaleDateString('fr-TN')}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{a.rejectionReason || '—'}</td>
                      <td className="px-4 py-3">
                        {a.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(a.sellerId)} className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-500/10">Approuver</button>
                            <button onClick={() => setRejectModal(a.sellerId)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">Rejeter</button>
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

      {/* COMMISSIONS TAB */}
      {tab === 'commissions' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-300 font-medium">Gestion des commissions</h3>
            <div className="flex gap-2 items-center">
              <input value={newCommRate} onChange={e => setNewCommRate(e.target.value)} placeholder="Taux %" type="number" min="0" max="100"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm w-28 focus:outline-none" />
              <button onClick={handleCreateCommission} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                + Ajouter
              </button>
            </div>
          </div>
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
                      <td className="px-4 py-3 text-slate-200">{c.type}</td>
                      <td className="px-4 py-3">
                        {commEditId === c.id ? (
                          <div className="flex gap-2">
                            <input value={commEditRate} onChange={e => setCommEditRate(e.target.value)} type="number" className="bg-slate-700 rounded px-2 py-1 text-white w-16 text-sm" />
                            <button onClick={() => handleUpdateCommission(c.id)} className="text-xs text-green-400 hover:text-green-300">OK</button>
                            <button onClick={() => setCommEditId(null)} className="text-xs text-slate-400">Annuler</button>
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
                        <button onClick={() => { setCommEditId(c.id); setCommEditRate((c.rate * 100).toFixed(1)); }}
                          className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Motif de rejet</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Expliquez la raison du rejet..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm resize-none focus:outline-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
              <button onClick={handleReject} disabled={actionLoading} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-60">Rejeter</button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Détail vendeur</h3>
              <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-slate-200 text-xl">×</button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{selectedVendor.logo}</span>
              <div>
                <div className="text-white text-xl font-bold">{selectedVendor.name}</div>
                <div className="text-slate-400 text-sm">{selectedVendor.location}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Slug', selectedVendor.slug],
                ['Badge', selectedVendor.badge],
                ['Rating', `★ ${selectedVendor.rating}`],
                ['Avis', selectedVendor.reviewsCount],
                ['Vérifié', selectedVendor.verified ? 'Oui' : 'Non'],
                ['Depuis', selectedVendor.joinedYear],
                ['Produits', selectedVendor._count?.products || 0],
                ['Réponse', selectedVendor.responseTime],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-500 text-xs">{k}</div>
                  <div className="text-slate-200 text-sm font-medium">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
