import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';

const STATUS_COLORS = {
  DRAFT:      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  SENT:       'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SIGNED:     'bg-green-500/20 text-green-400 border-green-500/30',
  TERMINATED: 'bg-red-500/20 text-red-400 border-red-500/30',
};
const STATUS_LABELS = { DRAFT:'Brouillon', SENT:'Envoyé', SIGNED:'Signé', TERMINATED:'Résilié' };

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600";

const GenerateForm = ({ form, set, onSubmit, saving, onCancel }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Commission sur ventes (%)</label>
        <input type="number" min="0" max="50" step="0.5" value={form.tauxCommission} onChange={e=>set('tauxCommission',e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Abonnement mensuel (TND)</label>
        <input type="number" min="0" step="0.001" value={form.montantAbonnement} onChange={e=>set('montantAbonnement',e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Mise en avant (TND/sem.)</label>
        <input type="number" min="0" step="0.001" value={form.tarifMiseEnAvant} onChange={e=>set('tarifMiseEnAvant',e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Retenue à la source (%)</label>
        <input type="number" min="0" max="30" step="0.5" value={form.tauxRetenueSource} onChange={e=>set('tauxRetenueSource',e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Fréquence de versement</label>
        <select value={form.frequenceVersement} onChange={e=>set('frequenceVersement',e.target.value)} className={inputCls}>
          <option>Hebdomadaire</option>
          <option>Bimensuel</option>
          <option>Mensuel</option>
          <option>Trimestriel</option>
        </select>
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Seuil minimum versement (TND)</label>
        <input type="number" min="0" step="0.001" value={form.seuilVersement} onChange={e=>set('seuilVersement',e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Durée initiale (mois)</label>
        <input type="number" min="1" value={form.dureeInitiale} onChange={e=>set('dureeInitiale',e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Date de début du contrat</label>
        <input type="date" value={form.dateDebut} onChange={e=>set('dateDebut',e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Délai mise en demeure (jours)</label>
        <input type="number" min="1" value={form.delaiMiseEnDemeure} onChange={e=>set('delaiMiseEnDemeure',e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Délai préavis résiliation (jours)</label>
        <input type="number" min="1" value={form.delaiPreavisResiliation} onChange={e=>set('delaiPreavisResiliation',e.target.value)} className={inputCls} />
      </div>
    </div>
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm">Annuler</button>
      <button type="button" onClick={onSubmit} disabled={saving}
        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
        {saving ? '...' : '📄 Générer le contrat'}
      </button>
    </div>
  </div>
);

export default function AdminContracts() {
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | 'generate' | 'preview'
  const [selected, setSelected]   = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [genSellerId, setGenSellerId] = useState('');
  const [form, setForm]           = useState({
    tauxCommission:'10', montantAbonnement:'0', tarifMiseEnAvant:'0',
    tauxRetenueSource:'0', frequenceVersement:'Mensuel', seuilVersement:'100',
    dureeInitiale:'12', delaiMiseEnDemeure:'5', delaiPreavisResiliation:'30',
    dateDebut: new Date().toISOString().split('T')[0],
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      adminApi.get('/contracts'),
      adminApi.get('/vendors?limit=200'),
    ]).then(([c, v]) => {
      setContracts(c);
      setVendors(v.sellers || v || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const flash = (msg, err=false) => {
    if (err) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (!genSellerId) return setError('Sélectionnez un vendeur');
    setSaving(true); setError('');
    try {
      const res = await adminApi.post(`/contracts/generate/${genSellerId}`, {
        tauxCommission:    parseFloat(form.tauxCommission),
        montantAbonnement: parseFloat(form.montantAbonnement),
        tarifMiseEnAvant:  parseFloat(form.tarifMiseEnAvant),
        tauxRetenueSource: parseFloat(form.tauxRetenueSource),
        frequenceVersement: form.frequenceVersement,
        seuilVersement:    parseFloat(form.seuilVersement),
        dureeInitiale:     parseInt(form.dureeInitiale),
        delaiMiseEnDemeure: parseInt(form.delaiMiseEnDemeure),
        delaiPreavisResiliation: parseInt(form.delaiPreavisResiliation),
        dateDebut:         form.dateDebut,
      });
      flash('Contrat généré ✓');
      setModal(null);
      load();
      // Ouvrir la prévisualisation
      setTimeout(() => openPreview(res.contract.id), 500);
    } catch (e) { flash(e.message, true); }
    setSaving(false);
  };

  const openPreview = (id) => {
    setPreviewUrl(`/api/admin/contracts/${id}/html`);
    setModal('preview');
  };

  const sendContract = async (id) => {
    try {
      await adminApi.post(`/contracts/${id}/send`, {});
      flash('Contrat marqué comme envoyé ✓');
      load();
    } catch (e) { flash(e.message, true); }
  };

  const signContract = async (id) => {
    if (!window.confirm('Confirmer la signature électronique du vendeur ?')) return;
    try {
      await adminApi.post(`/contracts/${id}/sign`, {});
      flash('Contrat signé ✓');
      load();
    } catch (e) { flash(e.message, true); }
  };

  const delContract = async (id) => {
    if (!window.confirm('Supprimer ce contrat ?')) return;
    try { await adminApi.delete(`/contracts/${id}`); flash('Supprimé ✓'); load(); }
    catch (e) { flash(e.message, true); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-TN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  // Vendeurs sans contrat
  const contractedIds = new Set(contracts.map(c => c.sellerId));
  const vendorsWithout = vendors.filter(v => !contractedIds.has(v.id));

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">📄 Contrats Vendeurs</h2>
          <p className="text-slate-500 text-sm mt-0.5">{contracts.length} contrat(s) · {vendorsWithout.length} vendeur(s) sans contrat</p>
        </div>
        <button onClick={() => { setGenSellerId(''); setModal('generate'); setError(''); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium flex items-center gap-2">
          + Générer un contrat
        </button>
      </div>

      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {/* Alerte vendeurs sans contrat */}
      {vendorsWithout.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-5">
          <div className="text-yellow-400 text-sm font-semibold mb-2">⚠️ {vendorsWithout.length} vendeur(s) sans contrat :</div>
          <div className="flex flex-wrap gap-2">
            {vendorsWithout.slice(0, 8).map(v => (
              <button key={v.id}
                onClick={() => { setGenSellerId(String(v.id)); setModal('generate'); setError(''); }}
                className="flex items-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 text-xs px-3 py-1.5 rounded-lg transition">
                {v.logo} {v.name} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste des contrats */}
      {loading ? (
        <div className="text-slate-500 text-center py-16">Chargement...</div>
      ) : contracts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
          <div className="text-5xl mb-3">📄</div>
          <div className="text-slate-400 font-medium">Aucun contrat généré</div>
          <div className="text-slate-600 text-sm mt-1 mb-5">Générez un contrat pour chaque vendeur référencé</div>
          <button onClick={() => setModal('generate')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium">+ Générer un contrat</button>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => (
            <div key={c.id} className={`bg-slate-900 border rounded-xl overflow-hidden ${c.status==='SIGNED' ? 'border-green-500/30' : 'border-slate-800'}`}>
              <div className="flex items-center gap-4 px-5 py-4 flex-wrap">
                {/* Logo vendeur */}
                <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xl flex-shrink-0">
                  {c.seller?.logo || '🏪'}
                </div>
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold">{c.seller?.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                    <span className="text-slate-600 text-xs font-mono">{c.ref}</span>
                  </div>
                  <div className="text-slate-500 text-xs mt-1 flex gap-4 flex-wrap">
                    <span>Commission: <span className="text-slate-300">{c.tauxCommission}%</span></span>
                    <span>Durée: <span className="text-slate-300">{c.dureeInitiale} mois</span></span>
                    <span>Créé: <span className="text-slate-300">{fmtDate(c.createdAt)}</span></span>
                    {c.dateSignatureClient && <span>Signé: <span className="text-green-400">{fmtDate(c.dateSignatureClient)}</span></span>}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 flex-wrap flex-shrink-0">
                  <button onClick={() => openPreview(c.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition flex items-center gap-1.5">
                    👁️ Voir
                  </button>
                  {c.status === 'DRAFT' && (
                    <button onClick={() => sendContract(c.id)}
                      className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs rounded-lg hover:bg-blue-500/20 transition">
                      📨 Envoyer
                    </button>
                  )}
                  {(c.status === 'SENT' || c.status === 'DRAFT') && (
                    <button onClick={() => signContract(c.id)}
                      className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs rounded-lg hover:bg-green-500/20 transition">
                      ✅ Signer
                    </button>
                  )}
                  <button onClick={() => { setGenSellerId(String(c.sellerId)); setModal('generate'); }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg transition">
                    🔄 Régénérer
                  </button>
                  <button onClick={() => delContract(c.id)}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs rounded-lg hover:bg-red-500/20 transition">
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal génération */}
      {modal === 'generate' && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <h3 className="text-white font-semibold">📄 Générer un contrat vendeur</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center text-xl">×</button>
            </div>
            <div className="p-5 space-y-5">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Vendeur *</label>
                <select value={genSellerId} onChange={e=>setGenSellerId(e.target.value)} className={inputCls}>
                  <option value="">— Sélectionner un vendeur —</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.logo} {v.name} {contractedIds.has(v.id) ? '(contrat existant)' : '(nouveau)'}</option>
                  ))}
                </select>
              </div>
              <div className="border-t border-slate-700 pt-4">
                <div className="text-slate-400 text-xs font-semibold mb-3 uppercase">Conditions tarifaires</div>
                <GenerateForm form={form} set={set} onSubmit={handleGenerate} saving={saving} onCancel={() => setModal(null)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal prévisualisation HTML */}
      {modal === 'preview' && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex flex-col z-50">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-700 flex-shrink-0">
            <span className="text-white font-semibold">📄 Prévisualisation du contrat</span>
            <div className="flex items-center gap-3">
              <a href={previewUrl} target="_blank" rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition">
                🖨️ Ouvrir pour imprimer / PDF
              </a>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
          </div>
          <iframe src={previewUrl} className="flex-1 w-full bg-white" title="Contrat vendeur" />
        </div>
      )}
    </div>
  );
}
