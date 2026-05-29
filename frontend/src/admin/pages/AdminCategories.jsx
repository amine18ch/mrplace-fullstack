import { useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { adminApi } from '../api/adminClient';

const EMOJIS = ['📱','💻','📺','🛋️','🍳','👗','💄','🧸','🛒','⚽','🚗','🎮','📷','⌚','👟','👔','🧥','👜','💍','🧴','💋','🌸','💊','🍼','🧹','🥫','🥤','🏋️','⚙️','🔊','🖥️','🖨️','🖱️','🪑','🏮','🍴','🚿','🔨','☕','❄️','📚','🎨'];

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600";

export default function AdminCategories() {
  const { can } = useAdmin();
  const [tree, setTree]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null); // null | {mode:'create'|'edit', data?}
  const [form, setForm]     = useState({ name:'', icon:'📦', parentId:'', sortOrder:'0' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [expanded, setExpanded] = useState({});

  const load = () => {
    setLoading(true);
    adminApi.get('/categories')
      .then(d => { setTree(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const openCreate = (parentId = '') => {
    setForm({ name:'', icon:'📦', parentId: String(parentId), sortOrder:'0' });
    setError('');
    setModal({ mode:'create' });
  };

  const openEdit = (cat) => {
    setForm({ name: cat.name, icon: cat.icon, parentId: cat.parentId ? String(cat.parentId) : '', sortOrder: String(cat.sortOrder || 0) });
    setError('');
    setModal({ mode:'edit', id: cat.id, name: cat.name });
  };

  const save = async () => {
    if (!form.name.trim() || !form.icon) return setError('Nom et icône requis');
    setSaving(true); setError('');
    try {
      if (modal.mode === 'create') {
        await adminApi.post('/categories', { name: form.name, icon: form.icon, parentId: form.parentId || null, sortOrder: parseInt(form.sortOrder) || 0 });
        flash('Catégorie créée ✓');
      } else {
        await adminApi.put(`/categories/${modal.id}`, { name: form.name, icon: form.icon, parentId: form.parentId || null, sortOrder: parseInt(form.sortOrder) || 0 });
        flash('Catégorie mise à jour ✓');
      }
      setModal(null);
      load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const toggleVisibility = async (cat) => {
    try {
      await adminApi.patch(`/categories/${cat.id}/visibility`, {});
      load();
      flash(`${cat.name} ${cat.isVisible ? 'masquée' : 'visible'} ✓`);
    } catch (e) { flash(e.message, true); }
  };

  const deletecat = async (cat) => {
    if (!window.confirm(`Supprimer "${cat.name}" ? Cette action est irréversible.`)) return;
    try {
      await adminApi.delete(`/categories/${cat.id}`);
      flash(`"${cat.name}" supprimée ✓`);
      load();
    } catch (e) { flash(e.message, true); }
  };

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const parents = tree.filter(c => !c.parentId);

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Gestion des catégories</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {tree.length} catégorie(s) — {tree.reduce((s,c) => s + (c.children?.length||0), 0)} sous-catégorie(s)
          </p>
        </div>
        {can('create_category') && (
          <button onClick={() => openCreate()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium flex items-center gap-2">
            + Nouvelle catégorie
          </button>
        )}
      </div>

      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {loading ? (
        <div className="text-slate-500 text-center py-16">Chargement...</div>
      ) : (
        <div className="space-y-3">
          {tree.map(parent => (
            <div key={parent.id} className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${parent.isVisible ? 'border-slate-800' : 'border-slate-800/40 opacity-60'}`}>
              {/* Catégorie parente */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => toggle(parent.id)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d={expanded[parent.id] ? 'M19 9l-7 7-7-7' : 'M9 18l6-6-6-6'} />
                  </svg>
                </button>
                <span className="text-2xl flex-shrink-0">{parent.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{parent.name}</span>
                    <span className="text-xs text-slate-600 font-mono">{parent.slug}</span>
                    {!parent.isVisible && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Masquée</span>
                    )}
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {parent.children?.length || 0} sous-catégorie(s) · {parent._count?.products || 0} produit(s)
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Ajouter sous-catégorie */}
                  {can('create_category') && (
                    <button onClick={() => openCreate(parent.id)} title="Ajouter sous-catégorie"
                      className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition text-lg">
                      +
                    </button>
                  )}
                  {/* Modifier */}
                  <button onClick={() => openEdit(parent)} title="Modifier"
                    className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition">
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  {/* Masquer/Afficher */}
                  <button onClick={() => toggleVisibility(parent)} title={parent.isVisible ? 'Masquer' : 'Afficher'}
                    className={`p-2 rounded-lg transition ${parent.isVisible ? 'text-green-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'}`}>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      {parent.isVisible
                        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                        : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      }
                    </svg>
                  </button>
                  {/* Supprimer */}
                  {can('delete_category') && (
                    <button onClick={() => deletecat(parent)} title="Supprimer"
                      className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg transition">
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Sous-catégories */}
              {expanded[parent.id] && parent.children?.length > 0 && (
                <div className="border-t border-slate-800">
                  {parent.children.map((sub, idx) => (
                    <div key={sub.id} className={`flex items-center gap-3 px-4 py-2.5 ${idx < parent.children.length-1 ? 'border-b border-slate-800/50' : ''} ${!sub.isVisible ? 'opacity-50' : ''} hover:bg-slate-800/30 transition`}>
                      <span className="w-6 flex-shrink-0" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
                      <span className="text-xl flex-shrink-0">{sub.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-300 text-sm font-medium">{sub.name}</span>
                          <span className="text-xs text-slate-700 font-mono">{sub.slug}</span>
                          {!sub.isVisible && <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-500">Masquée</span>}
                        </div>
                        <div className="text-slate-600 text-xs">{sub._count?.products || 0} produit(s)</div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(sub)}
                          className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition">
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => toggleVisibility(sub)}
                          className={`p-1.5 rounded-lg transition ${sub.isVisible ? 'text-green-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'}`}>
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            {sub.isVisible
                              ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                              : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                            }
                          </svg>
                        </button>
                        {can('delete_category') && (
                          <button onClick={() => deletecat(sub)}
                            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg transition">
                            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bouton ajouter sous-cat si dépliée */}
              {expanded[parent.id] && can('create_category') && (
                <div className="border-t border-slate-800 px-4 py-2">
                  <button onClick={() => openCreate(parent.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition">
                    <span className="text-base">+</span> Ajouter une sous-catégorie à "{parent.name}"
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal création / édition */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold">
                {modal.mode === 'create' ? (form.parentId ? '+ Nouvelle sous-catégorie' : '+ Nouvelle catégorie') : `Modifier — ${modal.name}`}
              </h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}

              {/* Icône */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-2 block">Icône</label>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-3xl">
                    {form.icon}
                  </div>
                  <span className="text-slate-500 text-xs">Choisissez un emoji</span>
                </div>
                <div className="flex flex-wrap gap-1.5 bg-slate-900 rounded-xl p-3 border border-slate-700 max-h-32 overflow-y-auto">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => setForm(f => ({ ...f, icon: e }))}
                      className={`text-xl p-1.5 rounded-lg transition hover:bg-slate-700 ${form.icon === e ? 'bg-slate-700 ring-2 ring-blue-500' : ''}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nom */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Téléphones mobiles" className={inputCls} />
              </div>

              {/* Catégorie parente */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Catégorie parente</label>
                <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                  className={inputCls}>
                  <option value="">— Catégorie principale (niveau 1) —</option>
                  {tree.filter(c => !c.parentId && (!modal?.id || c.id !== modal?.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
                <p className="text-slate-600 text-xs mt-1">Laissez vide pour créer une catégorie principale</p>
              </div>

              {/* Ordre */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Ordre d'affichage</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                  min="0" className={inputCls} placeholder="0" />
                <p className="text-slate-600 text-xs mt-1">0 = premier, nombres plus grands = plus loin</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm transition">
                  Annuler
                </button>
                <button onClick={save} disabled={saving || !form.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition">
                  {saving ? 'Enregistrement...' : modal.mode === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
