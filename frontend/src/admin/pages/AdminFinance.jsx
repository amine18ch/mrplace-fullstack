import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const fmt = (n) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtInt = (n) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: '2-digit' });

const STATUS_COLORS = {
  PENDING:    'bg-yellow-500/20 text-yellow-400',
  PROCESSING: 'bg-blue-500/20 text-blue-400',
  PAID:       'bg-green-500/20 text-green-400',
};

// Simple bar chart SVG for top vendors
const VendorBarChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-slate-600 text-sm">Aucune donnée</div>;
  const W = 500, H = 120, padB = 30, padT = 20, padL = 10, padR = 10;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...data.map(d => d.grossRevenue), 1);
  const totalW = W - padL - padR;
  const barW = totalW / data.length - 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
      <defs>
        <linearGradient id="vendorBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      {data.slice(0, 5).map((d, i) => {
        const bh = Math.max((d.grossRevenue / maxVal) * chartH, 2);
        const x = padL + i * (totalW / Math.min(data.length, 5)) + 3;
        const y = padT + chartH - bh;
        const valLabel = d.grossRevenue > 999 ? `${Math.round(d.grossRevenue / 1000)}k` : Math.round(d.grossRevenue);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx={3} fill="url(#vendorBarGrad)" opacity={0.85} />
            <text x={x + barW / 2} y={y - 3} textAnchor="middle" fill="#94a3b8" fontSize={8}>{valLabel}</text>
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fill="#475569" fontSize={8}>
              {d.seller?.name?.length > 8 ? d.seller.name.substring(0, 7) + '…' : d.seller?.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default function AdminFinance() {
  const { can } = useAdmin();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [cyclesTotal, setCyclesTotal] = useState(0);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [genResult, setGenResult]   = useState(null);
  const [genOptions, setGenOptions] = useState({ force: false, statuses: ['LIVREE','EXPEDIEE'] });
  const [error, setError]           = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      adminApi.get('/finance/overview'),
      adminApi.get('/finance/payment-cycles'),
      adminApi.get('/finance/report'),
    ]).then(([ov, cy, rp]) => {
      setOverview(ov);
      setCycles(cy.cycles || cy || []);
      setCyclesTotal((cy.cycles || cy || []).length);
      setReport(rp);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleGenerateCycles = async () => {
    setActionLoading(true); setError('');
    try {
      const result = await adminApi.post('/finance/payment-cycles/generate', {
        force:    genOptions.force,
        statuses: genOptions.statuses,
      });
      setGenResult(result);
      setConfirmGenerate(false);
      loadData();
    } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handlePay = async (id) => {
    setActionLoading(true);
    setError('');
    try {
      await adminApi.patch(`/finance/payment-cycles/${id}/pay`, {});
      loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500 text-center">Chargement...</div>;

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {[
          { id: 'overview', label: "Vue d'ensemble" },
          { id: 'cycles', label: `Cycles de paiement (${cyclesTotal})` },
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
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'CA Total', value: `${fmt(overview.totalRevenue)} TND`, color: 'text-emerald-400', sub: 'Toutes commandes' },
              { label: 'Commissions MARKET (10%)', value: `${fmt(overview.totalCommissions)} TND`, color: 'text-blue-400', sub: `${((overview.totalCommissions / Math.max(overview.totalRevenue, 1)) * 100).toFixed(1)}%` },
              { label: 'À reverser aux vendeurs', value: `${fmt(overview.totalNetToVendors)} TND`, color: 'text-orange-400', sub: `${overview.pendingCyclesCount} cycles en attente` },
              { label: 'Déjà reversé', value: `${fmt(overview.totalPaid)} TND`, color: 'text-green-400', sub: `${overview.paidCyclesCount} cycles payés` },
            ].map(kpi => (
              <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className={`text-xl font-bold ${kpi.color} mb-1`}>{kpi.value}</div>
                <div className="text-slate-400 text-xs font-medium">{kpi.label}</div>
                <div className="text-slate-600 text-xs mt-1">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Top vendors chart */}
          {report.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-slate-200 font-semibold text-sm mb-4">Top 5 vendeurs par CA</h3>
              <VendorBarChart data={report.slice(0, 5)} />
            </div>
          )}
        </div>
      )}

      {/* CYCLES */}
      {tab === 'cycles' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-300 font-medium">Cycles de paiement vendeurs</h3>
            {can('finance.write') && (
              <button onClick={() => setConfirmGenerate(true)} disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
                Générer les cycles du mois
              </button>
            )}
          </div>

          {cycles.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucun cycle généré. Cliquez sur "Générer" pour créer les cycles du mois.</div>
          ) : (
            <>
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
                          {(c.status === 'PENDING' || c.status === 'PROCESSING') && can('finance.write') && (
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
                  {/* Total row */}
                  <tfoot>
                    <tr className="bg-slate-800/50 border-t border-slate-700">
                      <td colSpan={2} className="px-4 py-3 text-slate-300 font-bold">TOTAL</td>
                      <td className="px-4 py-3 text-slate-200 font-bold">{fmt(cycles.reduce((s, c) => s + c.grossAmount, 0))} TND</td>
                      <td className="px-4 py-3 text-red-400 font-bold">-{fmt(cycles.reduce((s, c) => s + c.commission, 0))} TND</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">{fmt(cycles.reduce((s, c) => s + c.netAmount, 0))} TND</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
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
                    {['Vendeur', 'Nb commandes', 'CA Total', 'Taux commission', 'Commission', 'Net vendeur'].map(h => (
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
                      <td className="px-4 py-3 text-slate-300 text-center">{r.ordersCount}</td>
                      <td className="px-4 py-3 text-slate-300 font-medium">{fmt(r.grossRevenue)} TND</td>
                      <td className="px-4 py-3 text-blue-400">{((r.commissionRate || 0) * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-red-400">-{fmt(r.commissionAmount)} TND</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">{fmt(r.netAmount)} TND</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800/50 border-t border-slate-700">
                    <td className="px-4 py-3 text-slate-300 font-bold">TOTAL</td>
                    <td className="px-4 py-3 text-slate-200 font-bold text-center">{fmtInt(report.reduce((s, r) => s + r.ordersCount, 0))}</td>
                    <td className="px-4 py-3 text-slate-200 font-bold">{fmt(report.reduce((s, r) => s + r.grossRevenue, 0))} TND</td>
                    <td></td>
                    <td className="px-4 py-3 text-red-400 font-bold">-{fmt(report.reduce((s, r) => s + r.commissionAmount, 0))} TND</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">{fmt(report.reduce((s, r) => s + r.netAmount, 0))} TND</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Résultat génération */}
      {genResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={()=>setGenResult(null)}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700" onClick={e=>e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-3">✅ Génération terminée</h3>
            <p className="text-blue-400 text-sm font-medium mb-3">{genResult.period} · Statuts : {genResult.statuses?.join(', ')}</p>
            <div className="space-y-2 mb-4 text-sm">
              {genResult.created?.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="text-green-400 font-semibold mb-1">✓ {genResult.created.length} cycle(s) créé(s)</div>
                  {genResult.created.map((c,i)=><div key={i} className="text-green-300 text-xs">{c.seller} — {new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(c.netAmount)} DT net</div>)}
                </div>
              )}
              {genResult.updated?.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="text-blue-400 font-semibold mb-1">🔄 {genResult.updated.length} cycle(s) mis à jour</div>
                  {genResult.updated.map((c,i)=><div key={i} className="text-blue-300 text-xs">{c.seller} — {new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(c.netAmount)} DT net</div>)}
                </div>
              )}
              {genResult.skipped?.length > 0 && (
                <div className="bg-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 font-semibold mb-1">— {genResult.skipped.length} ignoré(s)</div>
                  {genResult.skipped.map((s,i)=><div key={i} className="text-slate-500 text-xs">{s}</div>)}
                </div>
              )}
            </div>
            <button onClick={()=>setGenResult(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">Fermer</button>
          </div>
        </div>
      )}

      {/* Confirm generate modal */}
      {confirmGenerate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-white font-semibold mb-2">Générer les cycles de versement</h3>
            <p className="text-slate-400 text-sm mb-4">Calcule le CA de chaque vendeur pour le mois courant et crée les cycles de paiement correspondants.</p>

            {/* Options */}
            <div className="space-y-3 mb-5">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="text-slate-400 text-xs font-semibold mb-2">STATUTS DE COMMANDES INCLUS</div>
                <div className="space-y-2">
                  {[
                    { v:'LIVREE',   l:'Livrée',   d:'Commandes confirmées livraison' },
                    { v:'EXPEDIEE', l:'Expédiée',  d:'Commandes remises au transporteur' },
                  ].map(s => (
                    <label key={s.v} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox"
                        checked={genOptions.statuses.includes(s.v)}
                        onChange={e => setGenOptions(o => ({
                          ...o, statuses: e.target.checked
                            ? [...o.statuses, s.v]
                            : o.statuses.filter(x=>x!==s.v)
                        }))}
                        className="accent-blue-600 w-4 h-4"
                      />
                      <div>
                        <div className="text-slate-200 text-sm font-medium">{s.l}</div>
                        <div className="text-slate-600 text-xs">{s.d}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl p-4 cursor-pointer">
                <input type="checkbox" checked={genOptions.force}
                  onChange={e=>setGenOptions(o=>({...o, force:e.target.checked}))}
                  className="accent-orange-500 w-4 h-4"
                />
                <div>
                  <div className="text-slate-200 text-sm font-medium">🔄 Forcer le recalcul (recommandé)</div>
                  <div className="text-slate-600 text-xs">
                    Inclut <strong>toutes</strong> les commandes éligibles sans restriction de date.
                    Recalcule les cycles existants non encore payés.
                    Utilisez cette option si des commandes manquent.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmGenerate(false)} className="flex-1 bg-slate-700 text-slate-300 py-2.5 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
              <button onClick={handleGenerateCycles} disabled={actionLoading || !genOptions.statuses.length}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {actionLoading ? 'Génération...' : 'Générer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
