import { useEffect, useState } from 'react';
import { sellerApi } from '../api/sellerClient';
import { useSeller } from '../context/SellerContext';

const EMOJIS = ['🏪','💻','👗','🏠','💄','⚽','🧸','🛒','🚗','📱','🍕','🎮','📚','🌿','💎','🍵','☕','🎨','🔧','🏋️'];
const COLORS = ['#2563EB','#7C3AED','#DB2777','#DC2626','#D97706','#059669','#0891B2','#0F172A','#6B7280','#1E293B'];
const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600";

export default function SellerStore() {
  const { seller, setSeller } = useSeller();
  const [form, setForm]         = useState({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [reviews, setReviews]   = useState([]);
  const [finance, setFinance]   = useState(null);
  const [tab, setTab]           = useState('profil');
  const [pwdForm, setPwdForm]   = useState({ current:'', newPassword:'', confirm:'' });

  useEffect(() => {
    if (seller) {
      setForm({
        name: seller.name || '',
        logo: seller.logo || '🏪',
        color: seller.color || '#2563EB',
        bannerColor: seller.bannerColor || '',
        location: seller.location || '',
        responseTime: seller.responseTime || '',
        phone: seller.phone || '',
        description: seller.description || '',
      });
    }
    sellerApi.get('/store/reviews?limit=10').then(d => setReviews(d.reviews||[])).catch(()=>{});
    sellerApi.get('/store/finance').then(setFinance).catch(()=>{});
  }, [seller]);

  const flash = (msg, isErr=false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      const updated = await sellerApi.patch('/store', form);
      setSeller(prev => ({ ...prev, ...updated }));
      flash('Boutique mise à jour ✓');
    } catch (e) { flash(e.message, true); }
    finally { setLoading(false); }
  };

  const handlePwd = async () => {
    if (pwdForm.newPassword !== pwdForm.confirm) return flash('Les mots de passe ne correspondent pas', true);
    setLoading(true);
    try {
      await sellerApi.patch('/auth/password', { current: pwdForm.current, newPassword: pwdForm.newPassword });
      setPwdForm({ current:'', newPassword:'', confirm:'' });
      flash('Mot de passe modifié ✓');
    } catch (e) { flash(e.message, true); }
    finally { setLoading(false); }
  };

  const fmtDT = n => new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(n||0);

  return (
    <div className="p-6 max-w-4xl">
      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-800">
        {[['profil','Ma boutique'],['reviews','Avis clients'],['finance','Mes revenus'],['security','Sécurité']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab===id?'border-blue-500 text-blue-400':'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── PROFIL ─── */}
      {tab === 'profil' && (
        <div>
          {/* Aperçu boutique */}
          <div className="rounded-xl overflow-hidden mb-6 border border-slate-800">
            <div className="h-24 flex items-end px-5 pb-0" style={{ background: form.bannerColor || form.color || '#2563EB' }}>
              <div className="mb-0 transform translate-y-6">
                <div className="w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center text-3xl shadow-xl"
                  style={{ background: form.color || '#2563EB' }}>
                  {form.logo}
                </div>
              </div>
            </div>
            <div className="bg-slate-900 pt-8 px-5 pb-4">
              <div className="text-white font-bold text-xl">{form.name || seller?.name}</div>
              <div className="text-slate-400 text-sm">{form.location}</div>
              {form.description && <div className="text-slate-500 text-xs mt-2 line-clamp-2">{form.description}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Nom de la boutique</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Téléphone</label>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className={inputCls} placeholder="+216 XX XXX XXX" />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Localisation</label>
              <input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className={inputCls} placeholder="Tunis, Tunisie" />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Délai de réponse</label>
              <input value={form.responseTime} onChange={e=>setForm({...form,responseTime:e.target.value})} className={inputCls} placeholder="sous 1 heure" />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Description de la boutique</label>
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
              rows={3} className={`${inputCls} resize-none`} placeholder="Décrivez votre boutique, vos spécialités..." />
          </div>

          {/* Logo */}
          <div className="mb-4">
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Logo (emoji)</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-3xl border border-slate-700" style={{background:form.color}}>
                {form.logo}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setForm({...form,logo:e})}
                    className={`text-2xl p-1.5 rounded-lg hover:bg-slate-800 ${form.logo===e?'bg-slate-800 ring-2 ring-blue-500':''}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Couleur principale */}
          <div className="mb-4">
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Couleur principale</label>
            <div className="flex items-center gap-3 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm({...form,color:c})}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color===c?'border-white scale-110':'border-slate-700'}`}
                  style={{background:c}} />
              ))}
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}
                  className="w-9 h-9 rounded-full cursor-pointer border-0 bg-transparent" />
                <span className="text-slate-500 text-xs">{form.color}</span>
              </div>
            </div>
          </div>

          {/* Couleur bannière */}
          <div className="mb-6">
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Couleur de bannière (optionnel)</label>
            <div className="flex items-center gap-3 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm({...form,bannerColor:c})}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.bannerColor===c?'border-white scale-110':'border-slate-700'}`}
                  style={{background:c}} />
              ))}
              <button onClick={() => setForm({...form,bannerColor:''})}
                className={`text-xs px-2 py-1 rounded-lg border ${!form.bannerColor?'border-blue-500 text-blue-400':'border-slate-700 text-slate-500'}`}>
                Idem couleur principale
              </button>
            </div>
          </div>

          <button onClick={handleSave} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-medium transition-colors">
            {loading ? 'Sauvegarde...' : '💾 Sauvegarder la boutique'}
          </button>
        </div>
      )}

      {/* ─── AVIS ─── */}
      {tab === 'reviews' && (
        <div>
          {reviews.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="text-5xl mb-3">⭐</div>
              <div className="text-slate-400 font-medium">Aucun avis pour l'instant</div>
              <div className="text-slate-600 text-sm mt-1">Vos clients peuvent laisser des avis sur vos produits</div>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                      {r.user?.name?.[0]?.toUpperCase()||'?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-200 text-sm font-medium">{r.user?.name}</span>
                        <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                        <span className="text-slate-600 text-xs ml-auto">{new Date(r.createdAt).toLocaleDateString('fr-TN')}</span>
                      </div>
                      <div className="text-slate-400 text-xs mb-1">{r.product?.title}</div>
                      <p className="text-slate-300 text-sm">{r.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── FINANCE ─── */}
      {tab === 'finance' && finance && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label:'CA Brut total', value: fmtDT(finance.totalGross)+' DT', color:'text-green-400' },
              { label:'Commission MARKET', value: fmtDT(finance.totalCommission)+' DT', sub: `${(finance.commissionRate*100).toFixed(0)}%`, color:'text-slate-400' },
              { label:'Vos revenus nets', value: fmtDT(finance.totalNet)+' DT', color:'text-blue-400' },
              { label:'Versements', value: finance.paymentCycles?.filter(c=>c.status==='PAID').length+' effectués', color:'text-purple-400' },
            ].map(k => (
              <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                <div className="text-slate-500 text-xs mt-1">{k.label}</div>
                {k.sub && <div className="text-slate-600 text-xs">{k.sub}</div>}
              </div>
            ))}
          </div>
          {finance.paymentCycles?.length > 0 && (
            <div>
              <h3 className="text-slate-300 font-medium mb-3">Historique des versements</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-800">
                    {['Période','Brut','Commission','Net','Statut'].map(h=><th key={h} className="text-left px-4 py-3 text-slate-500 text-xs">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {finance.paymentCycles.map(c => (
                      <tr key={c.id} className="border-b border-slate-800/40">
                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(c.periodStart).toLocaleDateString('fr-TN')} — {new Date(c.periodEnd).toLocaleDateString('fr-TN')}</td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{fmtDT(c.grossAmount)} DT</td>
                        <td className="px-4 py-3 text-red-400/70 text-xs">-{fmtDT(c.commission)} DT</td>
                        <td className="px-4 py-3 text-blue-400 font-medium text-xs">{fmtDT(c.netAmount)} DT</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${c.status==='PAID'?'bg-green-500/20 text-green-400':'bg-yellow-500/20 text-yellow-400'}`}>
                            {c.status==='PAID'?'Versé':'En attente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SÉCURITÉ ─── */}
      {tab === 'security' && (
        <div className="max-w-md">
          <h3 className="text-slate-200 font-semibold mb-4">Changer le mot de passe</h3>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Mot de passe actuel</label>
              <input type="password" value={pwdForm.current} onChange={e=>setPwdForm({...pwdForm,current:e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Nouveau mot de passe</label>
              <input type="password" value={pwdForm.newPassword} onChange={e=>setPwdForm({...pwdForm,newPassword:e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Confirmer le nouveau mot de passe</label>
              <input type="password" value={pwdForm.confirm} onChange={e=>setPwdForm({...pwdForm,confirm:e.target.value})} className={inputCls} />
            </div>
          </div>
          <button onClick={handlePwd} disabled={loading || !pwdForm.current || !pwdForm.newPassword}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
            {loading ? '...' : 'Modifier le mot de passe'}
          </button>
        </div>
      )}
    </div>
  );
}
