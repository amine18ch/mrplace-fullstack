import { useEffect, useState } from 'react';
import { sellerApi } from '../api/sellerClient';

const STATUS_COLORS = {
  PENDING:   'bg-yellow-500/20 text-yellow-400',
  APPROVED:  'bg-green-500/20 text-green-400',
  REJECTED:  'bg-red-500/20 text-red-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
};
const STATUS_LABELS = { PENDING:'En attente', APPROVED:'Approuvé', REJECTED:'Refusé', COMPLETED:'Terminé' };

const REASONS = [
  'Produit défectueux','Produit non conforme','Produit endommagé','Mauvaise taille/couleur',
  'Produit non reçu','Changement d\'avis','Autre',
];

export default function SellerReturns() {
  const [returns, setReturns]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolution, setRes]    = useState('');
  const [actLoad, setActLoad]   = useState(false);
  const [success, setSuccess]   = useState('');

  const load = () => {
    setLoading(true);
    sellerApi.get('/returns')
      .then(setReturns)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAction = async (status) => {
    setActLoad(true);
    try {
      await sellerApi.patch(`/returns/${selected.id}`, { status, resolution });
      setSuccess(status === 'APPROVED' ? 'Retour approuvé ✓' : 'Retour refusé');
      setSelected(null); setRes('');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch {}
    setActLoad(false);
  };

  const fmtDate = d => new Date(d).toLocaleDateString('fr-TN', { day:'2-digit', month:'short', year:'numeric' });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Demandes de retour</h2>
          <p className="text-slate-500 text-sm mt-0.5">{returns.length} demande(s)</p>
        </div>
      </div>

      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {loading ? (
        <div className="text-slate-500 text-center py-16">Chargement...</div>
      ) : returns.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-slate-400 font-medium">Aucune demande de retour</div>
          <div className="text-slate-600 text-sm mt-1">Les demandes de retour de vos clients apparaîtront ici</div>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map(r => (
            <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-slate-300 font-mono text-sm font-bold">
                      Commande #{String(r.orderId).padStart(4,'0')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-slate-700 text-slate-400'}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </div>
                  <div className="text-slate-400 text-sm">
                    <span className="font-medium text-slate-300">{r.user?.name}</span>
                    {' — '}{r.user?.email}
                  </div>
                  <div className="text-blue-400 text-sm mt-1 font-medium">Raison: {r.reason}</div>
                  {r.description && <p className="text-slate-500 text-sm mt-1">{r.description}</p>}
                  <div className="text-slate-600 text-xs mt-1">{fmtDate(r.createdAt)}</div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="text-blue-400 font-bold">{r.order?.total?.toFixed(3)} DT</div>
                  {r.status === 'PENDING' && (
                    <button onClick={() => { setSelected(r); setRes(''); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                      Traiter
                    </button>
                  )}
                  {r.resolution && (
                    <div className="text-slate-500 text-xs max-w-xs text-right">"{r.resolution}"</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal traitement */}
      {selected && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold">Traiter la demande de retour</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-900 rounded-xl p-4">
                <div className="text-slate-400 text-xs font-semibold mb-2">DEMANDE</div>
                <div className="text-slate-200 font-medium">{selected.user?.name}</div>
                <div className="text-blue-400 text-sm mt-1">{selected.reason}</div>
                {selected.description && <p className="text-slate-500 text-sm mt-1">{selected.description}</p>}
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold block mb-2">VOTRE RÉPONSE (OPTIONNEL)</label>
                <textarea value={resolution} onChange={e => setRes(e.target.value)} rows={3}
                  placeholder="Expliquez votre décision au client..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleAction('APPROVED')} disabled={actLoad}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  ✓ Approuver le retour
                </button>
                <button onClick={() => handleAction('REJECTED')} disabled={actLoad}
                  className="flex-1 bg-red-600/80 hover:bg-red-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  ✗ Refuser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
