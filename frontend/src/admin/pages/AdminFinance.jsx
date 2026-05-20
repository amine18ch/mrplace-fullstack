import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';

const fmt = (n) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: '2-digit' });

const STATUS_COLORS = {
  PENDING:    'bg-yellow-500/20 text-yellow-400',
  PROCESSING: 'bg-blue-500/20 text-blue-400',
  PAID:       'bg-green-500/20 text-green-400',
};

export default function AdminFinance() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      adminApi.get('/finance/overview'),
      adminApi.get('/finance/payment-cycles'),
      adminApi.get('/finance/report'),
    ]).then(([ov, cy, rp]) => {
      setOverview(ov);
      setCycles(cy);
      setReport(rp);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleGenerateCycles = async () => {
    setActionLoading(true);
    try {
      const result = await adminApi.post('/finance/payment-cycles/generate', {});
      alert(`${result.created} cycle(s) généré(s) avec succès`);
      const cy = await adminApi.get('/finance/payment-cycles');
      setCycles(cy);
      const ov = await adminApi.get('/finance/overview');
      setOverview(ov);
    } catch (e) {
      alert('Erreur: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async (id) => {
    setActionLoading(true);
    await adminApi.patch(`/finance/payment-cycles/${id}/pay`, {}).catch(() => {});
    setActionLoading(false);
    const cy = await adminApi.get('/finance/payment-cycles').catch(() => cycles);
    setCycles(cy);
    const ov = await adminApi.get('/finance/overview').catch(() => overview);
    setOverview(ov);
  };

  if (loading) return <div className="p-8 text-slate-500 text-center">Chargement...</div>;

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {[
          { id: 'overview', label: "Vue d'ensemble" },
          { id: 'cycles', label: `Cycles de paiement (${cycles.length})` },
          { id: 'report', label: 'Rapport commissions' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && overview && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'CA Total', value: `${fmt(overview.totalRevenue)} TND`, color: 'text-emerald-400', icon: '💰' },
              { label: 'Commissions', value: `${fmt(overview.totalCommissions)} TND`, color: 'text-blue-400', icon: '📊' },
              { label: 'À reverser', value: `${fmt(overview.totalToReverse)} TND`, color: 'text-orange-400', icon: '💸' },
              { label: 'Déjà reversé', value: `${fmt(overview.paidCycles)} TND`, color: 'text-green-400', icon: '✅' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="text-2xl mb-2">{kpi.icon}</div>
                <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-slate-500 text-xs mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-slate-400 text-sm mb-2">Cycles en attente</div>
              <div className="text-3xl font-bold text-yellow-400">{overview.pendingCycles}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-slate-400 text-sm mb-2">Taux de commission moyen</div>
              <div className="text-3xl font-bold text-blue-400">
                {overview.totalRevenue > 0 ? ((overview.totalCommissions / overview.totalRevenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CYCLES */}
      {tab === 'cycles' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-300 font-medium">Cycles de paiement vendeurs</h3>
            <button onClick={handleGenerateCycles} disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
              Générer les cycles du mois
            </button>
          </div>

          {cycles.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucun cycle généré. Cliquez sur "Générer" pour créer les cycles du mois.</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Vendeur', 'Période', 'Montant brut', 'Commission', 'Net à reverser', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cycles.map(c => (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.seller?.logo}</span>
                          <span className="text-slate-200 text-sm">{c.seller?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {fmtDate(c.periodStart)} → {fmtDate(c.periodEnd)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium">{fmt(c.grossAmount)} TND</td>
                      <td className="px-4 py-3 text-red-400 text-sm">-{fmt(c.commission)} TND</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">{fmt(c.netAmount)} TND</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[c.status] || 'bg-slate-700 text-slate-400'}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.status === 'PENDING' && (
                          <button onClick={() => handlePay(c.id)} disabled={actionLoading}
                            className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-500/10 disabled:opacity-60 transition-colors">
                            Marquer payé
                          </button>
                        )}
                        {c.status === 'PAID' && c.paidAt && (
                          <span className="text-xs text-slate-500">Payé le {fmtDate(c.paidAt)}</span>
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

      {/* REPORT */}
      {tab === 'report' && (
        <div>
          <h3 className="text-slate-300 font-medium mb-4">Rapport commissions par vendeur</h3>
          {report.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucune donnée de vente</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Vendeur', 'CA Brut', 'Taux commission', 'Commission', 'Net à reverser'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.map((r, i) => (
                    <tr key={r.seller.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs w-4">{i + 1}</span>
                          <span className="text-lg">{r.seller.logo}</span>
                          <span className="text-slate-200 font-medium">{r.seller.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium">{fmt(r.grossAmount)} TND</td>
                      <td className="px-4 py-3 text-blue-400">{(r.rate * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-red-400">-{fmt(r.commission)} TND</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">{fmt(r.netAmount)} TND</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-300 font-bold">TOTAL</td>
                    <td className="px-4 py-3 text-slate-200 font-bold">{fmt(report.reduce((s, r) => s + r.grossAmount, 0))} TND</td>
                    <td></td>
                    <td className="px-4 py-3 text-red-400 font-bold">-{fmt(report.reduce((s, r) => s + r.commission, 0))} TND</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">{fmt(report.reduce((s, r) => s + r.netAmount, 0))} TND</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
