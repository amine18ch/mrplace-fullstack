import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const fmt = (n) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(n || 0);

export default function AdminProducts() {
  const { can } = useAdmin();
  const [tab, setTab] = useState('moderation');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const loadProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (tab === 'moderation') {
      params.append('isActive', 'false');
    } else {
      if (statusFilter === 'active') params.append('isActive', 'true');
      else if (statusFilter === 'inactive') params.append('isActive', 'false');
    }
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    adminApi.get(`/products?${params}`)
      .then(d => { setProducts(d.products || []); setTotal(d.total || 0); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, page, search, categoryId, statusFilter]);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {});
    adminApi.get('/products/stats').then(setStats).catch(() => {});
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const withLoading = async (fn) => {
    setActionLoading(true);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleApprove = (id) => withLoading(async () => {
    await adminApi.patch(`/products/${id}/approve`, {});
    loadProducts();
  });

  const handleReject = async () => {
    if (!rejectModal) return;
    await withLoading(async () => {
      await adminApi.patch(`/products/${rejectModal}/reject`, { reason: rejectReason });
      setRejectModal(null); setRejectReason('');
      loadProducts();
    });
  };

  const handleFeature = (id) => withLoading(async () => {
    await adminApi.patch(`/products/${id}/feature`, {});
    loadProducts();
  });

  const handleToggleActive = (id, current) => withLoading(async () => {
    await adminApi.patch(`/products/${id}`, { isActive: !current });
    loadProducts();
  });

  const handleSaveEdit = async () => {
    if (!detailModal) return;
    await withLoading(async () => {
      await adminApi.patch(`/products/${detailModal.id}`, editForm);
      setDetailModal(null); setEditForm({});
      loadProducts();
    });
  };

  const isNewProduct = (createdAt) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 24 * 60 * 60 * 1000;
  };

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total produits', value: stats.total, color: 'text-slate-200' },
            { label: 'Actifs', value: stats.active, color: 'text-green-400' },
            { label: 'Inactifs / En attente', value: stats.inactive, color: 'text-yellow-400' },
            { label: 'Catégories', value: stats.byCategory?.length || 0, color: 'text-blue-400' },
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
        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {tab === 'catalog' && (
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        )}
        <span className="text-slate-500 text-sm self-center">{total} produit(s)</span>
      </div>

      {/* MODERATION GRID */}
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
              const isNew = isNewProduct(p.createdAt);
              return (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 h-28 flex items-center justify-center text-5xl relative">
                    {imgs[0] || '📦'}
                    {isNew && (
                      <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">NOUVEAU</span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-slate-200 font-medium text-sm mb-1 line-clamp-2">{p.title}</div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-xs">{p.seller?.name}</span>
                      <span className="text-blue-400 font-bold text-sm">{fmt(p.price)} TND</span>
                    </div>
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-slate-500 text-xs">{p.category?.name}</span>
                      {tags.slice(0, 2).map(t => <span key={t} className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{t}</span>)}
                    </div>
                    <div className="text-slate-600 text-xs mb-3">{new Date(p.createdAt).toLocaleDateString('fr-TN')}</div>
                    {can('products.write') ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(p.id)} disabled={actionLoading}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg transition-colors disabled:opacity-60">
                          ✓ Approuver
                        </button>
                        <button onClick={() => { setRejectModal(p.id); setRejectReason(''); }}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded-lg transition-colors">
                          ✗ Rejeter
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setDetailModal(p); setEditForm({}); }} className="w-full bg-slate-700 text-slate-300 text-xs py-2 rounded-lg hover:bg-slate-600">Voir</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* CATALOG TABLE */}
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
                        <button className="flex items-center gap-2 text-left hover:opacity-80" onClick={() => { setDetailModal(p); setEditForm({ price: p.price, stock: p.stock, title: p.title }); }}>
                          <span className="text-xl">{imgs[0] || '📦'}</span>
                          <div>
                            <div className="text-slate-200 text-sm font-medium line-clamp-1">{p.title}</div>
                            <div className="text-slate-600 text-xs">{p.brand}</div>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.seller?.name}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.category?.name}</td>
                      <td className="px-4 py-3 text-blue-400 font-medium">{fmt(p.price)} TND</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${p.stock < 15 ? 'text-red-400' : 'text-slate-300'}`}>{p.stock}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {p.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => { setDetailModal(p); setEditForm({ price: p.price, stock: p.stock, title: p.title }); }}
                            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">Voir</button>
                          {can('products.write') && (
                            <>
                              <button onClick={() => handleFeature(p.id)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${isFeatured ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-400 hover:bg-slate-700'}`}>
                                {isFeatured ? '★' : '☆'} Vedette
                              </button>
                              <button onClick={() => handleToggleActive(p.id, p.isActive)} disabled={actionLoading}
                                className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-60 ${p.isActive ? 'text-red-400 hover:bg-red-500/10' : 'text-green-400 hover:bg-green-500/10'}`}>
                                {p.isActive ? 'Désactiver' : 'Activer'}
                              </button>
                            </>
                          )}
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
          <span className="px-3 py-1.5 text-slate-400 text-sm">Page {page} / {Math.ceil(total / 20)}</span>
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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm resize-none focus:outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
              <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-60">Rejeter</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-xl border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Détail produit</h3>
              <button onClick={() => { setDetailModal(null); setEditForm({}); }} className="text-slate-400 hover:text-slate-200 text-xl">×</button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Titre</div>
                {can('products.write') ? (
                  <input value={editForm.title ?? detailModal.title} onChange={e => setEditForm({...editForm, title: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-sm focus:outline-none" />
                ) : (
                  <div className="text-slate-200 text-sm">{detailModal.title}</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-500 text-xs mb-1">Prix (TND)</div>
                  {can('products.write') ? (
                    <input value={editForm.price ?? detailModal.price} onChange={e => setEditForm({...editForm, price: e.target.value})}
                      type="number" min="0" step="0.001"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-sm focus:outline-none" />
                  ) : (
                    <div className="text-blue-400 font-bold">{fmt(detailModal.price)}</div>
                  )}
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-500 text-xs mb-1">Stock</div>
                  {can('products.write') ? (
                    <input value={editForm.stock ?? detailModal.stock} onChange={e => setEditForm({...editForm, stock: e.target.value})}
                      type="number" min="0"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-sm focus:outline-none" />
                  ) : (
                    <div className="text-slate-200">{detailModal.stock}</div>
                  )}
                </div>
              </div>
              {[
                ['Vendeur', detailModal.seller?.name],
                ['Catégorie', detailModal.category?.name],
                ['Marque', detailModal.brand],
                ['Statut', detailModal.isActive ? 'Actif' : 'Inactif'],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-500 text-xs">{k}</div>
                  <div className="text-slate-200 text-sm">{v || '—'}</div>
                </div>
              ))}
            </div>
            {can('products.write') && Object.keys(editForm).length > 0 && (
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setDetailModal(null); setEditForm({}); }} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
                <button onClick={handleSaveEdit} disabled={actionLoading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                  {actionLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
