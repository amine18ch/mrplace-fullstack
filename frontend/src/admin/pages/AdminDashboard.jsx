import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const fmt = (n) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit' });

const STATUS_COLORS = {
  EN_ATTENTE:     'bg-yellow-500/20 text-yellow-400',
  CONFIRMEE:      'bg-blue-500/20 text-blue-400',
  EN_PREPARATION: 'bg-indigo-500/20 text-indigo-400',
  EXPEDIEE:       'bg-purple-500/20 text-purple-400',
  LIVREE:         'bg-green-500/20 text-green-400',
  ANNULEE:        'bg-red-500/20 text-red-400',
  // legacy
  CONFIRME:       'bg-blue-500/20 text-blue-400',
  EXPEDIE:        'bg-purple-500/20 text-purple-400',
  LIVRE:          'bg-green-500/20 text-green-400',
  ANNULE:         'bg-red-500/20 text-red-400',
};

// Line Chart SVG component
const LineChart = ({ data }) => {
  const [tooltip, setTooltip] = useState(null);
  if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-slate-600 text-sm">Pas de données</div>;

  const W = 600, H = 160, padL = 50, padR = 20, padT = 15, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(...data.map(d => d.amount), 1);
  const pts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - (d.amount / maxVal) * chartH,
    ...d
  }));

  const pathD = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${acc} C${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L${pts[pts.length - 1].x},${padT + chartH} L${padL},${padT + chartH} Z`;

  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => ({
    val: (maxVal / ySteps) * (ySteps - i),
    y: padT + (i / ySteps) * chartH
  }));

  const xLabels = data.filter((_, i) => i % 5 === 0).map((d) => ({
    label: fmtDate(d.date),
    x: padL + (data.indexOf(d) / Math.max(data.length - 1, 1)) * chartW
  }));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yLabels.map((yl, i) => (
          <g key={i}>
            <line x1={padL} y1={yl.y} x2={W - padR} y2={yl.y} stroke="#1e293b" strokeWidth={1} />
            <text x={padL - 6} y={yl.y + 4} textAnchor="end" fill="#475569" fontSize={10}>
              {yl.val > 999 ? `${Math.round(yl.val / 1000)}k` : Math.round(yl.val)}
            </text>
          </g>
        ))}
        {xLabels.map((xl, i) => (
          <text key={i} x={xl.x} y={H - 4} textAnchor="middle" fill="#475569" fontSize={9}>{xl.label}</text>
        ))}
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" />
        {pts.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x} cy={pt.y} r={4}
            fill="#3b82f6" stroke="#0f172a" strokeWidth={2}
            className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
            onMouseEnter={() => setTooltip({ x: pt.x, y: pt.y, date: pt.date, amount: pt.amount, count: pt.count })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        {tooltip && (
          <g>
            <rect x={Math.min(tooltip.x - 50, W - 110)} y={Math.max(tooltip.y - 42, 0)} width={100} height={36} rx={6} fill="#1e293b" stroke="#334155" strokeWidth={1} />
            <text x={Math.min(tooltip.x, W - 60)} y={Math.max(tooltip.y - 26, 14)} textAnchor="middle" fill="#94a3b8" fontSize={9}>{tooltip.date}</text>
            <text x={Math.min(tooltip.x, W - 60)} y={Math.max(tooltip.y - 13, 27)} textAnchor="middle" fill="#f1f5f9" fontSize={11} fontWeight="bold">{fmt(tooltip.amount)} TND</text>
          </g>
        )}
      </svg>
    </div>
  );
};

// Bar Chart SVG component
const BarChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-slate-600 text-sm">Pas de données</div>;

  const W = 500, H = 130, padB = 35, padT = 20, padL = 10, padR = 10;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  const totalW = W - padL - padR;
  const barW = totalW / data.length - 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const bh = Math.max((d.revenue / maxVal) * chartH, 2);
        const x = padL + i * (totalW / data.length) + 3;
        const y = padT + chartH - bh;
        const labelVal = d.revenue > 999 ? `${Math.round(d.revenue / 1000)}k` : Math.round(d.revenue);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx={3} fill="url(#barGrad)" opacity={0.85} />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="#94a3b8" fontSize={8}>
              {labelVal}
            </text>
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fill="#475569" fontSize={9}>
              {d.name?.length > 7 ? d.name.substring(0, 6) + '…' : d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const KpiCard = ({ title, value, sub, color, icon }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-slate-400 text-xs">{title}</div>
    {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
  </div>
);

export default function AdminDashboard() {
  const { navigateAdmin, can } = useAdmin();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.get('/dashboard/stats')
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-slate-400">Chargement des statistiques...</div>
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4">{error}</div>
    </div>
  );

  if (!stats) return null;

  const alerts = [];
  if ((stats.orders?.pending || 0) > 0 && can('orders.read')) {
    alerts.push({
      type: 'yellow',
      message: `${stats.orders.pending} commande(s) en attente`,
      action: () => navigateAdmin('orders'),
    });
  }
  if ((stats.openDisputes || 0) > 0 && can('disputes.write')) {
    alerts.push({
      type: 'orange',
      message: `${stats.openDisputes} litige(s) ouvert(s)`,
      action: () => navigateAdmin('orders'),
    });
  }
  if ((stats.vendors?.pending || 0) > 0 && can('vendors.read')) {
    alerts.push({
      type: 'blue',
      message: `${stats.vendors.pending} vendeur(s) en attente d'approbation`,
      action: () => navigateAdmin('vendors'),
    });
  }
  if ((stats.pendingPaymentCycles || 0) > 0 && can('finance.read')) {
    alerts.push({
      type: 'indigo',
      message: `${stats.pendingPaymentCycles} cycle(s) de paiement en attente`,
      action: () => navigateAdmin('finance'),
    });
  }

  const ALERT_STYLES = {
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    blue:   'bg-blue-500/10 border-blue-500/30 text-blue-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    red:    'bg-red-500/10 border-red-500/30 text-red-400',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {alerts.map((a, i) => (
            <button key={i} onClick={a.action}
              className={`flex items-center gap-2 border text-sm rounded-lg px-4 py-2 transition-opacity hover:opacity-80 ${ALERT_STYLES[a.type]}`}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {a.message}
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="CA Total (livré)"
          value={`${fmt(stats.revenue?.total)} TND`}
          sub={`Ce mois: ${fmt(stats.revenue?.month)} TND`}
          color="bg-emerald-500/20 text-emerald-400"
          icon="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.31 14.5v1.56h-1.25v-1.5c-1.23-.21-2.22-.86-2.28-2.17h1.23c.07.77.66 1.33 1.88 1.33 1.3 0 1.87-.65 1.87-1.38 0-.68-.4-1.17-1.93-1.51-1.65-.38-2.76-.97-2.76-2.35 0-1.23.96-2.09 2.19-2.27V7h1.25v1.24c1.38.26 2.02 1.16 2.06 2.17H13.3c-.05-.78-.42-1.44-1.7-1.44-1.15 0-1.95.6-1.95 1.38 0 .63.42 1.06 1.87 1.4 1.46.35 2.8.87 2.8 2.47-.01 1.37-.96 2.16-2.01 2.28z"
        />
        <KpiCard
          title="Commissions (10%)"
          value={`${fmt(stats.commissions)} TND`}
          color="bg-blue-500/20 text-blue-400"
          icon="M9 14l6-6M9 8h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <KpiCard
          title="Commandes aujourd'hui"
          value={stats.orders?.today || 0}
          sub={`Total: ${stats.orders?.total || 0}`}
          color="bg-orange-500/20 text-orange-400"
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
        <KpiCard
          title="Vendeurs actifs"
          value={stats.vendors?.active || 0}
          sub={`${stats.vendors?.pending || 0} en attente`}
          color="bg-violet-500/20 text-violet-400"
          icon="M3 3h13v13H3zM16 8h4l3 3v5h-7z"
        />
        <KpiCard
          title="Clients total"
          value={stats.customers?.total || 0}
          sub={`+${stats.customers?.new || 0} ce mois`}
          color="bg-indigo-500/20 text-indigo-400"
          icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"
        />
        <KpiCard
          title="En attente"
          value={stats.orders?.pending || 0}
          color="bg-red-500/20 text-red-400"
          icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-200 font-semibold text-sm">Ventes — 30 derniers jours</h3>
            <span className="text-slate-500 text-xs">TND</span>
          </div>
          <LineChart data={stats.salesByDay || []} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-slate-200 font-semibold text-sm mb-4">Top catégories</h3>
          <BarChart data={stats.topCategories || []} />
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top vendors */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-slate-200 font-semibold text-sm mb-4">Top vendeurs</h3>
          {(stats.topVendors || []).length === 0 ? (
            <div className="text-slate-600 text-sm text-center py-6">Aucune donnée</div>
          ) : (
            <div className="space-y-2">
              {(stats.topVendors || []).map((v, i) => (
                <div key={v.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                  <span className="text-slate-600 text-xs w-4">{i + 1}</span>
                  <span className="text-lg">{v.logo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 text-sm font-medium truncate">{v.name}</div>
                    <div className="text-slate-500 text-xs">{v.orders} commandes · ★ {v.rating}</div>
                  </div>
                  <div className="text-emerald-400 text-sm font-semibold">{fmt(v.revenue)} TND</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-slate-200 font-semibold text-sm mb-4">Dernières commandes</h3>
          {(stats.recentOrders || []).length === 0 ? (
            <div className="text-slate-600 text-sm text-center py-6">Aucune commande</div>
          ) : (
            <div className="space-y-2">
              {(stats.recentOrders || []).slice(0, 8).map(o => (
                <div key={o.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                  <span className="text-slate-500 text-xs font-mono">#{o.id}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 text-sm truncate">{o.user?.name || 'Client'}</div>
                    <div className="text-slate-500 text-xs">{fmtDate(o.createdAt)}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-slate-700 text-slate-400'}`}>
                    {o.status}
                  </span>
                  <div className="text-slate-200 text-sm font-medium">{fmt(o.total)} TND</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Status breakdown */}
      {stats.orders?.byStatus && Object.keys(stats.orders.byStatus).length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-slate-200 font-semibold text-sm mb-4">Commandes par statut</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.orders.byStatus).map(([st, count]) => (
              <div key={st} className={`px-4 py-2 rounded-lg border text-sm font-medium ${STATUS_COLORS[st] ? STATUS_COLORS[st].replace('bg-', 'bg-').replace('/20', '/10') : 'bg-slate-800 text-slate-400'}`}>
                <span className="font-bold text-lg mr-2">{count}</span>
                <span className="opacity-80">{st}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
