import { useEffect, useState } from 'react';
import { adminApi, getAdminToken } from '../api/adminClient';

const openDoc = (path) => {
  const token = getAdminToken() || '';
  window.open(`${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`, '_blank');
};

const Card = ({ icon, title, desc, children }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    <div className="flex items-center gap-3 mb-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-white font-semibold">{title}</div>
        <div className="text-slate-500 text-xs">{desc}</div>
      </div>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

const DocBtn = ({ label, sub, onClick, color = 'blue' }) => (
  <button onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition text-left ${
      color === 'blue'   ? 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20' :
      color === 'green'  ? 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20' :
      color === 'purple' ? 'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20' :
      color === 'orange' ? 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20' :
      'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
    }`}>
    <div>
      <div>{label}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
  </button>
);

export default function AdminDocuments() {
  const [cycles, setCycles]   = useState([]);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth]     = useState(new Date().getMonth());
  const [year, setYear]       = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrders, setSelectedOrders] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.get('/finance/payment-cycles'),
      adminApi.get('/orders?limit=50&status=EXPEDIEE'),
    ]).then(([c, o]) => {
      setCycles(c.cycles || c || []);
      setOrders(o.orders || []);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const periodParam = `month=${month}&year=${year}`;

  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">📋 Documents Officiels</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Génération de documents conformes à la législation tunisienne — Finance, Comptabilité & Transport
        </p>
      </div>

      {/* Sélecteur de période */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="text-slate-400 text-xs font-semibold mb-3 uppercase">Période de référence pour les documents financiers</div>
        <div className="flex gap-3 items-center flex-wrap">
          <select value={month} onChange={e=>setMonth(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
            {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-slate-400 text-sm">→ Documents pour <strong className="text-white">{MONTHS[month]} {year}</strong></span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        {/* ── FINANCE ── */}
        <div className="space-y-4">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <span>💰</span> Documents Financiers & Comptables
          </div>

          <Card icon="🧾" title="État Comptable Mensuel"
            desc="Compte de résultat, commandes, versements vendeurs">
            <DocBtn label="Générer l'état comptable"
              sub={`${MONTHS[month]} ${year} — Rapport complet`}
              onClick={() => openDoc(`/api/admin/documents/finance/etat-comptable?${periodParam}`)}
              color="blue" />
          </Card>

          <Card icon="🏦" title="Déclaration TVA"
            desc="TVA collectée sur commissions — 19% — Formulaire DGI">
            <DocBtn label="Générer la déclaration TVA"
              sub={`${MONTHS[month]} ${year} — À déposer avant le 28`}
              onClick={() => openDoc(`/api/admin/documents/finance/declaration-tva?${periodParam}`)}
              color="green" />
          </Card>

          <Card icon="📤" title="Bordereaux de Versement"
            desc="Un bordereau officiel par vendeur pour chaque cycle de paiement">
            {loading ? (
              <div className="text-slate-500 text-xs text-center py-3">Chargement des cycles...</div>
            ) : cycles.length === 0 ? (
              <div className="text-slate-600 text-xs text-center py-3">Aucun cycle de paiement</div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {cycles.map(c => (
                  <DocBtn key={c.id}
                    label={c.seller?.name || `Cycle #${c.id}`}
                    sub={`${new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(c.netAmount)} TND — ${c.status}`}
                    onClick={() => openDoc(`/api/admin/documents/finance/bordereau-versement/${c.id}`)}
                    color={c.status === 'PAID' ? 'green' : 'orange'} />
                ))}
              </div>
            )}
          </Card>

          {/* Résumé légal */}
          <div className="bg-slate-900 border border-blue-500/20 rounded-xl p-4">
            <div className="text-blue-400 text-xs font-semibold mb-2">📜 Références légales tunisiennes</div>
            <ul className="text-slate-500 text-xs space-y-1">
              <li>• <strong className="text-slate-400">Art. 68 LF 2025</strong> — Retenue source plateformes numériques</li>
              <li>• <strong className="text-slate-400">Code TVA Art. 5</strong> — Taux 19% sur services</li>
              <li>• <strong className="text-slate-400">SCE Loi 96-112</strong> — Système Comptable des Entreprises</li>
              <li>• <strong className="text-slate-400">CDPF Art. 19</strong> — Dépôt déclarations le 28 du mois</li>
              <li>• <strong className="text-slate-400">Note DGI 14/2022</strong> — Facturation électronique</li>
            </ul>
          </div>
        </div>

        {/* ── TRANSPORT ── */}
        <div className="space-y-4">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <span>🚚</span> Documents Transport & Logistique
          </div>

          <Card icon="📦" title="Bon de Livraison (par commande)"
            desc="Document officiel accompagnant chaque colis — obligatoire">
            {loading ? (
              <div className="text-slate-500 text-xs text-center py-3">Chargement...</div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {orders.slice(0,15).map(o => {
                  const addr = (() => { try { return JSON.parse(o.shippingAddress||'{}'); } catch { return {}; } })();
                  return (
                    <DocBtn key={o.id}
                      label={`Commande #${String(o.id).padStart(6,'0')}`}
                      sub={`${o.user?.name || '—'} · ${addr.governorate || '—'} · ${new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(o.total)} TND`}
                      onClick={() => openDoc(`/api/admin/documents/transport/bon-livraison/${o.id}`)}
                      color="purple" />
                  );
                })}
                {orders.length === 0 && <div className="text-slate-600 text-xs text-center py-3">Aucune commande expédiée</div>}
              </div>
            )}
          </Card>

          <Card icon="🗺️" title="Feuille de Route Livreur"
            desc="Document obligatoire Ministère du Transport — contrôle routier">
            <div className="space-y-2 mb-3">
              <div>
                <label className="text-slate-500 text-xs block mb-1">Date de tournée</label>
                <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-slate-500 text-xs block mb-1">IDs commandes spécifiques (optionnel, séparés par virgule)</label>
                <input type="text" value={selectedOrders} onChange={e=>setSelectedOrders(e.target.value)}
                  placeholder="Ex: 1,2,3,4 (vide = commandes du jour)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none placeholder:text-slate-600" />
              </div>
            </div>
            <DocBtn label="Générer la feuille de route"
              sub="Toutes les livraisons de la journée sélectionnée"
              onClick={() => openDoc(`/api/admin/documents/transport/feuille-route?date=${selectedDate}&orders=${selectedOrders}`)}
              color="purple" />
          </Card>

          {/* Résumé légal transport */}
          <div className="bg-slate-900 border border-purple-500/20 rounded-xl p-4">
            <div className="text-purple-400 text-xs font-semibold mb-2">🚛 Cadre légal transport tunisien</div>
            <ul className="text-slate-500 text-xs space-y-1">
              <li>• <strong className="text-slate-400">Décret 2021-417</strong> — Transport routier marchandises</li>
              <li>• <strong className="text-slate-400">Loi 2004-33</strong> — Organisation transports terrestres</li>
              <li>• <strong className="text-slate-400">Code route Art. 55</strong> — Obligation bon de transport</li>
              <li>• <strong className="text-slate-400">Arrêté Transport 17/03/2009</strong> — Feuille de route obligatoire</li>
              <li>• <strong className="text-slate-400">Urgences</strong> — Police 197 · Garde Nationale 198 · SAMU 190</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
