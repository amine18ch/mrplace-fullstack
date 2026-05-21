import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const ROLE_OPTIONS = ['SUPER_ADMIN', 'MODERATEUR', 'COMPTABLE', 'SUPPORT', 'MARKETING'];
const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-red-500/20 text-red-400',
  MODERATEUR:  'bg-orange-500/20 text-orange-400',
  COMPTABLE:   'bg-green-500/20 text-green-400',
  SUPPORT:     'bg-blue-500/20 text-blue-400',
  MARKETING:   'bg-violet-500/20 text-violet-400',
};

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-TN') : '—';

export default function AdminSettings() {
  const { admin, can } = useAdmin();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const [tab, setTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [admins, setAdmins] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsModuleFilter, setLogsModuleFilter] = useState('');
  const [logsAdminFilter, setLogsAdminFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', role: 'SUPPORT', isActive: true });
  const [editAdminId, setEditAdminId] = useState(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = () => {
    adminApi.get('/settings').then(d => {
      const flat = {};
      (d.settings || []).forEach(s => { flat[s.key] = s.value; });
      setSettingsForm(flat);
    }).catch(() => {});
  };

  const loadAdmins = () => {
    if (isSuperAdmin) adminApi.get('/settings/admins').then(setAdmins).catch(() => {});
  };

  const loadLogs = () => {
    const params = new URLSearchParams({ page: logsPage, limit: 50 });
    if (logsModuleFilter) params.append('module', logsModuleFilter);
    if (logsAdminFilter) params.append('adminId', logsAdminFilter);
    adminApi.get(`/settings/logs?${params}`)
      .then(d => { setLogs(d.logs || []); setLogsTotal(d.total || 0); })
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    const ps = [loadSettings()];
    if (isSuperAdmin) ps.push(loadAdmins(), loadLogs());
    Promise.all(ps).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (tab === 'logs') loadLogs(); }, [logsPage, logsModuleFilter, logsAdminFilter]);

  const withLoading = async (fn) => {
    setActionLoading(true);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await withLoading(async () => {
      const updates = Object.entries(settingsForm).map(([key, value]) => ({ key, value }));
      await adminApi.patch('/settings', { updates });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadSettings();
    });
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    await withLoading(async () => {
      if (editAdminId) {
        const { password, ...rest } = adminForm;
        const body = { ...rest };
        if (password) body.password = password;
        await adminApi.patch(`/settings/admins/${editAdminId}`, body);
        setEditAdminId(null);
      } else {
        await adminApi.post('/settings/admins', adminForm);
      }
      setAdminForm({ name: '', email: '', password: '', role: 'SUPPORT', isActive: true });
      setShowAdminForm(false);
      loadAdmins();
    });
  };

  const handleDisableAdmin = async (id) => {
    if (!window.confirm('Désactiver cet admin ?')) return;
    await withLoading(async () => {
      await adminApi.delete(`/settings/admins/${id}`);
      loadAdmins();
    });
  };

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SETTINGS_LABELS = {
    platform_name:   'Nom de la plateforme',
    currency:        'Devise (TND, EUR, USD)',
    vat_rate:        'Taux TVA (%)',
    commission_rate: 'Commission globale (%)',
    contact_email:   'Email de contact',
    timezone:        'Fuseau horaire',
  };

  const modules = ['vendors', 'products', 'orders', 'customers', 'finance', 'marketing', 'settings'];

  const tabs = [
    { id: 'general', label: 'Paramètres généraux' },
    ...(isSuperAdmin ? [
      { id: 'admins', label: `Admins (${admins.length})` },
      { id: 'logs', label: "Logs d'audit" },
    ] : can('logs.read') ? [
      { id: 'logs', label: "Logs d'audit" },
    ] : []),
  ];

  if (loading) return <div className="p-8 text-slate-500 text-center">Chargement...</div>;

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* GENERAL SETTINGS */}
      {tab === 'general' && (
        <div className="max-w-2xl">
          <form onSubmit={handleSaveSettings}>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-slate-200 font-semibold mb-4">Paramètres de la plateforme</h3>
              {Object.entries(SETTINGS_LABELS).map(([key, label]) => (
                <div key={key}>
                  <label className="text-slate-400 text-xs font-medium mb-1.5 block">{label}</label>
                  <input
                    value={settingsForm[key] || ''}
                    onChange={e => setSettingsForm({...settingsForm, [key]: e.target.value})}
                    disabled={!isSuperAdmin}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              ))}
              {isSuperAdmin && (
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm px-6 py-2.5 rounded-lg transition-colors">
                    {actionLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                  {saved && <span className="text-green-400 text-sm">✓ Paramètres sauvegardés</span>}
                </div>
              )}
              {!isSuperAdmin && (
                <div className="text-slate-500 text-xs pt-2">Lecture seule. Seul le Super Admin peut modifier ces paramètres.</div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ADMINS - SUPER_ADMIN only */}
      {tab === 'admins' && isSuperAdmin && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-300 font-medium">Comptes administrateurs</h3>
            <button onClick={() => { setShowAdminForm(!showAdminForm); setEditAdminId(null); setAdminForm({ name: '', email: '', password: '', role: 'SUPPORT', isActive: true }); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              + Nouvel admin
            </button>
          </div>

          {showAdminForm && (
            <form onSubmit={handleCreateAdmin} className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
              <h4 className="text-slate-400 text-xs font-medium mb-3">{editAdminId ? 'Modifier l\'admin' : 'Créer un admin'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Nom complet</label>
                  <input value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} placeholder="Nom complet" required={!editAdminId}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Email</label>
                  <input value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} type="email" placeholder="email@mrplace.tn" required={!editAdminId}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Mot de passe {editAdminId ? '(laisser vide pour ne pas changer)' : ''}</label>
                  <input value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} type="password" placeholder="••••••••" required={!editAdminId}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Rôle</label>
                  <select value={adminForm.role} onChange={e => setAdminForm({...adminForm, role: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                    <input type="checkbox" checked={adminForm.isActive !== false} onChange={e => setAdminForm({...adminForm, isActive: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                    Compte actif
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={actionLoading} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg">
                  {editAdminId ? 'Mettre à jour' : 'Créer'}
                </button>
                <button type="button" onClick={() => { setShowAdminForm(false); setEditAdminId(null); }} className="bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-600">Annuler</button>
              </div>
            </form>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Admin', 'Email', 'Rôle', 'Statut', 'Dernière connexion', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.map(a => (
                  <tr key={a.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {a.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <span className="text-slate-200 font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{a.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${ROLE_COLORS[a.role] || 'bg-slate-700 text-slate-400'}`}>{a.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${a.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                        {a.isActive ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(a.lastLogin)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => {
                          setEditAdminId(a.id);
                          setAdminForm({ name: a.name, email: a.email, password: '', role: a.role, isActive: a.isActive });
                          setShowAdminForm(true);
                        }} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">Modifier</button>
                        {a.isActive && a.id !== admin?.id && (
                          <button onClick={() => handleDisableAdmin(a.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">Désactiver</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOGS */}
      {tab === 'logs' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-slate-300 font-medium">Journal d'audit ({logsTotal})</h3>
            <div className="flex gap-3 flex-wrap">
              <select value={logsModuleFilter} onChange={e => { setLogsModuleFilter(e.target.value); setLogsPage(1); }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
                <option value="">Tous les modules</option>
                {modules.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {isSuperAdmin && (
                <select value={logsAdminFilter} onChange={e => { setLogsAdminFilter(e.target.value); setLogsPage(1); }}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
                  <option value="">Tous les admins</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              <button onClick={handleExportLogs} className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-2 rounded-lg transition-colors">
                ⬇ Export JSON
              </button>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucune action enregistrée</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Admin', 'Action', 'Module', 'Cible', 'Détails', 'IP', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-300 text-sm">{l.admin?.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-slate-800 text-blue-400 px-2 py-1 rounded">{l.action}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{l.module}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{l.targetId || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate font-mono" title={l.details}>{l.details}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{l.ip || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {logsTotal > 50 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={logsPage === 1} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Préc.</button>
              <span className="px-3 py-1.5 text-slate-400 text-sm">Page {logsPage} / {Math.ceil(logsTotal / 50)}</span>
              <button onClick={() => setLogsPage(p => p + 1)} disabled={logs.length < 50} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv.</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
