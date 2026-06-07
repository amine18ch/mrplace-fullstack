import { useState } from 'react';

const STATUS_LABELS = {
  DRAFT: 'Brouillon', READY: 'Prêt', ASSIGNED: 'Assigné', PICKED_UP: 'Enlevé',
  IN_TRANSIT: 'En transit', OUT_FOR_DELIVERY: 'En cours de livraison',
  DELIVERED: 'Livré', FAILED: 'Tentative échouée', RETURNED: 'Retour vendeur', CANCELLED: 'Annulé',
};

const STATUS_COLORS = {
  DELIVERED: 'text-green-600 bg-green-50 border-green-200',
  FAILED: 'text-red-600 bg-red-50 border-red-200',
  RETURNED: 'text-orange-600 bg-orange-50 border-orange-200',
  CANCELLED: 'text-slate-500 bg-slate-50 border-slate-200',
};
const DEFAULT_COLOR = 'text-blue-600 bg-blue-50 border-blue-200';

const STEP_ORDER = ['DRAFT','READY','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'];

const fmtDate = d => d ? new Date(d).toLocaleString('fr-TN', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

export default function TrackingPage() {
  const ref = new URLSearchParams(window.location.search).get('ref') || '';
  const [query, setQuery] = useState(ref);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(ref ? true : false);
  const [error, setError]   = useState('');

  const search = async (refToSearch) => {
    const r = (refToSearch || query).trim();
    if (!r) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(r)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Référence introuvable');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if ref is in URL
  if (ref && !result && !error && loading) {
    search(ref);
  }

  const currentStepIdx = result ? STEP_ORDER.indexOf(result.status) : -1;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
          <div>
            <div className="font-bold text-slate-800 text-sm leading-tight">MARKET</div>
            <div className="text-slate-500 text-xs">Suivi de livraison</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Barre de recherche */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <label className="text-slate-600 text-sm font-medium block mb-2">Référence de suivi</label>
          <div className="flex gap-2">
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Ex: MKT-1234567-ABCD"
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition"
            />
            <button onClick={() => search()} disabled={loading || !query.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition">
              {loading ? '...' : 'Suivre'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
        )}

        {result && (
          <>
            {/* Statut */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-slate-500 text-xs font-mono">{result.trackingRef}</div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[result.status] || DEFAULT_COLOR}`}>
                  {STATUS_LABELS[result.status] || result.status}
                </span>
              </div>

              {/* Destinataire (partiel) */}
              {result.destinataire && (
                <div className="text-slate-700 font-medium">{result.destinataire}</div>
              )}
              <div className="text-slate-500 text-sm">{result.governorate}</div>

              {result.estimatedDelivery && result.status !== 'DELIVERED' && (
                <div className="mt-2 text-blue-600 text-xs">Livraison estimée : {fmtDate(result.estimatedDelivery)}</div>
              )}

              {result.carrier && (
                <div className="mt-2 text-slate-500 text-xs">Transporteur : {result.carrier}</div>
              )}
            </div>

            {/* Steps */}
            {result.mode !== 'THIRD_PARTY' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="relative">
                  {STEP_ORDER.map((step, i) => {
                    const isActive = i === currentStepIdx;
                    const isDone   = i < currentStepIdx || (result.status === 'DELIVERED' && step === 'DELIVERED');
                    const isFuture = i > currentStepIdx;
                    return (
                      <div key={step} className="flex items-start gap-3 pb-4 last:pb-0 relative">
                        {i < STEP_ORDER.length - 1 && (
                          <div className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${isDone?'bg-blue-600':'bg-slate-200'}`} />
                        )}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 z-10 border-2 ${isActive?'bg-blue-600 border-blue-600 text-white':isDone?'bg-blue-100 border-blue-400 text-blue-600':'bg-white border-slate-200 text-slate-400'}`}>
                          {isDone && !isActive ? '✓' : i + 1}
                        </div>
                        <div className="pt-0.5">
                          <div className={`text-sm font-medium ${isActive?'text-blue-700':isDone?'text-slate-700':'text-slate-400'}`}>
                            {STATUS_LABELS[step]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Historique */}
            {result.events?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="text-slate-700 font-semibold text-sm mb-3">Historique</div>
                <div className="space-y-3">
                  {result.events.map((ev, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                      <div>
                        <div className="text-slate-700 text-sm font-medium">{STATUS_LABELS[ev.status] || ev.status}</div>
                        {ev.note && <div className="text-slate-500 text-xs">{ev.note}</div>}
                        <div className="text-slate-400 text-xs">{fmtDate(ev.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
