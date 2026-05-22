import { useEffect, useState } from 'react';
import { sellerApi } from '../api/sellerClient';
import { useSeller } from '../context/SellerContext';

const fmt     = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits:0, maximumFractionDigits:0 }).format(n||0);
const fmtDT   = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits:3 }).format(n||0);

// Graphique courbe SVG
const LineChart = ({ data }) => {
  if (!data || data.length < 2) return (
    <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
      Pas encore assez de données
    </div>
  );
  const W=560, H=120, padL=45, padR=10, padT=10, padB=28;
  const cW=W-padL-padR, cH=H-padT-padB;
  const maxV = Math.max(...data.map(d=>d.amount), 1);
  const pts = data.map((d,i) => ({
    x: padL + (i/(data.length-1))*cW,
    y: padT + cH - (d.amount/maxV)*cH,
    d,
  }));
  // Cubic bezier path
  const path = pts.reduce((acc, pt, i) => {
    if (i===0) return `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    const prev = pts[i-1];
    const cpx = (prev.x+pt.x)/2;
    return acc + ` C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, '');
  const area = path + ` L${pts[pts.length-1].x.toFixed(1)},${(padT+cH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT+cH).toFixed(1)} Z`;
  // Y axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: padT+cH-f*cH, v: maxV*f }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:130}}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {yLabels.map((l,i) => (
        <g key={i}>
          <line x1={padL} x2={W-padR} y1={l.y} y2={l.y} stroke="#1e293b" strokeWidth={0.5}/>
          <text x={padL-4} y={l.y+3} textAnchor="end" fill="#475569" fontSize={8}>
            {l.v>=1000?`${(l.v/1000).toFixed(0)}k`:Math.round(l.v)}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#sg)"/>
      <path d={path} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round"/>
      {pts.filter((_,i)=>i%(Math.ceil(data.length/6))===0).map((pt,i)=>(
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r={3} fill="#3b82f6"/>
          <text x={pt.x} y={H-4} textAnchor="middle" fill="#334155" fontSize={7}>
            {pt.d.date.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
};

const STATUS_COLORS = {
  EN_ATTENTE:'bg-yellow-500/20 text-yellow-400', CONFIRMEE:'bg-blue-500/20 text-blue-400',
  EN_PREPARATION:'bg-indigo-500/20 text-indigo-400', EXPEDIEE:'bg-purple-500/20 text-purple-400',
  LIVREE:'bg-green-500/20 text-green-400', ANNULEE:'bg-red-500/20 text-red-400',
};

export default function SellerDashboard() {
  const { seller, navigate } = useSeller();
  const [stats, setStats]   = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      sellerApi.get('/dashboard/stats'),
      sellerApi.get('/orders?limit=5'),
    ]).then(([s, o]) => {
      setStats(s);
      setOrders(o.orders || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-slate-500">Chargement...</div></div>;

  const kpis = stats ? [
    { label:'CA Total',        value: fmtDT(stats.revenue.total) + ' DT', sub: `Net: ${fmtDT(stats.revenue.net)} DT`, color:'bg-green-500', icon:'💰' },
    { label:'Ce mois',         value: fmtDT(stats.revenue.month) + ' DT', sub: `Mois préc. ${fmtDT(stats.revenue.lastMonth)} DT`, color:'bg-blue-500', icon:'📅' },
    { label:'Commandes',       value: stats.orders.total, sub: `${stats.orders.pending} en attente`, color:'bg-orange-500', icon:'📦' },
    { label:'Produits actifs', value: stats.products.active, sub: `${stats.products.inactive} en modération`, color:'bg-purple-500', icon:'🛍️' },
    { label:'Note moyenne',    value: stats.reviews.avg ? `★ ${stats.reviews.avg}` : '—', sub: `${stats.reviews.count} avis`, color:'bg-yellow-500', icon:'⭐' },
    { label:'Commission MARKET', value: fmtDT(stats.revenue.commission) + ' DT', sub: `Taux: 10%`, color:'bg-slate-600', icon:'🏦' },
  ] : [];

  return (
    <div className="p-6 max-w-6xl">
      {/* Bienvenue */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Bonjour, {seller?.name} 👋</h2>
        <p className="text-slate-400 text-sm mt-1">Voici un aperçu de votre boutique</p>
      </div>

      {/* Alerte modération */}
      {stats?.products.inactive > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-5 flex items-center justify-between">
          <div>
            <span className="text-yellow-400 font-medium text-sm">
              ⏳ {stats.products.inactive} produit(s) en attente de modération
            </span>
            <p className="text-yellow-500/70 text-xs mt-0.5">L'équipe MARKET va les examiner sous peu</p>
          </div>
          <button onClick={() => navigate('products')}
            className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg hover:bg-yellow-500/30 transition-colors">
            Voir
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{k.icon}</span>
              <div className={`w-2 h-2 rounded-full ${k.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{k.value}</div>
            <div className="text-slate-500 text-xs mt-1">{k.label}</div>
            <div className="text-slate-600 text-xs">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Graphique */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h3 className="text-slate-200 font-semibold mb-4">Évolution des ventes (30 jours)</h3>
        <LineChart data={stats?.salesByDay || []} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Top produits */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-200 font-semibold">Top produits</h3>
            <button onClick={() => navigate('products')} className="text-xs text-blue-400 hover:underline">Voir tout →</button>
          </div>
          {(stats?.topProducts || []).length === 0 ? (
            <div className="text-slate-600 text-sm text-center py-6">Aucun produit vendu pour l'instant</div>
          ) : (
            <div className="space-y-3">
              {(stats?.topProducts || []).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs w-4">{i+1}</span>
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-xl">
                    {p.images?.[0] || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 text-xs font-medium truncate">{p.title}</div>
                    <div className="text-slate-500 text-xs">{fmt(p.soldCount)} vendus</div>
                  </div>
                  <div className="text-blue-400 text-sm font-semibold">{fmtDT(p.price)} DT</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commandes récentes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-200 font-semibold">Commandes récentes</h3>
            <button onClick={() => navigate('orders')} className="text-xs text-blue-400 hover:underline">Voir tout →</button>
          </div>
          {orders.length === 0 ? (
            <div className="text-slate-600 text-sm text-center py-6">Aucune commande pour l'instant</div>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <div key={o.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => navigate('orders')}>
                  <div className="text-slate-500 text-xs font-mono">#{String(o.id).padStart(4,'0')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 text-xs truncate">{o.user?.name || 'Client'}</div>
                    <div className="text-slate-600 text-xs">{new Date(o.createdAt).toLocaleDateString('fr-TN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-400 text-xs font-semibold">{fmtDT(o.sellerTotal||o.total)} DT</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[o.status]||'bg-slate-700 text-slate-400'}`}>
                      {o.status?.replace('_',' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
