import { useEffect, useState, useRef } from 'react';
import { driverApi, getDriverToken } from '../api/driverClient';
import { useDriver } from '../context/DriverContext';

const fmtNum = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);

const STOP_STATUS_COLORS = {
  PENDING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DONE:    'bg-green-500/20 text-green-400 border-green-500/30',
  FAILED:  'bg-red-500/20 text-red-400 border-red-500/30',
  SKIPPED: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
};

export default function DriverTour() {
  const { driver, logout } = useDriver();
  const [tour, setTour]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStop, setActiveStop] = useState(null);
  const [action, setAction]   = useState(null); // 'deliver' | 'fail'
  const [codAmount, setCodAmount] = useState('');
  const [failReason, setFailReason] = useState('');
  const [saving, setSaving]   = useState(false);
  const [kmActual, setKmActual] = useState('');
  const canvasRef = useRef(null);
  const [signed, setSigned]   = useState(false);

  const loadTour = () => {
    setLoading(true);
    driverApi.get('/tours/today').then(setTour).catch(() => setTour(null)).finally(() => setLoading(false));
  };

  useEffect(() => { loadTour(); }, []);

  // Signature canvas
  const startDraw = (canvas, e) => {
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    const r = canvas.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - r.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - r.top;
    ctx.moveTo(x, y);
    const move = (ev) => {
      const mx = (ev.touches?.[0]?.clientX ?? ev.clientX) - r.left;
      const my = (ev.touches?.[0]?.clientY ?? ev.clientY) - r.top;
      ctx.lineTo(mx, my);
      ctx.stroke();
      setSigned(true);
    };
    const stop = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', stop);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', stop);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSigned(false);
  };

  const startTour = async () => {
    if (!tour) return;
    setSaving(true);
    try { await driverApi.patch(`/tours/${tour.id}/start`, {}); loadTour(); }
    catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const completeTour = async () => {
    if (!tour || !kmActual) return alert('Saisir le kilométrage réel');
    setSaving(true);
    try { await driverApi.patch(`/tours/${tour.id}/complete`, { kmActual: parseFloat(kmActual) }); loadTour(); }
    catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const deliver = async () => {
    if (!activeStop) return;
    if (activeStop.shipment?.isCod && !signed) return alert('Signature du destinataire requise');
    setSaving(true);
    try {
      const body = { codCollected: activeStop.shipment?.isCod ? parseFloat(codAmount || activeStop.shipment.codAmount) : undefined };
      await driverApi.post(`/tours/${tour.id}/stops/${activeStop.id}/deliver`, body);
      if (activeStop.shipment?.isCod) {
        window.open(`/api/driver/tours/stops/${activeStop.shipmentId}/recu?token=${encodeURIComponent(getDriverToken())}`, '_blank');
      }
      setAction(null); setActiveStop(null); setSigned(false); setCodAmount('');
      clearCanvas(); loadTour();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const fail = async () => {
    if (!activeStop || !failReason) return alert('Indiquer la raison d\'échec');
    setSaving(true);
    try {
      await driverApi.post(`/tours/${tour.id}/stops/${activeStop.id}/fail`, { reason: failReason });
      setAction(null); setActiveStop(null); setFailReason(''); loadTour();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement...</div>;

  if (!tour) return (
    <div className="p-6 text-center">
      <div className="text-5xl mb-4">📭</div>
      <div className="text-slate-400 font-medium">Aucune tournée aujourd'hui</div>
      <div className="text-slate-600 text-sm mt-1">Revenez plus tard ou contactez le dispatcher</div>
      <button onClick={loadTour} className="mt-6 px-6 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">Actualiser</button>
    </div>
  );

  const stops = tour.stops || [];
  const done  = stops.filter(s => s.status === 'DONE').length;
  const total = stops.length;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header tournée */}
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-white font-bold">Tournée du {new Date(tour.date).toLocaleDateString('fr-TN', { weekday:'long', day:'numeric', month:'long' })}</div>
            <div className="text-slate-400 text-xs mt-0.5">{tour.vehicle?.plate} · {done}/{total} livraisons</div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${tour.status==='PLANNED'?'bg-blue-500/20 text-blue-400':tour.status==='IN_PROGRESS'?'bg-yellow-500/20 text-yellow-400':'bg-green-500/20 text-green-400'}`}>
            {tour.status==='PLANNED'?'Planifiée':tour.status==='IN_PROGRESS'?'En cours':'Terminée'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${total ? (done/total)*100 : 0}%` }} />
        </div>

        {/* Actions tournée */}
        <div className="flex gap-2 mt-3">
          {tour.status === 'PLANNED' && (
            <button onClick={startTour} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium transition">
              {saving ? '...' : '▶ Démarrer la tournée'}
            </button>
          )}
          {tour.status === 'IN_PROGRESS' && done === total && total > 0 && (
            <div className="flex-1 flex gap-2 items-center">
              <input type="number" placeholder="Km réel" value={kmActual} onChange={e=>setKmActual(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-sm" />
              <button onClick={completeTour} disabled={saving||!kmActual} className="px-4 py-2 bg-green-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium">
                {saving ? '...' : '✓ Clôturer'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Liste des stops */}
      <div className="p-4 space-y-3">
        {stops.map((stop, i) => {
          const addr = (() => { try { return JSON.parse(stop.shipment?.deliveryAddress || '{}'); } catch { return {}; } })();
          return (
            <div key={stop.id} className={`bg-slate-900 border rounded-2xl p-4 ${activeStop?.id===stop.id?'border-blue-500':'border-slate-800'}`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-sm font-bold flex-shrink-0 mt-0.5">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-slate-200 font-medium text-sm truncate">
                      {addr.firstName} {addr.lastName}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs border flex-shrink-0 ${STOP_STATUS_COLORS[stop.status]||'bg-slate-700 text-slate-400 border-slate-700'}`}>{stop.status}</span>
                  </div>
                  <div className="text-slate-500 text-xs">{addr.address}, {addr.city}</div>
                  <div className="text-slate-500 text-xs">{addr.governorate}</div>
                  {addr.phone && <div className="text-slate-400 text-xs mt-1">📞 {addr.phone}</div>}

                  {stop.shipment?.isCod && (
                    <div className="mt-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5 text-orange-400 text-xs font-medium">
                      💰 COD à encaisser : {fmtNum(stop.shipment.codAmount)} TND
                    </div>
                  )}

                  {stop.status === 'PENDING' && tour.status === 'IN_PROGRESS' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setActiveStop(stop); setAction('deliver'); setSigned(false); clearCanvas(); setCodAmount(stop.shipment?.codAmount?.toFixed(3)||''); }}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-medium transition">✓ Livré</button>
                      <button onClick={() => { setActiveStop(stop); setAction('fail'); setFailReason(''); }}
                        className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-medium transition">✗ Échec</button>
                    </div>
                  )}
                  {stop.failReason && <div className="mt-2 text-red-400 text-xs">Raison : {stop.failReason}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Livraison */}
      {action === 'deliver' && activeStop && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setAction(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-t-3xl md:rounded-2xl w-full max-w-lg p-5 shadow-2xl">
            <h3 className="text-white font-bold mb-4 text-center">Confirmer la livraison</h3>

            {activeStop.shipment?.isCod && (
              <div className="mb-4">
                <label className="text-slate-400 text-xs block mb-1">Montant COD encaissé (TND)</label>
                <input type="number" step="0.001" value={codAmount} onChange={e=>setCodAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-orange-500/30 rounded-xl px-4 py-3 text-orange-300 text-sm font-medium focus:outline-none" />
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-400 text-xs">Signature du destinataire</label>
                <button onClick={clearCanvas} className="text-slate-500 text-xs hover:text-slate-300">Effacer</button>
              </div>
              <canvas ref={canvasRef} width={340} height={120}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl touch-none cursor-crosshair"
                style={{ height: 120 }}
                onMouseDown={e => startDraw(canvasRef.current, e)}
                onTouchStart={e => { e.preventDefault(); startDraw(canvasRef.current, e); }}
              />
              {!signed && <div className="text-slate-600 text-xs text-center mt-1">Faire signer ici</div>}
            </div>

            <div className="flex gap-3">
              <button onClick={()=>setAction(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm transition">Annuler</button>
              <button onClick={deliver} disabled={saving||(!signed&&activeStop.shipment?.isCod)} className="flex-1 py-3 bg-green-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition">
                {saving ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Échec */}
      {action === 'fail' && activeStop && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setAction(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-t-3xl md:rounded-2xl w-full max-w-lg p-5 shadow-2xl">
            <h3 className="text-white font-bold mb-4 text-center">Échec de livraison</h3>
            <div className="space-y-2 mb-4">
              {['Absent','Adresse introuvable','Refus du client','Inaccessible','Colis endommagé'].map(r => (
                <button key={r} onClick={()=>setFailReason(r)}
                  className={`w-full py-2.5 rounded-xl text-sm transition border ${failReason===r?'bg-red-500/20 border-red-500 text-red-300':'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setAction(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm transition">Annuler</button>
              <button onClick={fail} disabled={saving||!failReason} className="flex-1 py-3 bg-red-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition">
                {saving ? '...' : 'Confirmer échec'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
