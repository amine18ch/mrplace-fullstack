import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-TN') : '—';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 50 });
    if (moduleFilter) params.append('module', moduleFilter);
    adminApi.get(`/settings/logs?${params}`)
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(); }, [page, moduleFilter]);

  const modules = ['vendors', 'products', 'orders', 'customers', 'finance', 'marketing', 'settings'];

  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
          <option value="">Tous les modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-slate-500 text-sm self-center">{total} action(s)</span>
      </div>

      {loading ? (
        <div className="text-slate-500 text-center py-12">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="text-slate-600 text-center py-12">Aucune action enregistrée</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Admin', 'Action', 'Module', 'Cible', 'Détails', 'IP', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-slate-200 text-sm">{l.admin?.name}</div>
                    <div className="text-slate-500 text-xs">{l.admin?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-slate-800 text-blue-400 px-2 py-1 rounded">{l.action}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">{l.module}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{l.targetId || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate font-mono">{l.details}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{l.ip || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Préc.</button>
          <span className="px-3 py-1.5 text-slate-400 text-sm">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv.</button>
        </div>
      )}
    </div>
  );
}
