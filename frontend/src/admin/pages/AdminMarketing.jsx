import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600";

// Formulaire au niveau module (pas de perte de focus)
const PromoForm = ({ form, set, onSubmit, onCancel, loading }) => (
  <form onSubmit={onSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-5">
    <h4 className="text-slate-300 font-medium text-sm mb-4">Nouveau code promotionnel</h4>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Code (auto-majuscules) *</label>
        <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
          placeholder="EX: SUMMER30" required className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Réduction (%) *</label>
        <input value={form.discount} onChange={e => set('discount', e.target.value)}
          placeholder="30" type="number" min="1" max="100" step="1" required className={inputCls} />
      </div>
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Limite d'utilisations</label>
        <input value={form.maxUses} onChange={e => set('maxUses', e.target.value)}
          placeholder="Illimité" type="number" min="0" className={inputCls} />
      </div>
    </div>
    <div className="flex items-center gap-3">
      <button type="submit" disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm px-5 py-2.5 rounded-lg font-medium transition">
        {loading ? '...' : 'Créer le code'}
      </button>
      <button type="button" onClick={onCancel} className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-4 py-2.5 rounded-lg transition">
        Annuler
      </button>
      <p className="text-slate-600 text-xs ml-2">La réduction est appliquée sur le sous-total de la commande</p>
    </div>
  </form>
);

export default function AdminMarketing() {
  const { can } = useAdmin();
  const [promos, setPromos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [actLoad, setActLoad]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ code:'', discount:'', maxUses:'' });

  const load = () => {
    setLoading(true);
    adminApi.get('/marketing/promo-codes').then(setPromos).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const flash = (msg, err=false) => {
    if (err) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setActLoad(true); setError('');
    try {
      await adminApi.post('/marketing/promo-codes', {
        code:     form.code.toUpperCase(),
        discount: parseFloat(form.discount) / 100,
        isActive: true,
      });
      setForm({ code:'', discount:'', maxUses:'' });
      setShowForm(false);
      flash('Code créé ✓');
      load();
    } catch (e) { flash(e.message, true); }
    setActLoad(false);
  };

  const toggle = async (id) => {
    try { await adminApi.patch(`/marketing/promo-codes/${id}/toggle`, {}); load(); }
    catch (e) { flash(e.message, true); }
  };

  const del = async (id, code) => {
    if (!window.confirm(`Supprimer le code "${code}" ?`)) return;
    try { await adminApi.delete(`/marketing/promo-codes/${id}`); flash('Supprimé ✓'); load(); }
    catch (e) { flash(e.message, true); }
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Codes promotionnels</h2>
          <p className="text-slate-500 text-sm mt-0.5">{promos.length} code(s) configuré(s)</p>
        </div>
        {can('marketing.write') && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition flex items-center gap-2">
            + Nouveau code
          </button>
        )}
      </div>

      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {/* Formulaire */}
      {showForm && can('marketing.write') && (
        <PromoForm form={form} set={set} onSubmit={handleCreate} onCancel={() => setShowForm(false)} loading={actLoad} />
      )}

      {/* Liste */}
      {loading ? (
        <div className="text-slate-500 text-center py-12">Chargement...</div>
      ) : promos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
          <div className="text-5xl mb-3">🏷️</div>
          <div className="text-slate-400 font-medium">Aucun code promo</div>
          <div className="text-slate-600 text-sm mt-1">Créez des codes de réduction pour vos clients</div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Code', 'Réduction', 'Utilisations', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.map((p, idx) => (
                <tr key={p.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition ${idx === promos.length-1 ? 'border-0' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded text-sm tracking-wider">{p.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-green-400 font-bold">{Math.round(p.discount * 100)}%</span>
                    <span className="text-slate-600 text-xs ml-1">de remise</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{p.uses || 0} utilisation(s)</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {p.isActive ? '● Actif' : '● Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => toggle(p.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition ${p.isActive ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                        {p.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => del(p.id, p.code)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="text-slate-400 text-xs font-semibold mb-2 uppercase">Comment fonctionnent les codes ?</div>
        <ul className="text-slate-600 text-xs space-y-1">
          <li>• Le client saisit le code lors du checkout</li>
          <li>• La réduction s'applique sur le sous-total (avant livraison et TVA)</li>
          <li>• Chaque code peut être désactivé à tout moment</li>
          <li>• Le nombre d'utilisations est comptabilisé automatiquement</li>
        </ul>
      </div>
    </div>
  );
}
