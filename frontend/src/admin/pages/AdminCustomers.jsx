import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';

const fmt = (n) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: '2-digit' });

const SEGMENT_COLORS = {
  Champion:  'bg-yellow-500/20 text-yellow-400',
  Fidèle:    'bg-purple-500/20 text-purple-400',
  Nouveau:   'bg-blue-500/20 text-blue-400',
  Inactif:   'bg-slate-700 text-slate-400',
  Blacklisted: 'bg-red-500/20 text-red-400',
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [segments, setSegments] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCustomers = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.append('search', search);
    adminApi.get(`/customers?${params}`)
      .then(d => { setCustomers(d.customers || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    adminApi.get('/customers/segments').then(setSegments).catch(() => {});
  }, []);

  useEffect(() => { loadCustomers(); }, [page, search]);

  const handleBlacklist = async (id, isBlacklisted) => {
    setActionLoading(true);
    const path = isBlacklisted ? `/customers/${id}/unblacklist` : `/customers/${id}/blacklist`;
    await adminApi.patch(path, {}).catch(() => {});
    setActionLoading(false);
    loadCustomers();
  };

  const handleViewDetail = async (id) => {
    const data = await adminApi.get(`/customers/${id}`).catch(() => null);
    if (data) setSelectedCustomer(data);
  };

  return (
    <div className="p-6">
      {/* Segments overview */}
      {segments && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {Object.entries(segments).map(([seg, count]) => (
            <div key={seg} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-slate-200 mb-1">{count}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${SEGMENT_COLORS[seg] || 'bg-slate-700 text-slate-400'}`}>{seg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher un client..."
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-64" />
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
                {['Client', 'Email', 'Commandes', 'Total dépensé', 'Segment', 'Inscription', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-bold">
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
                    <div className="flex gap-2">
                      <button onClick={() => handleViewDetail(c.id)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">Détail</button>
                      <button
                        onClick={() => handleBlacklist(c.id, c.role === 'BLACKLISTED')}
                        disabled={actionLoading}
                        className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-60 ${c.role === 'BLACKLISTED' ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'}`}>
                        {c.role === 'BLACKLISTED' ? 'Débloquer' : 'Blacklist'}
                      </button>
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
          <span className="px-3 py-1.5 text-slate-400 text-sm">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={customers.length < 20} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv.</button>
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
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                {selectedCustomer.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="text-white text-lg font-bold">{selectedCustomer.name}</div>
                <div className="text-slate-400 text-sm">{selectedCustomer.email}</div>
                {selectedCustomer.phone && <div className="text-slate-500 text-xs">{selectedCustomer.phone}</div>}
              </div>
              <div className="ml-auto text-right">
                <div className="text-blue-400 font-bold text-xl">{fmt(selectedCustomer.totalSpent)} TND</div>
                <div className="text-slate-500 text-xs">Total dépensé</div>
              </div>
            </div>
            <h4 className="text-slate-300 font-medium text-sm mb-3">Historique commandes ({selectedCustomer.orders?.length || 0})</h4>
            {(selectedCustomer.orders || []).length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-4">Aucune commande</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedCustomer.orders.slice(0, 15).map(o => (
                  <div key={o.id} className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                    <span className="text-slate-500 text-xs font-mono">#{o.id}</span>
                    <span className="text-slate-400 text-xs">{o.status}</span>
                    <span className="text-slate-500 text-xs">{fmtDate(o.createdAt)}</span>
                    <span className="ml-auto text-blue-400 font-medium text-sm">{fmt(o.total)} TND</span>
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
