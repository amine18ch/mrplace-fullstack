import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminClient';
import { useAdmin } from '../context/AdminContext';

const fmt = (n) => new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtDateTime = (d) => new Date(d).toLocaleString('fr-TN');

const STATUS_COLORS = {
  EN_ATTENTE:     'bg-yellow-500/20 text-yellow-400',
  CONFIRMEE:      'bg-blue-500/20 text-blue-400',
  EN_PREPARATION: 'bg-indigo-500/20 text-indigo-400',
  EXPEDIEE:       'bg-purple-500/20 text-purple-400',
  LIVREE:         'bg-green-500/20 text-green-400',
  ANNULEE:        'bg-red-500/20 text-red-400',
  // legacy
  CONFIRME:       'bg-blue-500/20 text-blue-400',
  EXPEDIE:        'bg-purple-500/20 text-purple-400',
  LIVRE:          'bg-green-500/20 text-green-400',
  ANNULE:         'bg-red-500/20 text-red-400',
};

const DISPUTE_COLORS = {
  OPEN:       'bg-red-500/20 text-red-400',
  IN_REVIEW:  'bg-orange-500/20 text-orange-400',
  RESOLVED:   'bg-green-500/20 text-green-400',
  CLOSED:     'bg-slate-700 text-slate-400',
};

const STATUSES = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'ANNULEE'];

export default function AdminOrders() {
  const { can } = useAdmin();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolution, setResolution] = useState('');
  const [refundCheck, setRefundCheck] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const loadOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (statusFilter) params.append('status', statusFilter);
    if (search) params.append('search', search);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    adminApi.get(`/orders?${params}`)
      .then(d => { setOrders(d.orders || []); setTotal(d.total || 0); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter, search, dateFrom, dateTo]);

  const loadDisputes = useCallback(() => {
    if (can('disputes.write') || can('orders.read')) {
      adminApi.get('/orders/disputes').then(setDisputes).catch(() => {});
    }
  }, [can]);

  useEffect(() => {
    adminApi.get('/orders/stats').then(setStats).catch(() => {});
  }, []);

  useEffect(() => { if (tab === 'orders') loadOrders(); }, [tab, loadOrders]);
  useEffect(() => { if (tab === 'disputes') loadDisputes(); }, [tab, loadDisputes]);

  const withLoading = async (fn) => {
    setActionLoading(true);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleChangeStatus = async () => {
    if (!statusModal || !newStatus) return;
    await withLoading(async () => {
      await adminApi.patch(`/orders/${statusModal}/status`, { status: newStatus });
      setStatusModal(null); setNewStatus('');
      loadOrders();
    });
  };

  const handleResolveDispute = async () => {
    if (!resolveModal || !resolution.trim()) return;
    await withLoading(async () => {
      await adminApi.patch(`/orders/disputes/${resolveModal}/resolve`, { resolution, refund: refundCheck });
      setResolveModal(null); setResolution(''); setRefundCheck(false);
      loadDisputes();
    });
  };

  const handleTakeDispute = async (id) => {
    await withLoading(async () => {
      await adminApi.patch(`/orders/disputes/${id}`, { status: 'IN_REVIEW' });
      loadDisputes();
    });
  };

  const handleViewOrder = async (id) => {
    const order = await adminApi.get(`/orders/${id}`).catch(() => null);
    if (order) {
      setSelectedOrder(order);
      setNewStatus(order.status);
    }
  };

  const openDisputes = disputes.filter(d => d.status === 'OPEN' || d.status === 'IN_REVIEW');

  return (
    <div className="p-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {Object.entries(stats.byStatus || {}).slice(0, 5).map(([st, count]) => (
            <div key={st} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-slate-200">{count}</div>
              <div className="mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[st] || 'bg-slate-700 text-slate-400'}`}>{st}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {[
          { id: 'orders', label: 'Toutes les commandes' },
          ...(can('disputes.write') ? [{ id: 'disputes', label: `Litiges (${openDisputes.length} actifs)` }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {tab === 'orders' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher client..."
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-48" />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
              <option value="">Tous les statuts</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
            <span className="text-slate-500 text-sm self-center">{total} commande(s)</span>
          </div>

          {loading ? (
            <div className="text-slate-500 text-center py-12">Chargement...</div>
          ) : orders.length === 0 ? (
            <div className="text-slate-600 text-center py-12">Aucune commande trouvée</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['ID', 'Client', 'Total', 'Articles', 'Statut', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => handleViewOrder(o.id)}>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{o.id}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-200 text-sm">{o.user?.name || 'Client'}</div>
                        <div className="text-slate-500 text-xs">{o.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-blue-400 font-medium">{fmt(o.total)} TND</td>
                      <td className="px-4 py-3 text-slate-300 text-center">{o.items?.length || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-slate-700 text-slate-400'}`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(o.createdAt)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={() => handleViewOrder(o.id)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10">Voir</button>
                          {can('orders.write') && (
                            <button onClick={() => { setStatusModal(o.id); setNewStatus(o.status); }} className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-orange-500/10">Statut</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Préc.</button>
              <span className="px-3 py-1.5 text-slate-400 text-sm">Page {page} / {Math.ceil(total / 20)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={orders.length < 20} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv.</button>
            </div>
          )}
        </div>
      )}

      {/* DISPUTES TAB */}
      {tab === 'disputes' && (
        <div>
          {disputes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-slate-400 font-medium">Aucun litige</div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['ID', 'Commande', 'Client', 'Raison', 'Statut', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {disputes.map(d => (
                    <tr key={d.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{d.id}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">Cmd #{d.orderId}</td>
                      <td className="px-4 py-3 text-slate-200 text-sm">{d.order?.user?.name || 'Client'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-xs">
                        <div className="truncate">{d.reason}</div>
                        {d.description && <div className="text-slate-600 mt-0.5 truncate">{d.description}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${DISPUTE_COLORS[d.status] || 'bg-slate-700 text-slate-400'}`}>{d.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(d.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {d.status === 'OPEN' && (
                            <button onClick={() => handleTakeDispute(d.id)} disabled={actionLoading}
                              className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-orange-500/10 disabled:opacity-60">
                              Prendre en charge
                            </button>
                          )}
                          {(d.status === 'OPEN' || d.status === 'IN_REVIEW') && (
                            <button onClick={() => { setResolveModal(d.id); setResolution(''); setRefundCheck(false); }}
                              className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-500/10">
                              Résoudre
                            </button>
                          )}
                          {d.resolution && (
                            <span className="text-xs text-slate-500" title={d.resolution}>Résolu ✓</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Status change modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Changer le statut</h3>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm mb-4 focus:outline-none">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setStatusModal(null); setNewStatus(''); }} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
              <button onClick={handleChangeStatus} disabled={actionLoading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve dispute modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Résolution du litige</h3>
            <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={4}
              placeholder="Décrivez la résolution (obligatoire)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm resize-none focus:outline-none mb-3" />
            <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer mb-4">
              <input type="checkbox" checked={refundCheck} onChange={e => setRefundCheck(e.target.checked)}
                className="w-4 h-4 accent-blue-600" />
              Rembourser le client
            </label>
            <div className="flex gap-3">
              <button onClick={() => { setResolveModal(null); setResolution(''); setRefundCheck(false); }} className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-600">Annuler</button>
              <button onClick={handleResolveDispute} disabled={actionLoading || !resolution.trim()} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-60">Résoudre</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Commande #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-200 text-xl">×</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Client</div>
                <div className="text-slate-200 font-medium">{selectedOrder.user?.name}</div>
                <div className="text-slate-400 text-xs">{selectedOrder.user?.email}</div>
                {selectedOrder.user?.phone && <div className="text-slate-500 text-xs">{selectedOrder.user.phone}</div>}
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Statut actuel</div>
                <span className={`text-sm px-2 py-1 rounded-full ${STATUS_COLORS[selectedOrder.status] || 'bg-slate-700 text-slate-400'}`}>{selectedOrder.status}</span>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Total</div>
                <div className="text-blue-400 font-bold text-lg">{fmt(selectedOrder.total)} TND</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Paiement / Date</div>
                <div className="text-slate-200 text-sm">{selectedOrder.paymentMethod}</div>
                <div className="text-slate-500 text-xs">{fmtDateTime(selectedOrder.createdAt)}</div>
              </div>
            </div>

            {selectedOrder.shippingAddress && (
              <div className="bg-slate-900 rounded-lg p-3 mb-4">
                <div className="text-slate-500 text-xs mb-1">Adresse de livraison</div>
                <div className="text-slate-200 text-sm">
                  {(() => { try { const a = JSON.parse(selectedOrder.shippingAddress); return `${a.address || ''}, ${a.city || ''} ${a.postalCode || ''}`; } catch { return selectedOrder.shippingAddress; } })()}
                </div>
              </div>
            )}

            <h4 className="text-slate-300 font-medium text-sm mb-2">Articles ({selectedOrder.items?.length || 0})</h4>
            <div className="space-y-2 mb-4">
              {(selectedOrder.items || []).map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="text-slate-200 text-sm">{item.product?.title}</div>
                    <div className="text-slate-500 text-xs">{item.product?.seller?.name}</div>
                  </div>
                  <div className="text-slate-400 text-sm">×{item.qty}</div>
                  <div className="text-slate-500 text-xs">{fmt(item.price)} TND/u</div>
                  <div className="text-blue-400 font-medium text-sm">{fmt(item.price * item.qty)} TND</div>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="bg-slate-900 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Sous-total</span>
                <span>{fmt(selectedOrder.subtotal || selectedOrder.total)} TND</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Remise</span>
                  <span>-{fmt(selectedOrder.discount)} TND</span>
                </div>
              )}
              {selectedOrder.shipping > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Livraison</span>
                  <span>{fmt(selectedOrder.shipping)} TND</span>
                </div>
              )}
              <div className="flex justify-between text-slate-200 font-bold border-t border-slate-700 pt-1 mt-1">
                <span>Total</span>
                <span className="text-blue-400">{fmt(selectedOrder.total)} TND</span>
              </div>
            </div>

            {can('orders.write') && (
              <div className="flex gap-3">
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={async () => {
                    await withLoading(async () => {
                      await adminApi.patch(`/orders/${selectedOrder.id}/status`, { status: newStatus });
                      setSelectedOrder({ ...selectedOrder, status: newStatus });
                      loadOrders();
                    });
                  }}
                  disabled={actionLoading || newStatus === selectedOrder.status}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  {actionLoading ? '...' : 'Mettre à jour'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
