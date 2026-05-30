import { useRef, useState } from 'react';

const EMOJIS = ['🏪','💻','👗','🏠','💄','⚽','🧸','🛒','🚗','📱','🍕','🎮','📚','🌿','💎','🍵','☕','🎨','🔧','🏋️','📷','🎵','🌸','🔥','⭐'];

/**
 * Sélecteur logo : emoji ou image uploadée
 * Props:
 *   value      — valeur actuelle (emoji ou URL)
 *   onChange   — callback(value)
 *   color      — couleur de fond pour le preview emoji
 *   tokenGetter — fonction qui retourne le JWT (getSellerToken ou getAdminToken)
 *   uploadPath — chemin de l'API (default: '/api/upload/logos')
 */
export default function LogoUpload({ value, onChange, color = '#2563EB', tokenGetter, uploadPath = '/api/upload/logos' }) {
  const [mode, setMode]     = useState(() => (value && (value.startsWith('/') || value.startsWith('http'))) ? 'image' : 'emoji');
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState('');
  const fileRef = useRef(null);

  const isUrl = value && (value.startsWith('/') || value.startsWith('http'));

  const upload = async (file) => {
    setLoad(true); setError('');
    try {
      const token = tokenGetter ? tokenGetter() : '';
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(uploadPath, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur upload');
      onChange(data.url);
      setMode('image');
    } catch (e) { setError(e.message); }
    setLoad(false);
  };

  return (
    <div className="space-y-3">
      {/* Toggle mode */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('emoji')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${mode==='emoji' ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
          😀 Emoji
        </button>
        <button type="button" onClick={() => { setMode('image'); if (!isUrl) fileRef.current?.click(); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${mode==='image' ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
          📷 Photo
        </button>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-slate-700"
          style={{ background: isUrl ? '#1e293b' : color }}>
          {isUrl
            ? <img src={value} alt="logo" className="w-full h-full object-cover" />
            : <span className="text-3xl">{value || '🏪'}</span>
          }
        </div>

        {mode === 'image' ? (
          <div className="flex-1">
            {isUrl ? (
              <div className="space-y-1">
                <div className="text-green-400 text-xs">✓ Logo uploadé</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="text-blue-400 text-xs hover:underline">Remplacer</button>
                  <span className="text-slate-700">·</span>
                  <button type="button" onClick={() => { onChange('🏪'); setMode('emoji'); }} className="text-red-400/60 text-xs hover:text-red-400">Supprimer</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}
                className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl px-4 py-3 flex flex-col items-center gap-1 w-full transition disabled:opacity-50">
                {loading
                  ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  : <>
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-slate-500">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                      <span className="text-slate-500 text-xs">Uploader un logo</span>
                      <span className="text-slate-700 text-[10px]">JPEG, PNG, WebP · 1 Mo max · carré recommandé</span>
                    </>
                }
              </button>
            )}
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>
        ) : (
          /* Emoji picker */
          <div className="flex flex-wrap gap-1.5 flex-1">
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => onChange(e)}
                className={`text-2xl p-1.5 rounded-lg hover:bg-slate-700 transition ${value===e ? 'bg-slate-700 ring-2 ring-blue-500' : ''}`}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden" onChange={e => { if (e.target.files[0]) upload(e.target.files[0]); e.target.value=''; }} />
    </div>
  );
}
