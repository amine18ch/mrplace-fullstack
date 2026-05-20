import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';

const ROLE_OPTIONS = ['SUPER_ADMIN', 'MODERATEUR', 'COMPTABLE', 'SUPPORT'];
const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-red-500/20 text-red-400',
  MODERATEUR:  'bg-blue-500/20 text-blue-400',
  COMPTABLE:   'bg-green-500/20 text-green-400',
  SUPPORT:     'bg-slate-700 text-slate-400',
};

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-TN') : '—';

export default function AdminSettings() {
  const [tab, setTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [admins, setAdmins] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', role: 'SUPPORT' });
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editAdminId, setEditAdminId] = useState(null);
  const [settingsForm, setSettingsForm] = useState({});
  const [saved, setSaved] = useState(false);

  const loadSettings = () => {
    adminApi.get('/settings').then(d => {
      setSettings(d.grouped || {});
      const flat = {};
      (d.settings || []).forEach(s => { flat[s.key] = s.value; });
      setSettingsForm(flat);
    }).catch(() => {});
  };

  const loadAdmins = () => {
    adminApi.get('/settings/admins').then(setAdmins).catch(() => {});
  };

  const loadLogs = () => {
    adminApi.get(`/settings/logs?page=${logsPage}&limit=30`)
      .then(d => { setLogs(d.logs || []); setLogsTotal(d.total || 0); })
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSettings(), loadAdmins(), loadLogs()])
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (tab === 'logs') loadLogs(); }, [logsPage]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const updates = Object.entries(settingsForm).map(([key, value]) => ({ key, value }));
    await adminApi.patch('/settings', { updates }).catch(() => {});
    setActionLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadSettings();
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    await adminApi.post('/settings/admins', adminForm).catch(err => alert(err.message));
    setActionLoading(false);
    setAdminForm({ name: '', email: '', password: '', role: 'SUPPORT' });
    setShowAdminForm(false);
    loadAdmins();
  };

  const handleDisableAdmin = async (id) => {
    if (!window.confirm('Désactiver cet admin ?')) return;
    await adminApi.delete(`/settings/admins/${id}`).catch(() => {});
    loadAdmins();
  };

  const SETTINGS_LABELS = {
    platform_name: 'Nom de la plateforme',
    currency: 'Devise',
    vat_rate: 'TVA (%)',
    commission_rate: 'Commission (%)',
    timezone: 'Fuseau horaire',
    contact_email: 'Email de contact',
  };

  if (loading) return <div className="p-8 text-slate-500 text-center">Chargement...</div>;

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {[
          { id: 'general', label: 'Général' },
          { id: 'admins', label: `Admins (${admins.length})` },
          { id: 'logs', label: "Logs d'audit" },
        ].map(t => (
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm px-6 py-2.5 rounded-lg transition-colors">
                  {actionLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
                {saved && <span className="text-green-400 text-sm">✓ Paramètres sauvegardés</span>}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ADMINS */}
      {tab === 'admins' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-300 font-medium">Comptes administrateurs</h3>
            <button onClick={() => setShowAdminForm(!showAdminForm)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              + Nouvel admin
            </button>
          </div>

          {showAdminForm && (
            <form onSubmit={handleCreateAdmin} className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Nom</label>
                  <input value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} placeholder="Nom complet" required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Email</label>
                  <input value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} type="email" placeholder="email@mrplace.tn" required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Mot de passe</label>
                  <input value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} type="password" placeholder="••••••••" required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Rôle</label>
                  <select value={adminForm.role} onChange={e => setAdminForm({...adminForm, role: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={actionLoading} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg">Créer</button>
                <button type="button" onClick={() => setShowAdminForm(false)} className="bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-600">Annuler</button>
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
                      {a.isActive && (
                        <button onClick={() => handleDisableAdmin(a.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">
                          Désactiver
                        </button>
                      )}
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-300 font-medium">Journal d'audit ({logsTotal})</h3>
          </div>
          {logs.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucune action enregistrée</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Admin', 'Action', 'Module', 'Cible', 'IP', 'Date'].map(h => (
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
                      <td className="px-4 py-3 text-slate-600 text-xs">{l.ip || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {logsTotal > 30 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={logsPage === 1} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Préc.</button>
              <span className="px-3 py-1.5 text-slate-400 text-sm">Page {logsPage}</span>
              <button onClick={() => setLogsPage(p => p + 1)} disabled={logs.length < 30} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv.</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
