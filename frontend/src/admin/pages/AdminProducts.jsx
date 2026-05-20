import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';

const fmt = (n) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(n || 0);

export default function AdminProducts() {
  const [tab, setTab] = useState('moderation');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [categories, setCategories] = useState([]);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const loadProducts = () => {
    setLoading(true);
    const isActive = tab === 'moderation' ? 'false' : undefined;
    const params = new URLSearchParams({ page, limit: 20 });
    if (isActive !== undefined) params.append('isActive', isActive);
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    if (sellerId) params.append('sellerId', sellerId);
    adminApi.get(`/products?${params}`)
      .then(d => { setProducts(d.products || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {});
    adminApi.get('/products/stats').then(setStats).catch(() => {});
  }, []);

  useEffect(() => { loadProducts(); }, [tab, page, search, categoryId, sellerId]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    await adminApi.patch(`/products/${id}/approve`, {}).catch(() => {});
    setActionLoading(false);
    loadProducts();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(true);
    await adminApi.patch(`/products/${rejectModal}/reject`, { reason: rejectReason }).catch(() => {});
    setActionLoading(false);
    setRejectModal(null); setRejectReason('');
    loadProducts();
  };

  const handleFeature = async (id) => {
    await adminApi.patch(`/products/${id}/feature`, {}).catch(() => {});
    loadProducts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Désactiver ce produit ?')) return;
    await adminApi.delete(`/products/${id}`).catch(() => {});
    loadProducts();
  };

  return (
    <div className="p-6">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total produits', value: stats.total, color: 'text-slate-200' },
            { label: 'Actifs', value: stats.active, color: 'text-green-400' },
            { label: 'Inactifs', value: stats.inactive, color: 'text-red-400' },
            { label: 'En modération', value: stats.inactive, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {[
          { id: 'moderation', label: 'File de modération' },
          { id: 'catalog', label: 'Catalogue complet' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher..."
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-52" />
        {tab === 'catalog' && (
          <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
            <option value="">Toutes catégories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <span className="text-slate-500 text-sm self-center">{total} produit(s)</span>
      </div>

      {/* Products grid for moderation */}
      {tab === 'moderation' && (
        loading ? (
          <div className="text-slate-500 text-center py-12">Chargement...</div>
        ) : products.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-slate-400 font-medium">Aucun produit en attente de modération</div>
            <div className="text-slate-600 text-sm mt-1">Tous les produits ont été traités</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map(p => {
              const imgs = (() => { try { return JSON.parse(p.images || '[]'); } catch { return []; } })();
              const tags = (() => { try { return JSON.parse(p.tags || '[]'); } catch { return []; } })();
              return (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 h-28 flex items-center justify-center text-5xl">
                    {imgs[0] || '📦'}
                  </div>
                  <div className="p-4">
                    <div className="text-slate-200 font-medium text-sm mb-1 line-clamp-2">{p.title}</div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-xs">{p.seller?.name}</span>
                      <span className="text-blue-400 font-bold text-sm">{fmt(p.price)} TND</span>
                    </div>
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-slate-500 text-xs">{p.category?.name}</span>
                      {tags.map(t => <span key={t} className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{t}</span>)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(p.id)} disabled={actionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg transition-colors disabled:opacity-60">
                        Approuver
                      </button>
                      <button onClick={() => setRejectModal(p.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded-lg transition-colors">
                        Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Catalog table */}
      {tab === 'catalog' && (
        loading ? (
          <div className="text-slate-500 text-center py-12">Chargement...</div>
        ) : products.length === 0 ? (
          <div className="text-slate-600 text-center py-12">Aucun produit trouvé</div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Produit', 'Vendeur', 'Catégorie', 'Prix', 'Stock', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const imgs = (() => { try { return JSON.parse(p.images || '[]'); } catch { return []; } })();
                  const tags = (() => { try { return JSON.parse(p.tags || '[]'); } catch { return []; } })();
                  const isFeatured = tags.includes('featured');
                  return (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{imgs[0] || '📦'}</span>
                          <div>
                            <div className="text-slate-200 text-sm font-medium line-clamp-1">{p.title}</div>
                            <div className="text-slate-600 text-xs">{p.brand}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.seller?.name}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.category?.name}</td>
                      <td className="px-4 py-3 text-blue-400 font-medium">{fmt(p.price)} TND</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${p.stock < 15 ? 'text-red-400' : 'text-slate-300'}`}>{p.stock}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {p.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleFeature(p.id)} className={`text-xs px-2 py-1 rounded transition-colors ${isFeatured ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-400 hover:bg-slate-700'}`}>
                            {isFeatured ? '★ En avant' : '☆ Vedette'}
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">Désactiver</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Préc.</button>
          <span className="px-3 py-1.5 text-slate-400 text-sm">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={products.length < 20} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv.</button>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Motif de rejet</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Expliquez la raison du rejet..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm resize-none focus:outline-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
              <button onClick={handleReject} disabled={actionLoading} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-60">Rejeter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
