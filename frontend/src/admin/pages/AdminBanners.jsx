import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const EMOJIS = ['🎉','📱','💻','👗','🏠','💄','⚽','🧸','🛒','🚗','📺','🎮','📷','⌚','👟','🧴','💋','🌸','🚚','🛍️','💥','🔥','⚡','🌟','🎁','💰','🏷️'];
const PRESETS = [
  { label:'Bleu foncé → Bleu', bgFrom:'#1E3A8A', bgTo:'#2563EB' },
  { label:'Bleu → Ciel',       bgFrom:'#2563EB', bgTo:'#60A5FA' },
  { label:'Violet',            bgFrom:'#4F46E5', bgTo:'#7C3AED' },
  { label:'Rose',              bgFrom:'#DB2777', bgTo:'#EC4899' },
  { label:'Vert',              bgFrom:'#059669', bgTo:'#10B981' },
  { label:'Orange',            bgFrom:'#D97706', bgTo:'#F59E0B' },
  { label:'Ardoise',           bgFrom:'#0F172A', bgTo:'#1E293B' },
];

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600";

const emptyForm = { title:'', subtitle:'', description:'', ctaText:'Découvrir', catSlug:'', bgFrom:'#1E3A8A', bgTo:'#2563EB', emoji:'🎉', sortOrder:'0' };

export default function AdminBanners() {
  const { can } = useAdmin();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'create' | 'edit'
  const [form, setForm]       = useState(emptyForm);
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [cats, setCats]       = useState([]);

  const load = () => {
    setLoading(true);
    adminApi.get('/marketing/banners')
      .then(setBanners)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    fetch('/api/categories').then(r=>r.json()).then(setCats).catch(()=>{});
  }, []);

  const flash = (msg, err=false) => {
    if (err) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModal('create'); setError(''); };
  const openEdit   = (b)  => {
    setForm({ title:b.title, subtitle:b.subtitle, description:b.description, ctaText:b.ctaText, catSlug:b.catSlug, bgFrom:b.bgFrom, bgTo:b.bgTo, emoji:b.emoji, sortOrder:String(b.sortOrder) });
    setEditId(b.id); setModal('edit'); setError('');
  };

  const save = async () => {
    if (!form.title) return setError('Le titre est obligatoire');
    setSaving(true); setError('');
    try {
      const payload = { ...form, sortOrder: parseInt(form.sortOrder) || 0 };
      if (modal === 'create') await adminApi.post('/marketing/banners', payload);
      else await adminApi.patch(`/marketing/banners/${editId}`, payload);
      flash(modal === 'create' ? 'Banner créé ✓' : 'Banner mis à jour ✓');
      setModal(null); load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const toggle = async (b) => {
    try {
      await adminApi.patch(`/marketing/banners/${b.id}/toggle`, {});
      load();
    } catch (e) { flash(e.message, true); }
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer ce banner ?')) return;
    try { await adminApi.delete(`/marketing/banners/${id}`); flash('Supprimé ✓'); load(); }
    catch (e) { flash(e.message, true); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const preview = {
    bg: `linear-gradient(135deg, ${form.bgFrom} 0%, ${form.bgTo} 100%)`,
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Banners & Slider Hero</h2>
          <p className="text-slate-500 text-sm mt-0.5">Gérez les slides du carrousel principal de la homepage</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium flex items-center gap-2">
          + Nouveau banner
        </button>
      </div>

      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {loading ? (
        <div className="text-slate-500 text-center py-16">Chargement...</div>
      ) : banners.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
          <div className="text-5xl mb-3">🖼️</div>
          <div className="text-slate-400 font-medium">Aucun banner</div>
          <div className="text-slate-600 text-sm mt-1">Créez votre premier slider hero</div>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map(b => (
            <div key={b.id} className={`rounded-xl overflow-hidden border ${b.isActive ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}>
              {/* Aperçu miniature */}
              <div className="h-24 flex items-center justify-between px-8 relative"
                style={{ background: `linear-gradient(135deg, ${b.bgFrom} 0%, ${b.bgTo} 100%)` }}>
                <div className="text-white">
                  <div className="text-xs bg-white/20 inline-block px-2 py-0.5 rounded-full mb-1">{b.title}</div>
                  <div className="font-bold text-lg">{b.subtitle}</div>
                  <div className="text-xs opacity-80">{b.description}</div>
                </div>
                <div className="text-6xl opacity-80">{b.emoji}</div>
                {!b.isActive && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="bg-slate-900 text-slate-400 text-xs px-3 py-1 rounded-full">Masqué</span>
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-slate-400 text-xs font-mono">#{b.sortOrder}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                    {b.isActive ? 'Actif' : 'Masqué'}
                  </span>
                  <span className="text-slate-600 text-xs">CTA: {b.ctaText}</span>
                  {b.catSlug && <span className="text-blue-500 text-xs">→ {b.catSlug}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(b)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition">Modifier</button>
                  <button onClick={() => toggle(b)} className={`px-3 py-1.5 text-xs rounded-lg transition ${b.isActive ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                    {b.isActive ? 'Masquer' : 'Activer'}
                  </button>
                  <button onClick={() => del(b.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition">Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800">
              <h3 className="text-white font-semibold">{modal === 'create' ? '+ Nouveau banner' : 'Modifier le banner'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}

              {/* Aperçu live */}
              <div className="rounded-xl overflow-hidden h-28 flex items-center justify-between px-8 mb-2"
                style={{ background: preview.bg }}>
                <div className="text-white">
                  <div className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded-full mb-1">{form.title || 'Titre'}</div>
                  <div className="font-bold text-lg">{form.subtitle || 'Sous-titre principal'}</div>
                  <div className="text-xs opacity-80">{form.description || 'Description courte'}</div>
                  <div className="mt-1 bg-white/90 text-blue-700 text-xs inline-block px-3 py-1 rounded-full font-bold">{form.ctaText || 'CTA'} →</div>
                </div>
                <div className="text-6xl opacity-80">{form.emoji}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs font-medium mb-1.5 block">Étiquette (badge) *</label>
                  <input value={form.title} onChange={e=>set('title',e.target.value)} className={inputCls} placeholder="Ex: MEGA PROMO" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium mb-1.5 block">Texte CTA (bouton) *</label>
                  <input value={form.ctaText} onChange={e=>set('ctaText',e.target.value)} className={inputCls} placeholder="Découvrir" />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs font-medium mb-1.5 block">Titre principal (grand texte) *</label>
                  <input value={form.subtitle} onChange={e=>set('subtitle',e.target.value)} className={inputCls} placeholder="Ex: Jusqu'à -70%" />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs font-medium mb-1.5 block">Description (sous le titre)</label>
                  <input value={form.description} onChange={e=>set('description',e.target.value)} className={inputCls} placeholder="Ex: iPhone 15, Galaxy S24..." />
                </div>
              </div>

              {/* Catégorie cible */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Catégorie cible (clic sur CTA)</label>
                <select value={form.catSlug} onChange={e=>set('catSlug',e.target.value)} className={inputCls}>
                  <option value="">— Page d'accueil —</option>
                  {cats.map(c => (
                    <optgroup key={c.id} label={`${c.icon} ${c.name}`}>
                      <option value={c.slug}>{c.icon} {c.name} (toute la catégorie)</option>
                      {(c.children||[]).map(s => <option key={s.id} value={s.slug}>{s.icon} {s.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Couleurs gradient */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-2 block">Couleur du fond (dégradé)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESETS.map(pr => (
                    <button key={pr.label} type="button"
                      onClick={() => { set('bgFrom', pr.bgFrom); setForm(f => ({...f, bgFrom:pr.bgFrom, bgTo:pr.bgTo})); }}
                      className="h-8 w-24 rounded-lg text-white text-[10px] font-bold border-2 border-transparent hover:border-white transition overflow-hidden"
                      style={{ background:`linear-gradient(135deg, ${pr.bgFrom}, ${pr.bgTo})` }}>
                      {pr.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 items-center">
                  <div>
                    <label className="text-slate-600 text-[10px] block mb-1">Couleur départ</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.bgFrom} onChange={e=>set('bgFrom',e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                      <span className="text-slate-500 text-xs font-mono">{form.bgFrom}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-600 text-[10px] block mb-1">Couleur fin</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.bgTo} onChange={e=>set('bgTo',e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                      <span className="text-slate-500 text-xs font-mono">{form.bgTo}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emoji */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-2 block">Emoji décoratif</label>
                <div className="flex flex-wrap gap-1.5 bg-slate-900 rounded-xl p-3 border border-slate-700">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => set('emoji', e)}
                      className={`text-2xl p-1.5 rounded-lg hover:bg-slate-700 transition ${form.emoji===e?'bg-slate-700 ring-2 ring-blue-500':''}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ordre */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Ordre d'affichage (0 = premier)</label>
                <input type="number" value={form.sortOrder} onChange={e=>set('sortOrder',e.target.value)} min="0" className={inputCls} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm">Annuler</button>
                <button onClick={save} disabled={saving || !form.title || !form.subtitle}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
                  {saving ? '...' : modal === 'create' ? 'Créer le banner' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
