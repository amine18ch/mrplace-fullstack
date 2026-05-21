import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const fmt = (n) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: '2-digit' });

const SEGMENT_COLORS = {
  Champion:   'bg-yellow-500/20 text-yellow-400',
  Fidèle:     'bg-purple-500/20 text-purple-400',
  Nouveau:    'bg-blue-500/20 text-blue-400',
  ARisque:    'bg-orange-500/20 text-orange-400',
  Inactif:    'bg-slate-700 text-slate-400',
  Blacklisted:'bg-red-500/20 text-red-400',
};

const SEGMENT_INFO = {
  Champions:   { label: 'Champions', desc: '+5 cmds, +500 TND', color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', icon: '🏆' },
  Fideles:     { label: 'Fidèles',   desc: '2-5 commandes',     color: 'bg-purple-500/10 border-purple-500/30 text-purple-400', icon: '⭐' },
  Nouveaux:    { label: 'Nouveaux',  desc: '1 cmd, <30 jours',  color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', icon: '🆕' },
  ARisque:     { label: 'À risque',  desc: '>90j sans achat',   color: 'bg-orange-500/10 border-orange-500/30 text-orange-400', icon: '⚠️' },
  Inactifs:    { label: 'Inactifs',  desc: 'Jamais acheté',     color: 'bg-slate-700/50 border-slate-600 text-slate-400', icon: '💤' },
  Blacklisted: { label: 'Blacklistés', desc: 'Comptes bloqués', color: 'bg-red-500/10 border-red-500/30 text-red-400', icon: '🚫' },
};

export default function AdminCustomers() {
  const { can } = useAdmin();
  const [tab, setTab] = useState('list');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [segments, setSegments] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'blacklist'|'anonymize', id, name }
  const [error, setError] = useState('');

  const loadCustomers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.append('search', search);
    if (filterRole) params.append('filter', filterRole);
    adminApi.get(`/customers?${params}`)
      .then(d => { setCustomers(d.customers || []); setTotal(d.total || 0); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, filterRole]);

  useEffect(() => {
    adminApi.get('/customers/segments').then(setSegments).catch(() => {});
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const withLoading = async (fn) => {
    setActionLoading(true);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    await withLoading(async () => {
      if (confirmModal.type === 'blacklist') {
        const path = confirmModal.isBlacklisted ? `/customers/${confirmModal.id}/unblacklist` : `/customers/${confirmModal.id}/blacklist`;
        await adminApi.patch(path, {});
      } else if (confirmModal.type === 'anonymize') {
        await adminApi.delete(`/customers/${confirmModal.id}`);
      }
      setConfirmModal(null);
      loadCustomers();
      if (selectedCustomer?.id === confirmModal.id) setSelectedCustomer(null);
    });
  };

  const handleViewDetail = async (id) => {
    const data = await adminApi.get(`/customers/${id}`).catch(() => null);
    if (data) setSelectedCustomer(data);
  };

  const totalCustomers = customers.length > 0 ? total : 0;
  const blacklistedCount = segments?.Blacklisted?.count || 0;
  const championsCount = segments?.Champions?.count || 0;
  const nouveauxCount = segments?.Nouveaux?.count || 0;

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total clients', value: total, color: 'text-slate-200', bg: 'bg-slate-900' },
          { label: 'Champions', value: championsCount, color: 'text-yellow-400', bg: 'bg-yellow-500/5' },
          { label: 'Nouveaux', value: nouveauxCount, color: 'text-blue-400', bg: 'bg-blue-500/5' },
          { label: 'Blacklistés', value: blacklistedCount, color: 'text-red-400', bg: 'bg-red-500/5' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-slate-800 rounded-xl p-4`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {[
          { id: 'segments', label: 'Segments RFM' },
          { id: 'list', label: 'Liste clients' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* SEGMENTS TAB */}
      {tab === 'segments' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {segments && Object.entries(SEGMENT_INFO).map(([key, info]) => {
            const segData = segments[key];
            const count = segData?.count || 0;
            return (
              <div key={key} className={`border rounded-xl p-5 ${info.color}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <div className="font-semibold text-sm">{info.label}</div>
                    <div className="opacity-70 text-xs">{info.desc}</div>
                  </div>
                  <div className="ml-auto text-2xl font-bold">{count}</div>
                </div>
                {segData?.users && segData.users.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                    {segData.users.slice(0, 3).map(u => (
                      <div key={u.id} className="text-xs opacity-70 truncate">{u.name} — {u.email}</div>
                    ))}
                    {segData.users.length > 3 && (
                      <div className="text-xs opacity-50">+{segData.users.length - 3} autres...</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LIST TAB */}
      {tab === 'list' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nom ou email..."
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-64" />
            <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
              <option value="">Tous</option>
              <option value="BLACKLISTED">Blacklistés</option>
              <option value="NEW">Nouveaux (30j)</option>
            </select>
            <span className="text-slate-500 text-sm self-center">{total} client(s)</span>
          </div>

          {loading ? (
            <div className="text-slate-500 text-center py-12">Chargement...</div>
          ) : customers.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucun client trouvé</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Client', 'Email', 'Commandes', 'Total dépensé', 'Segment', 'Inscrit le', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-bold flex-shrink-0">
                            {c.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="text-slate-200 text-sm font-medium">{c.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{c.email}</td>
                      <td className="px-4 py-3 text-slate-300 text-center">{c.orderCount}</td>
                      <td className="px-4 py-3 text-blue-400 font-medium">{fmt(c.totalSpent)} TND</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${SEGMENT_COLORS[c.segment] || 'bg-slate-700 text-slate-400'}`}>{c.segment}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${c.role === 'BLACKLISTED' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {c.role === 'BLACKLISTED' ? 'Blacklisté' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => handleViewDetail(c.id)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">Voir</button>
                          {can('customers.write') && (
                            <button
                              onClick={() => setConfirmModal({ type: 'blacklist', id: c.id, name: c.name, isBlacklisted: c.role === 'BLACKLISTED' })}
                              disabled={actionLoading}
                              className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-60 ${c.role === 'BLACKLISTED' ? 'text-green-400 hover:bg-green-500/10' : 'text-orange-400 hover:bg-orange-500/10'}`}>
                              {c.role === 'BLACKLISTED' ? 'Débloquer' : 'Blacklist'}
                            </button>
                          )}
                          {can('customers.write') && (
                            <button
                              onClick={() => setConfirmModal({ type: 'anonymize', id: c.id, name: c.name })}
                              disabled={actionLoading}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 disabled:opacity-60">
                              Anon. RGPD
                            </button>
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
              <button onClick={() => setPage(p => p + 1)} disabled={customers.length < 20} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv.</button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h3 className="text-white font-semibold mb-2">
              {confirmModal.type === 'anonymize' ? 'Anonymisation RGPD' : confirmModal.isBlacklisted ? 'Débloquer le client' : 'Blacklister le client'}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {confirmModal.type === 'anonymize'
                ? `Voulez-vous anonymiser les données de "${confirmModal.name}" ? Cette action est irréversible.`
                : confirmModal.isBlacklisted
                  ? `Débloquer "${confirmModal.name}" et lui redonner accès au site ?`
                  : `Blacklister "${confirmModal.name}" et lui bloquer l'accès au site ?`
              }
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
              <button onClick={handleConfirmAction} disabled={actionLoading}
                className={`flex-1 py-2 rounded-lg text-sm disabled:opacity-60 text-white ${confirmModal.type === 'anonymize' ? 'bg-red-700 hover:bg-red-800' : confirmModal.isBlacklisted ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                {actionLoading ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer detail modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Profil client</h3>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-200 text-xl">×</button>
            </div>
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-700">
              <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {selectedCustomer.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <div className="text-white text-lg font-bold">{selectedCustomer.name}</div>
                <div className="text-slate-400 text-sm">{selectedCustomer.email}</div>
                {selectedCustomer.phone && <div className="text-slate-500 text-xs">{selectedCustomer.phone}</div>}
                <div className="text-slate-500 text-xs">Inscrit le {fmtDate(selectedCustomer.createdAt)}</div>
              </div>
              <div className="text-right">
                <div className="text-blue-400 font-bold text-xl">{fmt(selectedCustomer.totalSpent)} TND</div>
                <div className="text-slate-500 text-xs">Total dépensé</div>
                {selectedCustomer.disputeCount > 0 && (
                  <div className="text-orange-400 text-xs mt-1">{selectedCustomer.disputeCount} litige(s)</div>
                )}
              </div>
            </div>
            <h4 className="text-slate-300 font-medium text-sm mb-3">
              Historique commandes ({selectedCustomer.orders?.length || 0})
            </h4>
            {(selectedCustomer.orders || []).length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-4">Aucune commande</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedCustomer.orders.slice(0, 10).map(o => (
                  <div key={o.id} className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                    <span className="text-slate-500 text-xs font-mono">#{o.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${SEGMENT_COLORS[o.status] || 'bg-slate-700 text-slate-400'}`}>{o.status}</span>
                    <span className="text-slate-500 text-xs">{fmtDate(o.createdAt)}</span>
                    <span className="ml-auto text-blue-400 font-medium text-sm">{fmt(o.total)} TND</span>
                  </div>
                ))}
              </div>
            )}
            {can('customers.write') && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
                <button
                  onClick={() => { setConfirmModal({ type: 'blacklist', id: selectedCustomer.id, name: selectedCustomer.name, isBlacklisted: selectedCustomer.role === 'BLACKLISTED' }); }}
                  className={`text-sm px-4 py-2 rounded-lg transition-colors ${selectedCustomer.role === 'BLACKLISTED' ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'}`}>
                  {selectedCustomer.role === 'BLACKLISTED' ? 'Débloquer' : 'Blacklister'}
                </button>
                <button
                  onClick={() => setConfirmModal({ type: 'anonymize', id: selectedCustomer.id, name: selectedCustomer.name })}
                  className="text-sm px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors">
                  Anonymiser (RGPD)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
