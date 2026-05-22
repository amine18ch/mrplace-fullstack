import { useState } from 'react';
import { useSeller } from '../context/SellerContext';

export default function SellerLogin() {
  const { login } = useSeller();
  const [form, setForm]       = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(form.email, form.password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-xl">
            <span className="text-3xl">🏪</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">MARKET</h1>
          <p className="text-slate-400 text-sm mt-1">Espace Vendeur</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-1">Connexion vendeur</h2>
          <p className="text-slate-400 text-sm mb-6">Gérez votre boutique, vos produits et vos commandes</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Adresse email</label>
              <input
                type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                placeholder="votreboutique@mrplace.tn" required autoComplete="email"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="••••••••" required autoComplete="current-password"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600 pr-12"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs">
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors mt-2">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Info de démo */}
          <div className="mt-6 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
            <div className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">Comptes de démonstration</div>
            <div className="space-y-1 text-xs">
              {[
                ['TechHub Store',    'techhub@mrplace.tn'],
                ['Fashion Empire',   'fashion@mrplace.tn'],
                ['Beauty Paradise',  'beauty@mrplace.tn'],
              ].map(([name, email]) => (
                <button key={email} onClick={() => setForm({ email, password: 'Seller@2024!' })}
                  className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                  <span className="text-slate-400">{name}</span>
                  <span className="text-slate-600 font-mono">{email}</span>
                </button>
              ))}
              <div className="text-slate-600 text-center mt-1">Mot de passe : <span className="font-mono text-slate-500">Seller@2024!</span></div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Pas encore vendeur ? <a href="/" className="text-blue-400 hover:underline">Retour à la marketplace</a>
        </p>
      </div>
    </div>
  );
}
