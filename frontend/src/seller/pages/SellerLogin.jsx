import { useState } from 'react';
import { useSeller } from '../context/SellerContext';

const GOVERNORATES = ['Tunis','Ariana','Ben Arous','Manouba','Nabeul','Zaghouan','Bizerte','Béja','Jendouba','Le Kef','Siliana','Sousse','Monastir','Mahdia','Sfax','Kairouan','Kasserine','Sidi Bouzid','Gabès','Medenine','Tataouine','Gafsa','Tozeur','Kébili'];

function RegisterForm({ onBack }) {
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState({ name:'', email:'', password:'', phone:'', location:'Tunis', companyName:'', taxId:'', bankAccount:'', description:'' });
  const [loading, setLoad] = useState(false);
  const [error, setError]  = useState('');
  const [done, setDone]    = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (step < 2) return setStep(step + 1);
    setLoad(true); setError('');
    try {
      const res = await fetch('/api/seller/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setDone(true);
    } catch (e) { setError(e.message); }
    setLoad(false);
  };

  if (done) return (
    <div className="text-center py-6">
      <div className="text-5xl mb-4">🎉</div>
      <h3 className="text-white font-bold text-xl mb-2">Candidature soumise !</h3>
      <p className="text-slate-400 text-sm mb-4">Notre équipe examinera votre dossier sous 24–48h. Vous recevrez une réponse par email.</p>
      <button onClick={onBack} className="text-blue-400 hover:underline text-sm">Retour à la connexion</button>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onBack} className="text-slate-500 hover:text-white">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h2 className="text-white font-bold text-lg">Devenir vendeur</h2>
        <span className="ml-auto text-slate-500 text-xs">Étape {step}/2</span>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}

      {step === 1 && (
        <>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Nom de la boutique *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Mon Commerce" required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Mot de passe *</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Téléphone</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+216 XX XXX XXX"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Gouvernorat</label>
            <select value={form.location} onChange={e => set('location', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500">
              {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-slate-400 text-xs bg-slate-900 rounded-xl p-3 border border-slate-700">
            📋 Ces informations seront vérifiées par notre équipe pour valider votre compte vendeur.
          </p>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Raison sociale / Nom commercial *</label>
            <input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Nom légal de votre entreprise" required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Matricule fiscal (optionnel)</label>
            <input value={form.taxId} onChange={e => set('taxId', e.target.value)} placeholder="Ex: 1234567/A/M/000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">RIB / Coordonnées bancaires (optionnel)</label>
            <input value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} placeholder="Ex: TN59 0000 0000 0000 0000 0000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1.5 block">Description de votre activité</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder="Décrivez vos produits et votre activité..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600 resize-none" />
          </div>
        </>
      )}

      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
        {loading ? 'Envoi...' : step === 1 ? 'Continuer →' : 'Soumettre ma candidature'}
      </button>
    </form>
  );
}

export default function SellerLogin() {
  const { login } = useSeller();
  const [form, setForm]       = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(form.email, form.password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (showRegister) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-xl">
            <span className="text-3xl">🏪</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">MARKET</h1>
          <p className="text-slate-400 text-sm mt-1">Rejoindre notre marketplace</p>
        </div>
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          <RegisterForm onBack={() => setShowRegister(false)} />
        </div>
      </div>
    </div>
  );

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
          Pas encore vendeur ?{' '}
          <button onClick={() => setShowRegister(true)} className="text-blue-400 hover:underline">Rejoindre la marketplace</button>
          {' '}·{' '}
          <a href="/" className="text-slate-500 hover:underline">Retour</a>
        </p>
      </div>
    </div>
  );
}
