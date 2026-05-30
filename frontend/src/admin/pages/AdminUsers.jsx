import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin, ROLE_DEFAULT_PERMISSIONS } from '../context/AdminContext';

// ─── Définition complète de tous les modules et permissions ───────────────────
const MODULES = [
  {
    group: 'Gestion opérationnelle',
    items: [
      { key:'dashboard',  label:'Tableau de bord',    perms:['dashboard.read'] },
      { key:'vendors',    label:'Vendeurs',            perms:['vendors.read','vendors.write'] },
      { key:'products',   label:'Produits',            perms:['products.read','products.write'] },
      { key:'orders',     label:'Commandes',           perms:['orders.read','orders.write'] },
      { key:'disputes',   label:'Litiges',             perms:['disputes.read','disputes.write'] },
      { key:'customers',  label:'Clients',             perms:['customers.read','customers.write'] },
    ],
  },
  {
    group: 'Finance & Contrats',
    items: [
      { key:'finance',    label:'Finance & Revenus',   perms:['finance.read','finance.write'] },
      { key:'contracts',  label:'Contrats vendeurs',   perms:['contracts.read','contracts.write'] },
    ],
  },
  {
    group: 'Catalogue & Marketing',
    items: [
      { key:'categories', label:'Catégories',          perms:['categories.read','categories.write'] },
      { key:'marketing',  label:'Marketing & Promos',  perms:['marketing.read','marketing.write'] },
      { key:'settings',   label:'Paramètres plateforme', perms:['settings.read','settings.write'] },
    ],
  },
  {
    group: 'Administration',
    items: [
      { key:'logs',       label:"Logs d'audit",        perms:['logs.read'] },
      { key:'admins',     label:'Accès & Habilitations', perms:['admins.read','admins.write'] },
    ],
  },
];

const ALL_PERMS = MODULES.flatMap(g => g.items.flatMap(i => i.perms));

const ROLES = ['MODERATEUR','SUPPORT','COMPTABLE','MARKETING'];
const ROLE_COLORS = {
  SUPER_ADMIN:'bg-red-500/20 text-red-400 border-red-500/30',
  MODERATEUR:'bg-orange-500/20 text-orange-400 border-orange-500/30',
  COMPTABLE:'bg-green-500/20 text-green-400 border-green-500/30',
  SUPPORT:'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MARKETING:'bg-violet-500/20 text-violet-400 border-violet-500/30',
};
const ROLE_LABELS = {
  SUPER_ADMIN:'Super Admin',MODERATEUR:'Modérateur',
  COMPTABLE:'Comptable',SUPPORT:'Support',MARKETING:'Marketing',
};

const PERM_LABELS = {
  'dashboard.read':'Consulter',
  'vendors.read':'Consulter','vendors.write':'Créer/Modifier/Suspendre',
  'products.read':'Consulter','products.write':'Approuver/Rejeter/Supprimer',
  'orders.read':'Consulter','orders.write':'Modifier statut',
  'disputes.read':'Consulter','disputes.write':'Résoudre',
  'customers.read':'Consulter','customers.write':'Modifier/Suspendre',
  'finance.read':'Consulter','finance.write':'Traiter versements',
  'contracts.read':'Consulter','contracts.write':'Générer/Signer',
  'categories.read':'Consulter','categories.write':'Créer/Modifier/Supprimer',
  'marketing.read':'Consulter','marketing.write':'Créer/Modifier/Supprimer',
  'settings.read':'Consulter','settings.write':'Modifier',
  'logs.read':'Consulter',
  'admins.read':'Consulter','admins.write':'Créer/Modifier',
};

const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600";

// ─── Formulaire hors composant pour éviter perte de focus ───────────────────
const AdminForm = ({ form, set, onSubmit, onCancel, saving, mode }) => {
  const applyRolePreset = (role) => {
    set('role', role);
    set('permissions', [...ROLE_DEFAULT_PERMISSIONS[role] || []]);
  };

  const togglePerm = (perm) => {
    const current = form.permissions || [];
    set('permissions', current.includes(perm) ? current.filter(p=>p!==perm) : [...current, perm]);
  };

  const hasRolePerm = (perm) => (ROLE_DEFAULT_PERMISSIONS[form.role] || []).includes(perm);
  const hasCustomPerm = (perm) => (form.permissions || []).includes(perm);
  const effectivePerm = (perm) => hasRolePerm(perm) || hasCustomPerm(perm);

  return (
    <div className="space-y-5">
      {/* Infos de base */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">Nom complet *</label>
          <input value={form.name} onChange={e=>set('name',e.target.value)} className={inputCls} placeholder="Mohamed Ali Benhassen" />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">Email *</label>
          <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className={inputCls} placeholder="m.ali@market.tn" disabled={mode==='edit'} />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">{mode==='edit' ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}</label>
          <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} className={inputCls} placeholder="Min. 8 caractères" />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1.5 block">Rôle de base *</label>
          <select value={form.role} onChange={e=>applyRolePreset(e.target.value)} className={inputCls}>
            {ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
      </div>

      {/* Matrice de permissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-slate-300 text-sm font-semibold">Matrice des permissions</div>
            <div className="text-slate-600 text-xs mt-0.5">
              🔵 = accordée par le rôle · ✅ = accordée individuellement · ☑️ = les deux
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={()=>set('permissions',[...ALL_PERMS])}
              className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition">
              Tout cocher
            </button>
            <button type="button" onClick={()=>set('permissions',[])}
              className="text-xs px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 transition">
              Tout vider
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {MODULES.map(group => (
            <div key={group.group}>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 px-1">{group.group}</div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-2.5 text-slate-500 text-xs font-semibold w-40">Module</th>
                      {['read','write'].map(t=>(
                        <th key={t} className="text-center px-3 py-2.5 text-slate-500 text-xs font-semibold">
                          {t === 'read' ? '👁️ Lecture' : '✏️ Écriture'}
                        </th>
                      ))}
                      <th className="text-left px-4 py-2.5 text-slate-500 text-xs font-semibold">Détail des accès</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, idx) => (
                      <tr key={item.key} className={`border-b border-slate-800/50 ${idx===group.items.length-1?'border-0':''} hover:bg-slate-800/20 transition`}>
                        <td className="px-4 py-3 text-slate-300 text-xs font-semibold">{item.label}</td>
                        {item.perms.map(perm => {
                          const fromRole   = hasRolePerm(perm);
                          const fromCustom = hasCustomPerm(perm);
                          const active     = effectivePerm(perm);
                          return (
                            <td key={perm} className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => !fromRole && togglePerm(perm)}
                                title={fromRole ? `Accordée par le rôle ${ROLE_LABELS[form.role]} (non modifiable ici)` : (fromCustom ? 'Retirer cette permission' : 'Ajouter cette permission')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition text-base
                                  ${fromRole && fromCustom ? 'bg-blue-600 text-white cursor-default' :
                                    fromRole ? 'bg-blue-500/30 text-blue-400 cursor-default' :
                                    fromCustom ? 'bg-green-500/30 text-green-400 hover:bg-green-500/20 border border-green-500/40' :
                                    'bg-slate-800 text-slate-600 hover:bg-slate-700 hover:text-slate-400 border border-slate-700'
                                  }`}>
                                {fromRole && fromCustom ? '☑️' : fromRole ? '🔵' : fromCustom ? '✅' : ''}
                              </button>
                            </td>
                          );
                        })}
                        {/* Si module a 1 seule permission, colonne write vide */}
                        {item.perms.length === 1 && <td />}
                        <td className="px-4 py-3">
                          <div className="text-slate-600 text-xs space-y-0.5">
                            {item.perms.map(p=>(
                              <div key={p} className={effectivePerm(p) ? 'text-slate-400' : ''}>
                                {effectivePerm(p) ? '✓' : '–'} {PERM_LABELS[p] || p}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-2 sticky bottom-0 bg-slate-800 py-3">
        <button type="button" onClick={onCancel} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm">Annuler</button>
        <button type="button" onClick={onSubmit} disabled={saving || !form.name || !form.email || (mode==='create' && !form.password)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
          {saving ? '...' : mode==='create' ? '+ Créer l\'administrateur' : '✓ Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
};

// ─── Page principale ─────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { admin: me } = useAdmin();
  const [admins, setAdmins]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'create' | 'edit' | 'detail'
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const emptyForm = { name:'', email:'', password:'', role:'SUPPORT', permissions:[] };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = () => {
    setLoading(true);
    adminApi.get('/admins').then(setAdmins).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const flash = (msg, err=false) => {
    if (err) setError(msg); else setSuccess(msg);
    setTimeout(()=>{ setError(''); setSuccess(''); }, 4000);
  };

  const openCreate = () => {
    setForm({ ...emptyForm, permissions:[...ROLE_DEFAULT_PERMISSIONS.SUPPORT] });
    setModal('create'); setError('');
  };

  const openEdit = (a) => {
    setSelected(a);
    setForm({ name:a.name, email:a.email, password:'', role:a.role, permissions:[...a.permissions] });
    setModal('edit'); setError('');
  };

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      await adminApi.post('/admins', form);
      flash('Administrateur créé ✓');
      setModal(null); load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      const payload = { name:form.name, role:form.role, permissions:form.permissions };
      if (form.password) payload.password = form.password;
      await adminApi.patch(`/admins/${selected.id}`, payload);
      flash('Modifications enregistrées ✓');
      setModal(null); load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const toggleActive = async (a) => {
    try {
      if (a.isActive) {
        await adminApi.delete(`/admins/${a.id}`);
        flash(`${a.name} désactivé`);
      } else {
        await adminApi.patch(`/admins/${a.id}`, { isActive: true });
        flash(`${a.name} réactivé ✓`);
      }
      load();
    } catch (e) { flash(e.message, true); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-TN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  const getEffectivePermCount = (a) => {
    const rolePerm = ROLE_DEFAULT_PERMISSIONS[a.role] || [];
    const all = new Set([...rolePerm, ...(a.permissions||[])]);
    return all.size;
  };

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">🔐 Accès & Habilitations</h2>
          <p className="text-slate-500 text-sm mt-0.5">Gérez les comptes et permissions des administrateurs</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium flex items-center gap-2">
          + Nouvel administrateur
        </button>
      </div>

      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {/* Légende */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500">
        {Object.entries(ROLE_LABELS).filter(([k])=>k!=='SUPER_ADMIN').map(([role, label])=>(
          <div key={role} className="flex items-start gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_COLORS[role]}`}>{label}</span>
            <span className="leading-tight">{(ROLE_DEFAULT_PERMISSIONS[role]||[]).length} permissions de base</span>
          </div>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-slate-500 text-center py-16">Chargement...</div>
      ) : (
        <div className="space-y-3">
          {admins.map(a => {
            const isSelf = a.id === me?.id;
            const effectiveCount = getEffectivePermCount(a);
            return (
              <div key={a.id} className={`bg-slate-900 border rounded-xl overflow-hidden transition ${
                a.isActive ? 'border-slate-800' : 'border-slate-800/40 opacity-60'
              } ${a.role === 'SUPER_ADMIN' ? 'border-red-500/20' : ''}`}>
                <div className="flex items-center gap-4 px-5 py-4 flex-wrap">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {a.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{a.name}</span>
                      {isSelf && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Vous</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[a.role] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                        {ROLE_LABELS[a.role] || a.role}
                      </span>
                      {!a.isActive && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">Désactivé</span>}
                    </div>
                    <div className="text-slate-500 text-xs mt-1 flex gap-4 flex-wrap">
                      <span>{a.email}</span>
                      <span>· {effectiveCount} permissions actives</span>
                      {a.lastLogin && <span>· Dernière connexion: {fmtDate(a.lastLogin)}</span>}
                      <span>· {a._count?.logs || 0} actions</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {a.role !== 'SUPER_ADMIN' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(a)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition flex items-center gap-1.5">
                        🔑 Permissions
                      </button>
                      <button onClick={() => toggleActive(a)} disabled={isSelf}
                        className={`px-3 py-1.5 text-xs rounded-lg transition disabled:opacity-40 ${
                          a.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}>
                        {a.isActive ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </div>
                  )}
                  {a.role === 'SUPER_ADMIN' && (
                    <div className="text-slate-600 text-xs px-3">Accès total — non modifiable</div>
                  )}
                </div>

                {/* Résumé permissions */}
                {a.role !== 'SUPER_ADMIN' && a.isActive && (
                  <div className="border-t border-slate-800 px-5 py-2.5 flex flex-wrap gap-1.5">
                    {MODULES.flatMap(g=>g.items).flatMap(item=>item.perms).map(perm => {
                      const fromRole   = (ROLE_DEFAULT_PERMISSIONS[a.role]||[]).includes(perm);
                      const fromCustom = (a.permissions||[]).includes(perm);
                      if (!fromRole && !fromCustom) return null;
                      return (
                        <span key={perm} className={`text-[10px] px-2 py-0.5 rounded-full ${
                          fromRole && fromCustom ? 'bg-blue-600/30 text-blue-300' :
                          fromCustom ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          'bg-slate-800 text-slate-500'
                        }`}>
                          {perm}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Créer / Modifier */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={()=>setModal(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
              <h3 className="text-white font-semibold text-lg">
                {modal==='create' ? '+ Nouvel administrateur' : `✏️ Modifier — ${selected?.name}`}
              </h3>
              <button onClick={()=>setModal(null)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded text-xl">×</button>
            </div>
            {error && <div className="mx-5 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}
            <div className="flex-1 overflow-y-auto p-5">
              <AdminForm
                form={form} set={set}
                onSubmit={modal==='create' ? handleCreate : handleEdit}
                onCancel={()=>setModal(null)}
                saving={saving} mode={modal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
