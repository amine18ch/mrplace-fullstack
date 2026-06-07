import { useState } from 'react';
import { useDriver } from '../context/DriverContext';

export default function DriverLogin() {
  const { login } = useDriver();
  const [cin, setCin]         = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!cin || !password) return;
    setLoading(true); setError('');
    try {
      await login(cin, password);
    } catch (err) {
      setError(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4">🚚</div>
          <h1 className="text-white text-2xl font-bold">Espace Chauffeur</h1>
          <p className="text-slate-500 text-sm mt-1">MARKET · Livreur</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs block mb-1">Numéro CIN</label>
            <input
              type="text" value={cin} onChange={e => setCin(e.target.value)}
              placeholder="Ex: 12345678"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Mot de passe</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}

          <button type="submit" disabled={loading || !cin || !password}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-medium transition text-sm">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
