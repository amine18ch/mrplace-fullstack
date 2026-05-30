import { useRef, useState } from 'react';
import { getAdminToken } from '../api/adminClient';

/**
 * Composant d'upload de document légal (PDF, JPEG, PNG, WebP)
 * Props:
 *   label      — libellé du champ
 *   value      — URL actuelle du document
 *   onChange   — callback(url) appelé après upload réussi
 *   required   — affiche une étoile rouge
 *   hint       — texte d'aide sous le champ
 */
export default function DocUpload({ label, value, onChange, required = false, hint }) {
  const inputRef  = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]    = useState('');

  const isPdf = value && value.endsWith('.pdf');
  const isImg = value && (value.endsWith('.jpg') || value.endsWith('.jpeg') || value.endsWith('.png') || value.endsWith('.webp'));

  const upload = async (file) => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const token = getAdminToken() || '';
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur upload');
      onChange(data.url);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <label className="text-slate-400 text-xs font-medium mb-1.5 block">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {value ? (
        /* Document déjà uploadé */
        <div className="flex items-center gap-3 bg-slate-900 border border-green-500/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isImg ? (
              <img src={value} alt={label} className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
            ) : (
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                📄
              </div>
            )}
            <div className="min-w-0">
              <div className="text-green-400 text-xs font-semibold">✓ Document uploadé</div>
              <div className="text-slate-500 text-xs truncate">{value.split('/').pop()}</div>
              <div className="flex gap-2 mt-1">
                <a href={value} target="_blank" rel="noreferrer"
                  className="text-blue-400 text-xs hover:underline">Voir →</a>
                <span className="text-slate-700">·</span>
                <button type="button" onClick={() => inputRef.current?.click()}
                  className="text-slate-500 text-xs hover:text-slate-300">Remplacer</button>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => onChange('')}
            className="text-red-400/60 hover:text-red-400 text-lg flex-shrink-0">×</button>
        </div>
      ) : (
        /* Zone d'upload */
        <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}
          className="w-full border-2 border-dashed border-slate-600 hover:border-blue-500 bg-slate-900 rounded-xl px-4 py-5 flex flex-col items-center gap-2 transition disabled:opacity-50 group">
          {loading ? (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                className="text-slate-500 group-hover:text-blue-400 transition">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span className="text-slate-500 text-xs group-hover:text-slate-300 transition">
                Cliquer pour uploader
              </span>
              <span className="text-slate-700 text-[10px]">PDF, JPEG, PNG ou WebP · 5 Mo max</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      {hint && !error && <p className="text-slate-600 text-xs mt-1">{hint}</p>}

      <input ref={inputRef} type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { if (e.target.files[0]) upload(e.target.files[0]); e.target.value=''; }}
      />
    </div>
  );
}
