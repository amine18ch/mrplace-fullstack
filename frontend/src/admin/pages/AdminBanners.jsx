import { useEffect, useState, useRef } from 'react';
import { adminApi, getAdminToken } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const EMOJIS = ['🎉','📱','💻','👗','🏠','💄','⚽','🧸','🛒','🚗','📺','🎮','📷','⌚','👟','🧴','💋','🌸','🚚','🛍️','💥','🔥','⚡','🌟','🎁','💰','🏷️'];
const GRADIENTS = [
  { label:'Bleu foncé',  bgFrom:'#1E3A8A', bgTo:'#2563EB' },
  { label:'Bleu ciel',   bgFrom:'#2563EB', bgTo:'#60A5FA' },
  { label:'Violet',      bgFrom:'#4F46E5', bgTo:'#7C3AED' },
  { label:'Rose',        bgFrom:'#9D174D', bgTo:'#DB2777' },
  { label:'Vert',        bgFrom:'#065F46', bgTo:'#059669' },
  { label:'Orange',      bgFrom:'#92400E', bgTo:'#D97706' },
  { label:'Ardoise',     bgFrom:'#0F172A', bgTo:'#334155' },
];

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600";

const emptyForm = {
  title:'', subtitle:'', description:'', ctaText:'Découvrir',
  linkType:'category', catSlug:'', sellerSlug:'',
  bgType:'gradient', bgFrom:'#1E3A8A', bgTo:'#2563EB', bgImageUrl:'',
  emoji:'🎉', sortOrder:'0',
};

// Composant de formulaire au niveau module (évite la perte de focus)
const BannerForm = ({ form, set, cats, sellers, bgFileRef, uploadingBg, handleBgUpload, saving, modal, save, setModal }) => {
  const preview = form.bgType === 'image' && form.bgImageUrl
    ? { backgroundImage:`url(${form.bgImageUrl})`, backgroundSize:'cover', backgroundPosition:'center' }
    : { background:`linear-gradient(135deg, ${form.bgFrom} 0%, ${form.bgTo} 100%)` };

  return (
    <div className="p-5 space-y-5">
      {/* Aperçu live */}
      <div className="rounded-xl overflow-hidden h-32 flex items-center justify-between px-8 relative" style={preview}>
        {form.bgType === 'image' && form.bgImageUrl && <div className="absolute inset-0 bg-black/40" />}
        <div className="text-white relative z-10">
          <div className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded-full mb-1">{form.title || 'Badge'}</div>
          <div className="font-bold text-xl">{form.subtitle || 'Titre principal'}</div>
          <div className="text-xs opacity-80">{form.description || 'Description'}</div>
          <div className="mt-1.5 bg-white/90 text-blue-700 text-xs inline-block px-3 py-1 rounded-full font-bold">{form.ctaText || 'CTA'} →</div>
        </div>
        <div className="text-7xl opacity-80 select-none relative z-10">{form.emoji}</div>
      </div>

      {/* Textes */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">Badge / Étiquette *</label>
          <input value={form.title} onChange={e=>set('title',e.target.value)} className={inputCls} placeholder="Ex: MEGA PROMO" />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">Texte du bouton CTA</label>
          <input value={form.ctaText} onChange={e=>set('ctaText',e.target.value)} className={inputCls} placeholder="Découvrir" />
        </div>
        <div className="col-span-2">
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">Titre principal (grand texte) *</label>
          <input value={form.subtitle} onChange={e=>set('subtitle',e.target.value)} className={inputCls} placeholder="Ex: Jusqu'à -70%" />
        </div>
        <div className="col-span-2">
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">Description</label>
          <input value={form.description} onChange={e=>set('description',e.target.value)} className={inputCls} placeholder="Ex: iPhone 15, Galaxy S24..." />
        </div>
      </div>

      {/* Cible du clic */}
      <div>
        <label className="text-slate-400 text-xs font-medium mb-2 block">Cible du clic sur le banner</label>
        <div className="flex gap-2 mb-3">
          {[['category','Catégorie'],['seller','Boutique vendeur'],['home','Accueil']].map(([v,l])=>(
            <button key={v} type="button" onClick={()=>set('linkType',v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${form.linkType===v?'border-blue-500 bg-blue-500/20 text-blue-300':'border-slate-700 bg-slate-800 text-slate-400'}`}>
              {l}
            </button>
          ))}
        </div>

        {form.linkType === 'category' && (
          <select value={form.catSlug} onChange={e=>set('catSlug',e.target.value)} className={inputCls}>
            <option value="">— Toutes les catégories —</option>
            {cats.map(c => (
              <optgroup key={c.id} label={`${c.icon} ${c.name}`}>
                <option value={c.slug}>{c.icon} {c.name} (toute la catégorie)</option>
                {(c.children||[]).map(s=><option key={s.id} value={s.slug}>{s.icon} {s.name}</option>)}
              </optgroup>
            ))}
          </select>
        )}

        {form.linkType === 'seller' && (
          <div>
            <select value={form.sellerSlug} onChange={e=>set('sellerSlug',e.target.value)} className={inputCls}>
              <option value="">— Choisir un vendeur —</option>
              {sellers.map(s=>(
                <option key={s.id} value={s.slug}>{s.logo} {s.name} ({s.badge})</option>
              ))}
            </select>
            {form.sellerSlug && (
              <p className="text-blue-400 text-xs mt-1">→ Redirige vers la page boutique du vendeur sélectionné</p>
            )}
          </div>
        )}

        {form.linkType === 'home' && (
          <p className="text-slate-600 text-xs">Le bouton CTA ramènera les visiteurs à la page d'accueil.</p>
        )}
      </div>

      {/* Fond : gradient ou image */}
      <div>
        <label className="text-slate-400 text-xs font-medium mb-2 block">Type de fond</label>
        <div className="flex gap-2 mb-3">
          {[['gradient','🎨 Dégradé de couleur'],['image','🖼️ Image de fond']].map(([v,l])=>(
            <button key={v} type="button" onClick={()=>set('bgType',v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${form.bgType===v?'border-blue-500 bg-blue-500/20 text-blue-300':'border-slate-700 bg-slate-800 text-slate-400'}`}>
              {l}
            </button>
          ))}
        </div>

        {form.bgType === 'gradient' && (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {GRADIENTS.map(g=>(
                <button key={g.label} type="button"
                  onClick={()=>{ set('bgFrom',g.bgFrom); set('bgTo',g.bgTo); }}
                  className="h-8 w-28 rounded-lg text-white text-[10px] font-bold border-2 border-transparent hover:border-white transition overflow-hidden"
                  style={{background:`linear-gradient(135deg,${g.bgFrom},${g.bgTo})`}}>
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-slate-600 text-[10px] mb-1">Couleur départ</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.bgFrom} onChange={e=>set('bgFrom',e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <span className="text-slate-500 text-xs font-mono">{form.bgFrom}</span>
                </div>
              </div>
              <div>
                <p className="text-slate-600 text-[10px] mb-1">Couleur fin</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.bgTo} onChange={e=>set('bgTo',e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <span className="text-slate-500 text-xs font-mono">{form.bgTo}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {form.bgType === 'image' && (
          <div>
            {/* Format requis */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
              <p className="text-blue-300 text-xs font-semibold mb-1">📐 Format requis pour l'image de fond :</p>
              <ul className="text-blue-400/80 text-xs space-y-0.5">
                <li>• Format : <strong>JPEG ou WebP</strong> (PNG accepté mais plus lourd)</li>
                <li>• Dimensions : <strong>1440×480 px minimum</strong> (ratio 3:1 paysage)</li>
                <li>• Taille max : <strong>3 Mo</strong></li>
                <li>• Conseil : image sombre ou avec overlay — le texte est en blanc</li>
              </ul>
            </div>

            {form.bgImageUrl ? (
              <div className="relative rounded-xl overflow-hidden mb-2" style={{height:80}}>
                <img src={form.bgImageUrl} alt="Fond" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-between px-4">
                  <span className="text-white text-xs font-medium">Image actuelle</span>
                  <button type="button" onClick={()=>set('bgImageUrl','')}
                    className="bg-red-500 text-white text-xs px-3 py-1 rounded-lg">Retirer</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={()=>bgFileRef.current?.click()} disabled={uploadingBg}
                className="w-full h-20 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-2 transition disabled:opacity-50">
                {uploadingBg
                  ? <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  : <>
                      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-slate-500">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                      <span className="text-slate-500 text-xs">Cliquez pour uploader l'image de fond</span>
                      <span className="text-slate-700 text-[10px]">JPEG / WebP · 1440×480 px min · 3 Mo max</span>
                    </>
                }
              </button>
            )}
            <input ref={bgFileRef} type="file" accept="image/jpeg,image/webp,image/png" className="hidden"
              onChange={e=>{ if(e.target.files[0]) handleBgUpload(e.target.files[0]); }} />
          </div>
        )}
      </div>

      {/* Emoji */}
      <div>
        <label className="text-slate-400 text-xs font-medium mb-2 block">Emoji décoratif</label>
        <div className="flex flex-wrap gap-1.5 bg-slate-900 rounded-xl p-3 border border-slate-700 max-h-28 overflow-y-auto">
          {EMOJIS.map(e=>(
            <button key={e} type="button" onClick={()=>set('emoji',e)}
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

      {/* Boutons */}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={()=>setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm">Annuler</button>
        <button type="button" onClick={save} disabled={saving || !form.title || !form.subtitle}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
          {saving ? '...' : modal === 'create' ? 'Créer le banner' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
};

export default function AdminBanners() {
  const { can } = useAdmin();
  const [banners, setBanners]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [cats, setCats]         = useState([]);
  const [sellers, setSellers]   = useState([]);
  const [uploadingBg, setUpBg]  = useState(false);
  const bgFileRef = useRef(null);

  const load = () => {
    setLoading(true);
    adminApi.get('/marketing/banners').then(setBanners).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    fetch('/api/categories').then(r=>r.json()).then(setCats).catch(()=>{});
    fetch('/api/sellers').then(r=>r.json()).then(setSellers).catch(()=>{});
  }, []);

  const flash = (msg, err=false) => {
    if (err) setError(msg); else setSuccess(msg);
    setTimeout(()=>{ setError(''); setSuccess(''); }, 3000);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModal('create'); setError(''); };
  const openEdit   = (b)  => {
    setForm({
      title: b.title, subtitle: b.subtitle, description: b.description,
      ctaText: b.ctaText,
      linkType: b.sellerSlug ? 'seller' : b.catSlug ? 'category' : 'home',
      catSlug: b.catSlug, sellerSlug: b.sellerSlug,
      bgType: b.bgImageUrl ? 'image' : 'gradient',
      bgFrom: b.bgFrom, bgTo: b.bgTo, bgImageUrl: b.bgImageUrl,
      emoji: b.emoji, sortOrder: String(b.sortOrder),
    });
    setEditId(b.id); setModal('edit'); setError('');
  };

  const handleBgUpload = async (file) => {
    setUpBg(true);
    try {
      const token = getAdminToken() || '';
      const fd = new FormData(); fd.append('image', file);
      const res = await fetch('/api/upload/banners', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set('bgImageUrl', data.url);
    } catch (e) { flash(e.message, true); }
    setUpBg(false);
  };

  const save = async () => {
    if (!form.title) return setError('Le badge/étiquette est obligatoire');
    if (!form.subtitle) return setError('Le titre principal est obligatoire');
    setSaving(true); setError('');
    try {
      const payload = {
        title: form.title, subtitle: form.subtitle, description: form.description,
        ctaText: form.ctaText,
        catSlug:    form.linkType === 'category' ? form.catSlug    : '',
        sellerSlug: form.linkType === 'seller'   ? form.sellerSlug : '',
        bgFrom: form.bgFrom, bgTo: form.bgTo,
        bgImageUrl: form.bgType === 'image' ? form.bgImageUrl : '',
        emoji: form.emoji, sortOrder: parseInt(form.sortOrder) || 0,
      };
      if (modal === 'create') await adminApi.post('/marketing/banners', payload);
      else await adminApi.patch(`/marketing/banners/${editId}`, payload);
      flash(modal === 'create' ? 'Banner créé ✓' : 'Mis à jour ✓');
      setModal(null); load();
    } catch (e) { flash(e.message, true); }
    setSaving(false);
  };

  const toggle = async (b) => {
    try { await adminApi.patch(`/marketing/banners/${b.id}/toggle`, {}); load(); }
    catch (e) { flash(e.message, true); }
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer ce banner ?')) return;
    try { await adminApi.delete(`/marketing/banners/${id}`); flash('Supprimé ✓'); load(); }
    catch (e) { flash(e.message, true); }
  };

  const getBg = (b) => b.bgImageUrl
    ? { backgroundImage:`url(${b.bgImageUrl})`, backgroundSize:'cover', backgroundPosition:'center' }
    : { background:`linear-gradient(135deg, ${b.bgFrom} 0%, ${b.bgTo} 100%)` };

  const getLinkLabel = (b) => {
    if (b.sellerSlug) return `Boutique: ${b.sellerSlug}`;
    if (b.catSlug)    return `Catégorie: ${b.catSlug}`;
    return 'Accueil';
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Banners & Slider Hero</h2>
          <p className="text-slate-500 text-sm mt-0.5">Gérez les slides du carrousel de la homepage</p>
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
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map(b => (
            <div key={b.id} className={`rounded-xl overflow-hidden border ${b.isActive ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}>
              <div className="h-24 flex items-center justify-between px-8 relative" style={getBg(b)}>
                {b.bgImageUrl && <div className="absolute inset-0 bg-black/40" />}
                <div className="text-white relative z-10">
                  <div className="text-xs bg-white/20 inline-block px-2 py-0.5 rounded-full mb-1">{b.title}</div>
                  <div className="font-bold text-lg">{b.subtitle}</div>
                  <div className="text-xs opacity-80">{b.description}</div>
                </div>
                <div className="text-6xl opacity-80 relative z-10">{b.emoji}</div>
                {!b.isActive && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><span className="bg-slate-900 text-slate-400 text-xs px-3 py-1 rounded-full">Masqué</span></div>}
              </div>
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                  <span className="text-slate-400 text-xs font-mono">#{b.sortOrder}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'}`}>{b.isActive ? 'Actif' : 'Masqué'}</span>
                  <span className="text-slate-500 text-xs">→ {getLinkLabel(b)}</span>
                  {b.bgImageUrl && <span className="text-purple-400 text-xs">🖼️ Image</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>openEdit(b)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition">Modifier</button>
                  <button onClick={()=>toggle(b)} className={`px-3 py-1.5 text-xs rounded-lg transition ${b.isActive ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>{b.isActive ? 'Masquer' : 'Activer'}</button>
                  <button onClick={()=>del(b.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition">Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={()=>setModal(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <h3 className="text-white font-semibold">{modal === 'create' ? '+ Nouveau banner' : 'Modifier le banner'}</h3>
              <button onClick={()=>setModal(null)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded text-xl">×</button>
            </div>
            {error && <div className="mx-5 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}
            <BannerForm
              form={form} set={set} cats={cats} sellers={sellers}
              bgFileRef={bgFileRef} uploadingBg={uploadingBg} handleBgUpload={handleBgUpload}
              saving={saving} modal={modal} save={save} setModal={setModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
